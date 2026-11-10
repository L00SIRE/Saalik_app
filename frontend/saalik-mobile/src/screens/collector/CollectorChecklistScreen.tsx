import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import { CAPTURE_ANGLES, type CaptureAngle } from '../../types/heritage';

export function CollectorChecklistScreen() {
  const navigation = useNavigation<any>();
  const { repositories, queueVersion } = useAppMode();
  const zones = repositories?.monuments.getZones() ?? [];
  const [zoneId, setZoneId] = useState<string>(zones[0]?.zoneId ?? '');
  const [coverage, setCoverage] = useState<Map<string, Set<CaptureAngle>>>(new Map());
  const [pending, setPending] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!repositories) return;
      void repositories.captures.coverageByMonument().then(setCoverage);
      void repositories.captures.counts().then((c) => setPending(c.PENDING + c.RETRY_SCHEDULED + c.UPLOADING + c.FAILED));
    }, [repositories, queueVersion]),
  );

  const allMonuments = repositories?.monuments.getAll() ?? [];
  const totalRequired = allMonuments.length * CAPTURE_ANGLES.length;
  const totalCaptured = allMonuments.reduce((sum, m) => sum + (coverage.get(m.id)?.size ?? 0), 0);

  const zoneMonuments = useMemo(() => {
    if (!repositories) return [];
    return repositories.monuments
      .getByZone(zoneId)
      .map((monument) => {
        const captured = coverage.get(monument.id) ?? new Set<CaptureAngle>();
        const missing = CAPTURE_ANGLES.filter((a) => !captured.has(a));
        return { monument, captured, missing };
      })
      .sort((a, b) => Number(a.missing.length === 0) - Number(b.missing.length === 0) || a.monument.walkingTourStop.sequence - b.monument.walkingTourStop.sequence);
  }, [repositories, zoneId, coverage]);

  if (!repositories) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const remainingInZone = zoneMonuments.filter((m) => m.missing.length > 0).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <AppText style={styles.topTitle}>Field Collector Mode</AppText>
        <Pressable style={styles.syncPill} onPress={() => navigation.navigate('SyncManager')}>
          <Ionicons name="cloud-upload-outline" size={16} color={colors.accent} />
          <AppText style={styles.syncPillText}>{pending}</AppText>
        </Pressable>
      </View>

      <View style={styles.progress}>
        <AppText style={styles.progressText}>
          Valley coverage: {totalCaptured} / {totalRequired} required photos
        </AppText>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${totalRequired ? (totalCaptured / totalRequired) * 100 : 0}%` }]} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow}>
        {zones.map((zone) => {
          const zoneDone = repositories.monuments
            .getByZone(zone.zoneId)
            .every((m) => (coverage.get(m.id)?.size ?? 0) === CAPTURE_ANGLES.length);
          return (
            <Pressable key={zone.zoneId} style={[styles.chip, zoneId === zone.zoneId && styles.chipActive]} onPress={() => setZoneId(zone.zoneId)}>
              {zoneDone && <Ionicons name="checkmark-circle" size={14} color={zoneId === zone.zoneId ? '#021007' : colors.accent} />}
              <AppText style={[styles.chipText, zoneId === zone.zoneId && styles.chipTextActive]}>{zone.names.en}</AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        <AppText style={styles.helper}>
          {remainingInZone === 0 ? 'Every monument in this zone has all five angles.' : `${remainingInZone} monuments still need photographs in this zone.`}
        </AppText>
        {zoneMonuments.map(({ monument, captured, missing }) => (
          <Pressable
            key={monument.id}
            style={[styles.item, missing.length === 0 && styles.itemDone]}
            onPress={() => navigation.navigate('GuidedCamera', { monumentId: monument.id, angle: missing[0] ?? 'ESTABLISHING_FRONT' })}
          >
            <View style={styles.itemBody}>
              <AppText style={styles.itemName}>{monument.names.en}</AppText>
              <AppText style={styles.itemMeta}>
                Best light: {monument.fieldPhotoSpec.localTimeWindow} - {monument.fieldPhotoSpec.bestTimeOfDay.replace(/_/g, ' ').toLowerCase()}
              </AppText>
              <View style={styles.dots}>
                {CAPTURE_ANGLES.map((angle) => (
                  <View key={angle} style={[styles.dot, captured.has(angle) && styles.dotDone]} />
                ))}
                <AppText style={styles.dotLabel}>{captured.size}/5 angles</AppText>
              </View>
            </View>
            <Ionicons name={missing.length === 0 ? 'checkmark-done' : 'camera'} size={22} color={colors.accent} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  topTitle: { color: colors.textPrimary, fontSize: 18, flex: 1 },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncPillText: { color: colors.accent, fontSize: 13 },
  progress: { paddingHorizontal: 16, gap: 6 },
  progressText: { color: colors.textSecondary, fontSize: 13 },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: colors.inputBg, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.accent },
  chipRow: { flexGrow: 0, marginTop: 12 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  chipTextActive: { color: '#021007' },
  list: { padding: 16, gap: 10, paddingBottom: 48 },
  helper: { color: colors.textSecondary, fontSize: 13 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemDone: { opacity: 0.6 },
  itemBody: { flex: 1, gap: 4 },
  itemName: { color: colors.textPrimary, fontSize: 15 },
  itemMeta: { color: colors.textMuted, fontSize: 12 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.accent },
  dotDone: { backgroundColor: colors.accent },
  dotLabel: { color: colors.textSecondary, fontSize: 12, marginLeft: 4 },
});
