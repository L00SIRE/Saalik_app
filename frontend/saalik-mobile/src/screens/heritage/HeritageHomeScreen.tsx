import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppText } from '@components/AppText';
import { ModeSwitcher } from '@components/heritage/ModeSwitcher';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import type { CaptureCounts } from '../../repositories/FieldCaptureQueueRepository';
import type { HeritageZone } from '../../types/heritage';

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={24} color={colors.accent} />
      </View>
      <View style={styles.actionBody}>
        <AppText style={styles.actionTitle}>{title}</AppText>
        <AppText style={styles.actionSubtitle}>{subtitle}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

export function HeritageHomeScreen() {
  const navigation = useNavigation<any>();
  const { ready, repositories, queueVersion } = useAppMode();
  const [counts, setCounts] = useState<CaptureCounts | null>(null);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!repositories) return;
      void repositories.captures.counts().then(setCounts);
    }, [repositories, queueVersion]),
  );

  if (!ready || !repositories) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
        <AppText style={styles.loadingText}>Preparing the offline heritage library...</AppText>
      </View>
    );
  }

  const pending = counts ? counts.PENDING + counts.RETRY_SCHEDULED + counts.UPLOADING : 0;
  const zones = repositories.monuments.getZones();
  const totalMonuments = repositories.monuments.getAll().length;

  const renderZone = (zone: HeritageZone) => {
    const tour = repositories.walkingTours.getForZone(zone.zoneId);
    const expanded = expandedZone === zone.zoneId;
    const stops = expanded && tour ? repositories.walkingTours.getStops(tour.tourId) : [];
    return (
      <View key={zone.zoneId} style={styles.zone}>
        <Pressable style={styles.zoneHeader} onPress={() => setExpandedZone(expanded ? null : zone.zoneId)}>
          <View style={styles.zoneText}>
            <AppText style={styles.zoneName}>{zone.names.en}</AppText>
            <AppText style={styles.zoneNe}>{zone.names.ne}</AppText>
            <AppText style={styles.zoneMeta}>
              {zone.monumentIds.length} monuments - {zone.designation === 'UNESCO_MONUMENT_ZONE' ? 'UNESCO zone' : 'Unseen heritage towns'}
              {tour ? ` - ${tour.title}` : ''}
            </AppText>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </Pressable>
        {expanded &&
          stops.map((stop) => (
            <Pressable
              key={stop.monument.id}
              style={styles.stop}
              onPress={() => navigation.navigate('MonumentStory', { monumentId: stop.monument.id })}
            >
              <AppText style={styles.stopNumber}>{stop.sequence}</AppText>
              <View style={styles.stopBody}>
                <AppText style={styles.stopName}>{stop.monument.names.en}</AppText>
                <AppText style={styles.stopMeta}>
                  {stop.dwellMinutes} min here
                  {stop.minutesToNext !== null ? ` - then ${stop.minutesToNext} min ${stop.legModeToNext === 'drive' ? 'drive' : 'walk'}` : ''}
                </AppText>
              </View>
            </Pressable>
          ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.title}>Saalik Heritage</AppText>
        <AppText style={styles.subtitle}>
          {totalMonuments} monuments across {zones.length} Kathmandu Valley zones, available offline in English and Nepali.
        </AppText>

        <ModeSwitcher />

        <ActionCard
          icon="scan"
          title="AI Monument Scanner"
          subtitle="Identify a temple, hear its story and meet a local storyteller."
          onPress={() => navigation.navigate('Scanner')}
        />
        <ActionCard
          icon="camera"
          title="Field Collector Mode"
          subtitle="Zone-by-zone checklist and 5-angle guided camera for dataset capture."
          onPress={() => navigation.navigate('CollectorChecklist')}
        />
        <ActionCard
          icon="sync"
          title="Offline Batch Sync Manager"
          subtitle={pending > 0 ? `${pending} captures waiting to upload` : 'All captures are synced'}
          onPress={() => navigation.navigate('SyncManager')}
        />

        <AppText style={styles.sectionTitle}>Heritage zones and free walking routes</AppText>
        {zones.map(renderZone)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary },
  title: { color: colors.accent, fontSize: 28 },
  subtitle: { color: colors.textSecondary, fontSize: 14 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(21, 255, 117, 0.1)',
  },
  actionBody: { flex: 1, gap: 2 },
  actionTitle: { color: colors.textPrimary, fontSize: 16 },
  actionSubtitle: { color: colors.textSecondary, fontSize: 13 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, marginTop: 10 },
  zone: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  zoneText: { flex: 1, gap: 2 },
  zoneName: { color: colors.textPrimary, fontSize: 15 },
  zoneNe: { color: colors.textSecondary, fontSize: 13 },
  zoneMeta: { color: colors.textMuted, fontSize: 12 },
  stop: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(21, 255, 117, 0.12)',
  },
  stopNumber: { color: colors.accent, width: 22, textAlign: 'center' },
  stopBody: { flex: 1 },
  stopName: { color: colors.textPrimary, fontSize: 14 },
  stopMeta: { color: colors.textMuted, fontSize: 12 },
});
