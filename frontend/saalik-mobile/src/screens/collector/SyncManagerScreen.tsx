import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import type { CaptureCounts } from '../../repositories/FieldCaptureQueueRepository';
import type { FieldCapture } from '../../types/heritage';
import { CAPTURE_ANGLE_LABELS } from '../../types/heritage';

function statusColor(status: FieldCapture['status']): string {
  switch (status) {
    case 'UPLOADED':
      return colors.success;
    case 'FAILED':
      return colors.error;
    case 'UPLOADING':
      return colors.primaryLight;
    case 'RETRY_SCHEDULED':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

export function SyncManagerScreen() {
  const navigation = useNavigation<any>();
  const {
    mode,
    connectivity,
    repositories,
    allowCellularUploads,
    setAllowCellularUploads,
    isSyncing,
    syncNow,
    lastSyncReport,
    lastMonumentSyncAt,
    queueVersion,
  } = useAppMode();
  const [counts, setCounts] = useState<CaptureCounts | null>(null);
  const [queue, setQueue] = useState<FieldCapture[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!repositories) return;
      void repositories.captures.counts().then(setCounts);
      void repositories.captures.list().then(setQueue);
    }, [repositories, queueVersion]),
  );

  if (!repositories) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const pending = counts ? counts.PENDING + counts.RETRY_SCHEDULED + counts.UPLOADING + counts.FAILED : 0;
  const demoLocked = mode === 'NTB_VIP_DEMO_MODE';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <AppText style={styles.topTitle}>Offline Batch Sync</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Connectivity</AppText>
          <AppText style={styles.meta}>
            Mode: {mode.replace(/_/g, ' ')}
          </AppText>
          <AppText style={styles.meta}>
            Link: {connectivity.isConnected ? (connectivity.isWifi ? 'Wi-Fi' : connectivity.type) : 'Offline'}
          </AppText>
          <AppText style={styles.meta}>
            Monument corpus last synced: {lastMonumentSyncAt ?? 'bundled seed only'}
          </AppText>
          {demoLocked && (
            <AppText style={styles.warning}>
              NTB VIP Demo Mode keeps everything on-device. Uploads are skipped so Airplane Mode demos never fail.
            </AppText>
          )}
        </View>

        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Outbox</AppText>
          <View style={styles.statRow}>
            <Stat label="Pending" value={counts?.PENDING ?? 0} />
            <Stat label="Retry" value={counts?.RETRY_SCHEDULED ?? 0} />
            <Stat label="Failed" value={counts?.FAILED ?? 0} />
            <Stat label="Uploaded" value={counts?.UPLOADED ?? 0} />
          </View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.switchLabel}>Allow cellular uploads</AppText>
              <AppText style={styles.meta}>Default is Wi-Fi only with exponential backoff.</AppText>
            </View>
            <Switch
              value={allowCellularUploads}
              onValueChange={(v) => void setAllowCellularUploads(v)}
              trackColor={{ false: '#2a3d30', true: colors.accentMuted }}
              thumbColor={allowCellularUploads ? colors.accent : '#ccc'}
            />
          </View>
          <Pressable
            style={[styles.syncButton, (isSyncing || demoLocked) && styles.syncButtonDisabled]}
            disabled={isSyncing || demoLocked}
            onPress={() => void syncNow()}
          >
            {isSyncing ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.background} />
                <AppText style={styles.syncButtonText}>
                  Sync now ({pending} waiting)
                </AppText>
              </>
            )}
          </Pressable>
          {lastSyncReport && (
            <AppText style={styles.meta}>
              Last run: {lastSyncReport.status} · attempted {lastSyncReport.attempted} · uploaded{' '}
              {lastSyncReport.uploaded} · failed {lastSyncReport.failed}
              {lastSyncReport.reason ? ` · ${lastSyncReport.reason}` : ''}
            </AppText>
          )}
        </View>

        <AppText style={styles.sectionTitle}>Queued captures</AppText>
        {queue.length === 0 ? (
          <AppText style={styles.meta}>No field photos in the local upload queue yet.</AppText>
        ) : (
          queue.map((item) => {
            const monument = repositories.monuments.getById(item.monumentId);
            return (
              <View key={item.clientCaptureId} style={styles.queueItem}>
                <View style={styles.queueHeader}>
                  <AppText style={styles.queueName}>{monument?.names.en ?? item.monumentId}</AppText>
                  <AppText style={[styles.queueStatus, { color: statusColor(item.status) }]}>{item.status}</AppText>
                </View>
                <AppText style={styles.meta}>
                  {CAPTURE_ANGLE_LABELS[item.angle]} · {item.lightingTag.replace(/_/g, ' ')} · attempt {item.attempts}
                </AppText>
                <AppText style={styles.meta}>
                  GPS:{' '}
                  {item.latitude != null && item.longitude != null
                    ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`
                    : 'missing'}
                  {item.headingDeg != null ? ` · heading ${Math.round(item.headingDeg)}°` : ''}
                </AppText>
                {item.lastError ? <AppText style={styles.error}>{item.lastError}</AppText> : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  warning: { color: colors.warning, fontSize: 12, lineHeight: 17, marginTop: 4 },
  error: { color: colors.error, fontSize: 12, marginTop: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: colors.accent, fontSize: 20, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  switchLabel: { color: colors.textPrimary, fontWeight: '600' },
  syncButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  syncButtonDisabled: { opacity: 0.5 },
  syncButtonText: { color: colors.background, fontWeight: '700' },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 8 },
  queueItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
  },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueName: { color: colors.textPrimary, fontWeight: '600', flex: 1, paddingRight: 8 },
  queueStatus: { fontSize: 11, fontWeight: '700' },
});
