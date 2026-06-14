import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppText } from '@components/AppText';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Tag } from '@components/Tag';
import { GuideCard } from '@components/GuideCard';
import { ReviewCard } from '@components/ReviewCard';
import { SectionHeader } from '@components/SectionHeader';
import { IconButton } from '@components/IconButton';
import { colors, categoryColors } from '@theme/colors';
import { radii, shadows, space } from '@theme';
import {
  formatDuration,
  formatRating,
  getDayName,
  getTourById,
  isTourSaved,
  toggleSavedTour,
} from '../services/api';
import type { Tour, TourSchedule } from '@app-types/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 360;

export function TourDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tourId, tour: passedTour } = route.params;

  const [tour, setTour] = useState<Tour | null>(passedTour || null);
  const [loading, setLoading] = useState(!passedTour);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadTour();
    isTourSaved(tourId).then(setSaved).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  const handleToggleSave = async () => {
    try {
      const next = await toggleSavedTour(tourId);
      setSaved(next);
    } catch {
      // ignore — leave the heart in its current state
    }
  };

  const handleShare = async () => {
    if (!tour) return;
    try {
      await Share.share({
        message: `Check out "${tour.title}" on Saalik — a free walking tour in ${tour.hub}, Nepal.`,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  const loadTour = async () => {
    try {
      const data = await getTourById(tourId);
      setTour(data);
    } catch (e) {
      console.error('Error loading tour:', e);
      Alert.alert('Error', 'Failed to load tour details');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !tour) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const categoryColor = categoryColors[tour.category] ?? colors.primary;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero photo carousel */}
        <View style={styles.heroBlock}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) =>
              setActivePhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
            }
            scrollEventThrottle={16}
          >
            {tour.photos.map((photo, i) => (
              <Image key={i} source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
            ))}
          </ScrollView>

          {/* Top gradient + back/share */}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
            style={styles.topFade}
          />
          <SafeAreaView edges={['top']} style={styles.heroSafe}>
            <View style={styles.heroActions}>
              <IconButton icon="chevron-back" onPress={() => navigation.goBack()} />
              <View style={styles.heroActionsRight}>
                <IconButton
                  icon={saved ? 'heart' : 'heart-outline'}
                  onPress={handleToggleSave}
                />
                <IconButton icon="share-outline" onPress={handleShare} />
              </View>
            </View>
          </SafeAreaView>

          {/* Bottom gradient with category + indicators */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(2,18,8,0.85)']}
            style={styles.bottomFade}
          />
          <View style={styles.heroBottom}>
            <View style={styles.heroBottomRow}>
              <Tag label={tour.category} tone="custom" bg={categoryColor} fg="#fff" />
              <Tag label="FREE TOUR" tone="accent" solid icon="leaf" />
            </View>
            <View style={styles.indicators}>
              {tour.photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.indicator, i === activePhotoIndex && styles.indicatorActive]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <AppText variant="h1" style={styles.title}>
            {tour.title}
          </AppText>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={16} color={colors.accent} />
            <AppText variant="bodyLg" tone="secondary">
              {tour.hub}, Nepal
            </AppText>
          </View>

          {/* Stats strip */}
          <Card variant="outlined" style={styles.statsCard} noPadding>
            <View style={styles.statsRow}>
              <Stat icon="star" iconColor={colors.star} value={formatRating(tour.rating)} label={`${tour.totalReviews} reviews`} />
              <View style={styles.statsDivider} />
              <Stat icon="time-outline" iconColor={colors.accent} value={formatDuration(tour.duration)} label="duration" />
              <View style={styles.statsDivider} />
              <Stat icon="people-outline" iconColor={colors.accent} value={`${tour.maxGroupSize}`} label="max group" />
            </View>
          </Card>

          {/* About */}
          <View style={styles.section}>
            <SectionHeader title="About this tour" />
            <AppText variant="bodyLg" tone="secondary">
              {tour.description}
            </AppText>
          </View>

          {/* Highlights */}
          <View style={styles.section}>
            <SectionHeader title="What you'll see" />
            <View style={styles.highlightList}>
              {tour.highlights.map((h, i) => (
                <View key={i} style={styles.highlightRow}>
                  <View style={styles.highlightDot}>
                    <Ionicons name="checkmark" size={12} color="#021007" />
                  </View>
                  <AppText variant="body" style={styles.highlightText}>
                    {h}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          {/* Meeting */}
          <View style={styles.section}>
            <SectionHeader title="Meeting point" />
            <Card variant="outlined">
              <View style={styles.meetingRow}>
                <View style={styles.meetingIcon}>
                  <Ionicons name="location" size={20} color={colors.accent} />
                </View>
                <View style={styles.meetingText}>
                  <AppText variant="h4">{tour.meetingPoint}</AppText>
                  {tour.hub && (
                    <AppText variant="caption" tone="secondary">
                      {tour.hub}, Nepal
                    </AppText>
                  )}
                </View>
              </View>
            </Card>
          </View>

          {/* Schedule */}
          {(tour.schedules?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Available days" />
              <View style={styles.scheduleRow}>
                {tour.schedules!.map((s: TourSchedule, i: number) => (
                  <View key={i} style={styles.scheduleChip}>
                    <AppText variant="label" tone="primary">
                      {s.dayOfWeek !== undefined && s.dayOfWeek !== null
                        ? getDayName(s.dayOfWeek)
                        : 'Special'}
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                      {s.startTime}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Included / Not included */}
          <View style={styles.section}>
            <View style={styles.includedGrid}>
              <View style={styles.includedColumn}>
                <View style={styles.includedHeading}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                  <AppText variant="label" tone="accent">
                    Included
                  </AppText>
                </View>
                {tour.included.map((item, i) => (
                  <AppText key={i} variant="body" tone="primary" style={styles.includedItem}>
                    {item}
                  </AppText>
                ))}
              </View>
              <View style={styles.includedColumn}>
                <View style={styles.includedHeading}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  <AppText variant="label" tone="muted">
                    Not included
                  </AppText>
                </View>
                {tour.notIncluded.map((item, i) => (
                  <AppText key={i} variant="body" tone="secondary" style={styles.includedItem}>
                    {item}
                  </AppText>
                ))}
              </View>
            </View>
          </View>

          {/* Guide */}
          <View style={styles.section}>
            <SectionHeader title="Your guide" />
            <GuideCard
              guide={tour.guide}
              onPress={() =>
                navigation.navigate('GuideProfile', { guideId: tour.guide.id, guide: tour.guide })
              }
              compact
            />
          </View>

          {/* Reviews */}
          {(tour.reviews?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Reviews"
                actionLabel={`See all (${tour.totalReviews})`}
                onActionPress={() => Alert.alert('Coming soon', 'All reviews coming soon.')}
              />
              <View style={styles.reviewList}>
                {tour.reviews!.slice(0, 3).map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </View>
            </View>
          )}

          {/* Tip explainer */}
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="heart" size={22} color={colors.accent} />
            </View>
            <View style={styles.tipText}>
              <AppText variant="h4" tone="accent">
                Pay what it's worth
              </AppText>
              <AppText variant="bodySm" tone="secondary">
                The tour itself is free. At the end, tip your guide based on the experience —
                most travelers tip $10–20 per person.
              </AppText>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Sticky booking bar */}
      <SafeAreaView style={styles.bookingBar} edges={['bottom']}>
        <View style={styles.priceBlock}>
          <AppText variant="caption" tone="secondary">
            Price
          </AppText>
          <View style={styles.priceLine}>
            <AppText variant="h2" tone="accent">
              FREE
            </AppText>
            <AppText variant="caption" tone="muted">
              · tips welcome
            </AppText>
          </View>
        </View>
        <Button
          label="Book now"
          rightIcon="arrow-forward"
          size="lg"
          onPress={() => navigation.navigate('Booking', { tour })}
        />
      </SafeAreaView>
    </View>
  );
}

function Stat({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <AppText variant="label" tone="primary" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // Hero
  heroBlock: {
    height: HERO_HEIGHT,
    position: 'relative',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  heroActionsRight: {
    flexDirection: 'row',
    gap: space.sm,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    gap: space.md,
  },
  heroBottomRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  indicators: {
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  indicatorActive: {
    backgroundColor: colors.accent,
    width: 22,
  },

  // Body
  body: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  title: {
    marginBottom: space.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: space.lg,
  },

  // Stats strip
  statsCard: {
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Sections
  section: {
    marginTop: space.xxl,
  },

  // Highlights
  highlightList: {
    gap: space.md,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  highlightDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  highlightText: {
    flex: 1,
  },

  // Meeting
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  meetingIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(21, 255, 117, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingText: {
    flex: 1,
    gap: 2,
  },

  // Schedule
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  scheduleChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    minWidth: 78,
  },

  // Included
  includedGrid: {
    flexDirection: 'row',
    gap: space.lg,
  },
  includedColumn: {
    flex: 1,
    gap: 6,
  },
  includedHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: space.sm,
  },
  includedItem: {
    fontSize: 14,
  },

  // Reviews
  reviewList: {
    gap: space.md,
  },

  // Tip card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    backgroundColor: 'rgba(21, 255, 117, 0.08)',
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: 'rgba(21, 255, 117, 0.25)',
    marginTop: space.xxl,
  },
  tipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(21, 255, 117, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    gap: 4,
  },

  // Booking bar
  bookingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: space.md,
    ...shadows.lg,
  },
  priceBlock: {
    gap: 2,
  },
  priceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
});
