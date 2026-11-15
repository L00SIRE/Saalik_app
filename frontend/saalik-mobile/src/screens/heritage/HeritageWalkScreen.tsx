import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import { useCurrentFix } from '../../hooks/useCurrentFix';
import { buildHeritageWalk } from '../../services/route/walkOptimizer';
import { haversineMeters } from '../../services/vector/similarity';

const BUDGET_MINUTES = 90;
/** Beyond this the visitor is not in a heritage zone, so the walk starts at the zone's first stop. */
const NEAR_ZONE_M = 2000;

const metres = (value: number) => (value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`);

export function HeritageWalkScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const monumentId = (route.params as { monumentId?: string } | undefined)?.monumentId;
  const { repositories } = useAppMode();
  const { fix } = useCurrentFix();

  const plan = useMemo(() => {
    if (!repositories) return null;
    const all = repositories.monuments.getAll();
    const scanned = monumentId ? repositories.monuments.getById(monumentId) : undefined;
    const nearest = fix
      ? all.reduce((best, m) => (haversineMeters(fix, m.geo) < haversineMeters(fix, best.geo) ? m : best), all[0]!)
      : undefined;
    const nearby = fix && nearest && haversineMeters(fix, nearest.geo) <= NEAR_ZONE_M;

    const anchor = scanned ?? (nearby ? nearest : undefined) ?? all[0];
    if (!anchor) return null;
    const zoneMonuments = repositories.monuments.getByZone(anchor.zoneId);
    // A scan starts the walk at that monument; otherwise at the visitor, or at the zone's first stop.
    const start = scanned
      ? scanned.geo
      : nearby && fix
        ? fix
        : zoneMonuments.slice().sort((a, b) => a.walkingTourStop.sequence - b.walkingTourStop.sequence)[0]!.geo;
    const startLabel = scanned ? scanned.names.en : nearby ? 'your position' : 'the first stop of this zone';
    return {
      zone: repositories.monuments.getZone(anchor.zoneId),
      startLabel,
      walk: buildHeritageWalk(start, zoneMonuments, BUDGET_MINUTES),
    };
  }, [repositories, monumentId, fix]);

  if (!plan) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const { walk, zone, startLabel } = plan;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <AppText style={styles.topTitle} numberOfLines={1}>
          {zone?.names.en}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.title}>Your 90-Minute Heritage Walk</AppText>
        <AppText style={styles.summary}>
          {walk.stops.length} stops · {metres(walk.totalDistanceM)} on foot · about {Math.round(walk.totalMinutes)} minutes,
          starting from {startLabel}. The order is the shortest route through the nearest monuments.
        </AppText>

        {walk.stops.length === 0 && (
          <AppText style={styles.empty}>No monument in this zone can be reached and visited within 90 minutes from here.</AppText>
        )}

        {walk.stops.map((stop, index) => (
          <Pressable
            key={stop.monument.id}
            style={styles.stop}
            onPress={() => navigation.navigate('MonumentStory', { monumentId: stop.monument.id })}
          >
            <AppText style={styles.stopNumber}>{index + 1}</AppText>
            <View style={styles.stopBody}>
              <AppText style={styles.stopName}>{stop.monument.names.en}</AppText>
              <AppText style={styles.stopNe}>{stop.monument.names.ne}</AppText>
              <AppText style={styles.stopMeta}>
                {stop.walkM < 5 ? 'Start here' : `Walk ${Math.max(1, Math.round(stop.walkMinutes))} min (${metres(stop.walkM)})`} ·
                stay {stop.dwellMinutes} min
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}

        {walk.stops.length > 0 && (
          <Pressable
            style={styles.cta}
            onPress={() => navigation.navigate('LocalStorytellers', { monumentId: walk.stops[0]!.monument.id })}
          >
            <Ionicons name="people" size={18} color="#021007" />
            <AppText style={styles.ctaText}>Book Verified Local Storyteller</AppText>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  topTitle: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  title: { color: colors.accent, fontSize: 24 },
  summary: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  empty: { color: colors.textMuted, fontSize: 14 },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopNumber: { color: colors.accent, fontSize: 20, width: 26, textAlign: 'center' },
  stopBody: { flex: 1, gap: 2 },
  stopName: { color: colors.textPrimary, fontSize: 15 },
  stopNe: { color: colors.textSecondary, fontSize: 13 },
  stopMeta: { color: colors.textMuted, fontSize: 12 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
  },
  ctaText: { color: '#021007', fontSize: 15 },
});
