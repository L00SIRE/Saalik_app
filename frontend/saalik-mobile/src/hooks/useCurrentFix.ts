import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { GeoFix } from '../types/heritage';

interface UseCurrentFixOptions {
  /** Keep updating position and compass heading while the screen is mounted. */
  watch?: boolean;
}

interface UseCurrentFixResult {
  fix: GeoFix | null;
  permission: 'unknown' | 'granted' | 'denied';
  error: string | null;
  refresh: () => Promise<GeoFix | null>;
}

export function useCurrentFix({ watch = false }: UseCurrentFixOptions = {}): UseCurrentFixResult {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<number | null>(null);

  const ensurePermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === Location.PermissionStatus.GRANTED;
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  const refresh = useCallback(async (): Promise<GeoFix | null> => {
    try {
      if (!(await ensurePermission())) {
        setError('Location permission was denied.');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let headingDeg = headingRef.current;
      if (headingDeg === null) {
        try {
          const heading = await Location.getHeadingAsync();
          headingDeg = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
        } catch {
          headingDeg = null;
        }
      }
      const next: GeoFix = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyM: position.coords.accuracy ?? null,
        altitudeM: position.coords.altitude ?? null,
        headingDeg,
      };
      setFix(next);
      setError(null);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to read location.');
      return null;
    }
  }, [ensurePermission]);

  useEffect(() => {
    let positionSub: Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      if (!(await ensurePermission()) || cancelled) return;
      await refresh();
      if (!watch || cancelled) return;
      positionSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 2, timeInterval: 3000 },
        (position) => {
          setFix({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy ?? null,
            altitudeM: position.coords.altitude ?? null,
            headingDeg: headingRef.current,
          });
        },
      );
      headingSub = await Location.watchHeadingAsync((heading) => {
        headingRef.current = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
        setFix((current) => (current ? { ...current, headingDeg: headingRef.current } : current));
      });
    })().catch((e) => setError(e instanceof Error ? e.message : 'Location unavailable.'));

    return () => {
      cancelled = true;
      positionSub?.remove();
      headingSub?.remove();
    };
  }, [watch, ensurePermission, refresh]);

  return { fix, permission, error, refresh };
}
