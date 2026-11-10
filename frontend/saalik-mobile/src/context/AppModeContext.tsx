import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { getDatabase } from '../services/storage/database';
import { kvGetJSON, kvSetJSON } from '../services/storage/kvStore';
import { getDeviceId } from '../services/identity';
import {
  fetchMonumentDelta,
  uploadCapturePhoto,
  uploadCaptureVoiceNote,
  upsertCaptureBatch,
} from '../services/heritageApi';
import { BatchSyncManager, type Connectivity, type SyncReport } from '../services/sync/BatchSyncManager';
import { MonumentRepository } from '../repositories/MonumentRepository';
import { GuideMarketplaceRepository } from '../repositories/GuideMarketplaceRepository';
import { WalkingTourRepository } from '../repositories/WalkingTourRepository';
import { FieldCaptureQueueRepository } from '../repositories/FieldCaptureQueueRepository';
import { APP_MODES, type AppMode } from '../types/heritage';

const MODE_KEY = 'app.mode';
const CELLULAR_KEY = 'sync.allowCellular';
const BACKGROUND_SYNC_INTERVAL_MS = 60_000;
const MONUMENT_SYNC_INTERVAL_MS = 10 * 60_000;

function defaultMode(): AppMode {
  const fromEnv = process.env.EXPO_PUBLIC_DEFAULT_APP_MODE as AppMode | undefined;
  return fromEnv && APP_MODES.includes(fromEnv) ? fromEnv : 'LIVE_CLOUD';
}

export interface HeritageRepositories {
  monuments: MonumentRepository;
  guides: GuideMarketplaceRepository;
  walkingTours: WalkingTourRepository;
  captures: FieldCaptureQueueRepository;
}

interface AppModeContextValue {
  ready: boolean;
  mode: AppMode;
  setMode: (mode: AppMode) => Promise<void>;
  /** Network reachability as the app should use it: always offline in NTB VIP Demo Mode. */
  connectivity: Connectivity;
  repositories: HeritageRepositories | null;
  allowCellularUploads: boolean;
  setAllowCellularUploads: (allow: boolean) => Promise<void>;
  lastSyncReport: SyncReport | null;
  lastMonumentSyncAt: string | null;
  isSyncing: boolean;
  syncNow: () => Promise<SyncReport | null>;
  queueVersion: number;
  notifyQueueChanged: () => void;
}

const AppModeContext = createContext<AppModeContextValue | undefined>(undefined);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const network = useNetworkState();
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<AppMode>(defaultMode());
  const [repositories, setRepositories] = useState<HeritageRepositories | null>(null);
  const [allowCellularUploads, setAllowCellularState] = useState(false);
  const [lastSyncReport, setLastSyncReport] = useState<SyncReport | null>(null);
  const [lastMonumentSyncAt, setLastMonumentSyncAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueVersion, setQueueVersion] = useState(0);
  const syncManagerRef = useRef<BatchSyncManager | null>(null);
  const lastMonumentSyncRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDatabase();
      const monuments = new MonumentRepository(db);
      await monuments.initialize();
      const captures = new FieldCaptureQueueRepository(db);
      await captures.recoverInterrupted();
      const repos: HeritageRepositories = {
        monuments,
        guides: new GuideMarketplaceRepository(db),
        walkingTours: new WalkingTourRepository(monuments),
        captures,
      };
      syncManagerRef.current = new BatchSyncManager(
        captures,
        { upsertCaptureBatch, uploadCapturePhoto, uploadCaptureVoiceNote },
        getDeviceId,
      );
      const [savedMode, savedCellular, lastSynced] = await Promise.all([
        kvGetJSON<AppMode | null>(MODE_KEY, null),
        kvGetJSON<boolean>(CELLULAR_KEY, false),
        monuments.getLastSyncedAt(),
      ]);
      if (cancelled) return;
      if (savedMode && APP_MODES.includes(savedMode)) setModeState(savedMode);
      setAllowCellularState(savedCellular);
      setLastMonumentSyncAt(lastSynced);
      setRepositories(repos);
      setReady(true);
    })().catch((error) => {
      console.error('[heritage] Failed to initialise offline store', error);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connectivity = useMemo<Connectivity>(() => {
    if (mode === 'NTB_VIP_DEMO_MODE') return { isConnected: false, isWifi: false, type: 'DEMO_OFFLINE' };
    const isConnected = Boolean(network.isConnected) && network.isInternetReachable !== false;
    return {
      isConnected,
      isWifi: isConnected && (network.type === NetworkStateType.WIFI || network.type === NetworkStateType.ETHERNET),
      type: network.type !== undefined ? String(NetworkStateType[network.type] ?? network.type) : 'UNKNOWN',
    };
  }, [mode, network.isConnected, network.isInternetReachable, network.type]);

  const notifyQueueChanged = useCallback(() => setQueueVersion((v) => v + 1), []);

  const syncMonuments = useCallback(async () => {
    if (!repositories || mode === 'NTB_VIP_DEMO_MODE' || !connectivity.isConnected) return;
    try {
      const since = await repositories.monuments.getLastSyncedAt();
      const delta = await fetchMonumentDelta(since);
      await repositories.monuments.applyDelta(delta);
      lastMonumentSyncRef.current = Date.now();
      setLastMonumentSyncAt(delta.serverTime);
    } catch (error) {
      console.warn('[heritage] Monument delta sync failed; continuing with local corpus.', error);
    }
  }, [repositories, mode, connectivity.isConnected]);

  const syncNow = useCallback(async (): Promise<SyncReport | null> => {
    const manager = syncManagerRef.current;
    if (!manager) return null;
    if (mode === 'NTB_VIP_DEMO_MODE') {
      const now = new Date().toISOString();
      const report: SyncReport = { status: 'skipped', reason: 'demo_mode', attempted: 0, uploaded: 0, failed: 0, startedAt: now, finishedAt: now };
      setLastSyncReport(report);
      return report;
    }
    setIsSyncing(true);
    try {
      const report = await manager.run(connectivity, { allowCellular: allowCellularUploads });
      setLastSyncReport(report);
      if (report.attempted > 0) notifyQueueChanged();
      await syncMonuments();
      return report;
    } finally {
      setIsSyncing(false);
    }
  }, [mode, connectivity, allowCellularUploads, notifyQueueChanged, syncMonuments]);

  // Automatic delta synchronisation: retry the outbox whenever a usable connection is present.
  useEffect(() => {
    if (!ready || mode === 'NTB_VIP_DEMO_MODE' || !connectivity.isConnected) return;
    const runCycle = () => {
      const manager = syncManagerRef.current;
      if (!manager || manager.isRunning) return;
      manager
        .run(connectivity, { allowCellular: allowCellularUploads })
        .then((report) => {
          if (report.status === 'completed') {
            setLastSyncReport(report);
            notifyQueueChanged();
          }
        })
        .catch((error) => console.warn('[heritage] Background capture sync failed', error));
      if (Date.now() - lastMonumentSyncRef.current > MONUMENT_SYNC_INTERVAL_MS) {
        void syncMonuments();
      }
    };
    runCycle();
    const timer = setInterval(runCycle, BACKGROUND_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [ready, mode, connectivity, allowCellularUploads, notifyQueueChanged, syncMonuments]);

  const setMode = useCallback(async (next: AppMode) => {
    setModeState(next);
    await kvSetJSON(MODE_KEY, next);
  }, []);

  const setAllowCellularUploads = useCallback(async (allow: boolean) => {
    setAllowCellularState(allow);
    await kvSetJSON(CELLULAR_KEY, allow);
  }, []);

  const value = useMemo<AppModeContextValue>(
    () => ({
      ready,
      mode,
      setMode,
      connectivity,
      repositories,
      allowCellularUploads,
      setAllowCellularUploads,
      lastSyncReport,
      lastMonumentSyncAt,
      isSyncing,
      syncNow,
      queueVersion,
      notifyQueueChanged,
    }),
    [
      ready,
      mode,
      setMode,
      connectivity,
      repositories,
      allowCellularUploads,
      setAllowCellularUploads,
      lastSyncReport,
      lastMonumentSyncAt,
      isSyncing,
      syncNow,
      queueVersion,
      notifyQueueChanged,
    ],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}

/** Repositories once the offline store has initialised; screens render a loader until then. */
export function useHeritageRepositories(): HeritageRepositories | null {
  return useAppMode().repositories;
}
