import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AppText } from '@components/AppText';
import { Card } from '@components/Card';
import { ScreenHeader } from '@components/ScreenHeader';
import { EmptyState } from '@components/EmptyState';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';
import { getMyReviews, searchTours } from '../services/api';
import { tourCoverSource } from '../assets/imageSource';
import type { Review, Tour } from '@app-types/api';

function formatRelative(dateString: string): string {
  const d = new Date(dateString);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return d.toLocaleDateString();
}

export function MyReviewsScreen() {
  const navigation = useNavigation<any>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tourMap, setTourMap] = useState<Record<string, Tour>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [mine, tours] = await Promise.all([getMyReviews(), searchTours()]);
      const map: Record<string, Tour> = {};
      tours.forEach((t) => {
        map[t.id] = t;
      });
      setTourMap(map);
      setReviews(mine);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="My reviews"
        subtitle={reviews.length ? `${reviews.length} written` : 'Your tour reviews'}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="star-outline"
          title="No reviews yet"
          body="After a tour wraps up, leave a review and it’ll show up here."
          actionLabel="See your trips"
          onActionPress={() => navigation.navigate('TripsTab', { screen: 'MyBookings' })}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {reviews.map((review) => {
            const tour = tourMap[review.tourId];
            return (
              <Card key={review.id} variant="outlined" noPadding radius="lg" style={styles.card}>
                {/* Tour header — tappable, opens the tour */}
                <Pressable
                  onPress={() =>
                    tour && navigation.navigate('TourDetail', { tourId: tour.id })
                  }
                  style={({ pressed }) => [styles.tourRow, pressed && styles.pressed]}
                >
                  {(() => {
                    const thumb = tour ? tourCoverSource(tour) : undefined;
                    return thumb ? (
                      <Image source={thumb} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFallback]}>
                        <Ionicons name="image-outline" size={18} color={colors.textMuted} />
                      </View>
                    );
                  })()}
                  <View style={styles.tourText}>
                    <AppText variant="label" numberOfLines={2}>
                      {tour?.title ?? 'Tour'}
                    </AppText>
                    {tour?.hub && (
                      <View style={styles.hubRow}>
                        <Ionicons name="location-sharp" size={11} color={colors.accent} />
                        <AppText variant="caption" tone="secondary">
                          {tour.hub}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>

                <View style={styles.divider} />

                <View style={styles.body}>
                  <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < review.rating ? 'star' : 'star-outline'}
                        size={14}
                        color={i < review.rating ? colors.star : colors.starEmpty}
                      />
                    ))}
                    <AppText variant="caption" tone="muted" style={styles.date}>
                      · {formatRelative(review.createdAt)}
                    </AppText>
                  </View>
                  {review.title && (
                    <AppText variant="h4" style={styles.reviewTitle}>
                      {review.title}
                    </AppText>
                  )}
                  <AppText variant="body" tone="secondary">
                    {review.comment}
                  </AppText>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
    gap: space.lg,
  },
  card: {
    overflow: 'hidden',
  },
  tourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
  },
  thumbFallback: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourText: {
    flex: 1,
    gap: 3,
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  body: {
    padding: space.md,
    gap: space.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  date: {
    marginLeft: 4,
  },
  reviewTitle: {
    fontSize: 15,
    marginTop: 2,
  },
});
