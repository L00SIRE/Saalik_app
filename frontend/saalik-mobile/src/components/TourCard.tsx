import React from 'react';
import { View, StyleSheet, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from './AppText';
import { PressableCard } from './Card';
import { Tag } from './Tag';
import { colors, categoryColors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { radii, shadows, space } from '@theme';
import type { Tour } from '@app-types/api';
import { formatDuration, formatRating } from '../services/api';

interface TourCardProps {
  tour: Tour;
  onPress: () => void;
  /** Compact horizontal-scroll variant used on Home. */
  compact?: boolean;
}

/**
 * Full-bleed image with a dark gradient overlay so the title can sit on top.
 * Reads like a magazine card rather than the previous "image then text below"
 * layout that flattened the visual hierarchy.
 */
export function TourCard({ tour, onPress, compact = false }: TourCardProps) {
  const categoryColor = categoryColors[tour.category] ?? colors.primary;
  const photo = tour.photos?.[0];

  if (compact) {
    return (
      <PressableCard
        onPress={onPress}
        variant="elevated"
        noPadding
        radius="lg"
        style={styles.compactCard}
      >
        <ImageBackground
          source={photo ? { uri: photo } : undefined}
          style={styles.compactImage}
          imageStyle={styles.compactImageInner}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(2,18,8,0.9)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.compactOverlayTop}>
            <Tag label={tour.category} tone="custom" bg={categoryColor} fg="#fff" size="sm" />
          </View>
        </ImageBackground>
        <View style={styles.compactContent}>
          <AppText variant="h4" numberOfLines={2} style={styles.compactTitle}>
            {tour.title}
          </AppText>
          <View style={styles.compactMeta}>
            <Ionicons name="star" size={12} color={colors.star} />
            <AppText variant="caption" tone="primary" style={styles.compactMetaText}>
              {formatRating(tour.rating)}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.compactDot}>
              ·
            </AppText>
            <AppText variant="caption" tone="secondary">
              {formatDuration(tour.duration)}
            </AppText>
          </View>
        </View>
      </PressableCard>
    );
  }

  return (
    <PressableCard
      onPress={onPress}
      variant="elevated"
      noPadding
      radius="lg"
      style={styles.card}
    >
      {/* Hero image with gradient + overlay tags */}
      <View style={styles.heroBlock}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.15)', 'rgba(2,18,8,0.92)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Top row — category + free badge */}
        <View style={styles.heroTopRow}>
          <Tag label={tour.category} tone="custom" bg={categoryColor} fg="#fff" />
          <Tag label="FREE" tone="accent" solid icon="leaf" />
        </View>
        {/* Bottom — title overlaid on the image */}
        <View style={styles.heroBottom}>
          <AppText variant="h3" tone="primary" numberOfLines={2}>
            {tour.title}
          </AppText>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={colors.accent} />
            <AppText variant="bodySm" tone="secondary">
              {tour.hub}
            </AppText>
          </View>
        </View>
      </View>

      {/* Content footer */}
      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color={colors.star} />
            <AppText variant="label" tone="primary" style={styles.metaValue}>
              {formatRating(tour.rating)}
            </AppText>
            <AppText variant="caption" tone="muted">
              ({tour.totalReviews})
            </AppText>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <AppText variant="caption" tone="secondary">
              {formatDuration(tour.duration)}
            </AppText>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <AppText variant="caption" tone="secondary">
              max {tour.maxGroupSize}
            </AppText>
          </View>
        </View>

        <View style={styles.guideRow}>
          {tour.guide?.user?.avatar ? (
            <Image source={{ uri: tour.guide.user.avatar }} style={styles.guideAvatar} />
          ) : (
            <View style={[styles.guideAvatar, styles.guideAvatarFallback]}>
              <Ionicons name="person" size={12} color={colors.textMuted} />
            </View>
          )}
          <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.guideName}>
            {tour.guide?.user?.name ?? 'Local Guide'}
          </AppText>
          {tour.guide?.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
          )}
          <View style={styles.tipBadge}>
            <Ionicons name="heart" size={11} color={colors.accent} />
            <AppText variant="caption" tone="accent" style={styles.tipText}>
              tips welcome
            </AppText>
          </View>
        </View>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: space.lg,
  },
  heroBlock: {
    height: 220,
    width: '100%',
    justifyContent: 'space-between',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    backgroundColor: '#0a3d1f',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space.md,
    paddingTop: space.md,
  },
  heroBottom: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.md,
    backgroundColor: colors.card,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaValue: {
    fontSize: 13,
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  guideAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  guideAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideName: {
    flex: 1,
  },
  tipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(21, 255, 117, 0.10)',
  },
  tipText: {
    fontWeight: '600',
  },

  // Compact variant
  compactCard: {
    width: 200,
    marginRight: space.md,
    ...shadows.sm,
  },
  compactImage: {
    width: '100%',
    height: 130,
    justifyContent: 'space-between',
  },
  compactImageInner: {
    backgroundColor: '#0a3d1f',
  },
  compactOverlayTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
  },
  compactContent: {
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.xs,
  },
  compactTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactMetaText: {
    fontWeight: '700',
  },
  compactDot: {
    marginHorizontal: 2,
  },
});
