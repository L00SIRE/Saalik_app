import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { colors } from '@theme/colors';
import type { StorytellerOffer } from '../../repositories/GuideMarketplaceRepository';
import type { Tour } from '../../types/api';
import type { HeritageWalkingTour } from '../../types/heritage';

interface StorytellerCardProps {
  offers: StorytellerOffer[];
  loading: boolean;
  selfGuidedRoute: HeritageWalkingTour | null;
  onSelectTour: (tour: Tour) => void;
  onSeeAll: () => void;
}

function describeDistance(offer: StorytellerOffer): string {
  if (offer.distanceM !== null) {
    return offer.distanceM < 1000 ? `Meets ${Math.round(offer.distanceM)} m away` : `Meets ${(offer.distanceM / 1000).toFixed(1)} km away`;
  }
  return offer.reason === 'keyword_match' ? 'Tours this site' : `Based in ${offer.tour.hub}`;
}

export function StorytellerCard({ offers, loading, selfGuidedRoute, onSelectTour, onSeeAll }: StorytellerCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="people" size={20} color={colors.accent} />
        <AppText style={styles.title}>Book a Verified Local Storyteller Nearby</AppText>
      </View>
      <AppText style={styles.subtitle}>
        Free walking tours led by licensed local guides. You tip what the story was worth.
      </AppText>

      {loading && <ActivityIndicator color={colors.accent} style={styles.loader} />}

      {!loading && offers.length === 0 && (
        <AppText style={styles.empty}>No storytellers listed here yet. Try the free self-guided route below.</AppText>
      )}

      {!loading &&
        offers.map((offer) => (
          <Pressable key={offer.tour.id} style={styles.offer} onPress={() => onSelectTour(offer.tour)}>
            {offer.tour.guide?.user.avatar ? (
              <Image source={{ uri: offer.tour.guide.user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={18} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.offerBody}>
              <View style={styles.nameRow}>
                <AppText style={styles.guideName}>{offer.tour.guide?.user.name ?? 'Local guide'}</AppText>
                {offer.isVerifiedGuide && <Ionicons name="shield-checkmark" size={14} color={colors.accent} />}
              </View>
              <AppText style={styles.tourTitle} numberOfLines={1}>
                {offer.tour.title}
              </AppText>
              <AppText style={styles.meta}>
                {describeDistance(offer)} - {offer.tour.rating.toFixed(1)} stars - Free, tip-based
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}

      {selfGuidedRoute && (
        <View style={styles.route}>
          <Ionicons name="walk" size={16} color={colors.textSecondary} />
          <AppText style={styles.routeText}>
            Free self-guided route: {selfGuidedRoute.title} ({selfGuidedRoute.stopMonumentIds.length} stops, about{' '}
            {Math.round(selfGuidedRoute.totalDurationMinutes / 60)} h)
          </AppText>
        </View>
      )}

      <Pressable style={styles.cta} onPress={onSeeAll}>
        <AppText style={styles.ctaText}>See all storytellers and free walking tours</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(21, 255, 117, 0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 16,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.accent, fontSize: 16, flex: 1 },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  loader: { marginVertical: 12 },
  empty: { color: colors.textMuted, fontSize: 13 },
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.card,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' },
  offerBody: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guideName: { color: colors.textPrimary, fontSize: 14 },
  tourTitle: { color: colors.textSecondary, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 12 },
  route: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  routeText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  cta: { backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  ctaText: { color: '#021007', fontSize: 14 },
});
