import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppText } from '@components/AppText';
import { StreamingText } from '@components/heritage/StreamingText';
import { StorytellerCard } from '@components/heritage/StorytellerCard';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import { buildTabContext, STORY_TABS, type StoryTab } from '../../services/rag/ragStream';
import { recordScanTelemetry } from '../../services/scanner/scanService';
import type { StorytellerOffer } from '../../repositories/GuideMarketplaceRepository';
import type { Tour } from '../../types/api';

export function MonumentStoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { monumentId } = route.params as { monumentId: string; matchScore?: number };
  const { repositories, mode, connectivity } = useAppMode();
  const [tab, setTab] = useState<StoryTab>('STORY_HOOK');
  const [offers, setOffers] = useState<StorytellerOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);

  const monument = repositories?.monuments.getById(monumentId);
  const zone = monument ? repositories?.monuments.getZone(monument.zoneId) : undefined;

  const context = useMemo(() => {
    if (!repositories || !monument) return null;
    return buildTabContext(monument, tab, repositories.monuments.getSources(), repositories.monuments.getByZone(monument.zoneId));
  }, [repositories, monument, tab]);

  useEffect(() => {
    if (!repositories || !monument) return;
    let cancelled = false;
    setOffersLoading(true);
    repositories.guides
      .findStorytellersNear(monument)
      .then((found) => {
        if (!cancelled) setOffers(found);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      })
      .finally(() => {
        if (!cancelled) setOffersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repositories, monument]);

  if (!repositories || !monument || !context) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const selfGuidedRoute = repositories.walkingTours.getForZone(monument.zoneId) ?? null;

  const openTour = (tour: Tour) => {
    void recordScanTelemetry(
      mode,
      {
        source: 'on_device_demo',
        searchRadiusM: null,
        matches: [
          {
            monument,
            score: 1,
            maxAngleSimilarity: 1,
            top3MeanSimilarity: 1,
            bestAngle: null,
            distanceM: null,
            confidence: 'HIGH',
          },
        ],
        notice: null,
      },
      null,
      connectivity,
      true,
    );
    navigation.navigate('TourDetail', { tourId: tour.id, tour });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <AppText style={styles.topZone} numberOfLines={1}>
          {zone?.names.en}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.name}>{monument.names.en}</AppText>
        <AppText style={styles.nameNe}>
          {monument.names.ne} - {monument.names.romanized}
        </AppText>
        <AppText style={styles.era}>
          {monument.era.dynasty} - {monument.era.century}
        </AppText>

        {monument.verificationStatus === 'EDITORIAL_DRAFT' && (
          <View style={styles.draft}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
            <AppText style={styles.draftText}>Editorial draft: details are being verified with local custodians.</AppText>
          </View>
        )}

        <View style={styles.tabs}>
          {STORY_TABS.map((t) => (
            <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <AppText style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.storyCard}>
          {tab === 'STORY_HOOK' && (
            <AppText style={styles.duration}>About {monument.audioHook.estimatedSeconds} seconds of narration</AppText>
          )}
          <StreamingText text={context.text} />
          {context.citations.length > 0 && (
            <View style={styles.citations}>
              <AppText style={styles.citationTitle}>
                Verify against{context.confidence ? ` (confidence: ${context.confidence})` : ''}:
              </AppText>
              {context.citations.map((c) => (
                <AppText key={c} style={styles.citation}>
                  - {c}
                </AppText>
              ))}
            </View>
          )}
        </View>

        <AppText style={styles.summaryNe}>{monument.nepaliSummary}</AppText>

        <StorytellerCard
          offers={offers}
          loading={offersLoading}
          selfGuidedRoute={selfGuidedRoute}
          onSelectTour={openTour}
          onSeeAll={() => navigation.navigate('LocalStorytellers', { monumentId: monument.id })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  topZone: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  name: { color: colors.accent, fontSize: 26 },
  nameNe: { color: colors.textSecondary, fontSize: 15 },
  era: { color: colors.textMuted, fontSize: 13 },
  draft: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  draftText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 6 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  tabTextActive: { color: '#021007' },
  storyCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  duration: { color: colors.textMuted, fontSize: 12 },
  citations: { gap: 4, borderTopWidth: 1, borderTopColor: 'rgba(21, 255, 117, 0.15)', paddingTop: 10 },
  citationTitle: { color: colors.textSecondary, fontSize: 12 },
  citation: { color: colors.textMuted, fontSize: 11 },
  summaryNe: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
});
