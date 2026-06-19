import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@components/AppText';
import { Card, PressableCard } from '@components/Card';
import { Tag } from '@components/Tag';
import { Button } from '@components/Button';
import { ScreenHeader } from '@components/ScreenHeader';
import { EmptyState } from '@components/EmptyState';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';
import { useAuth } from '@context/AuthContext';
import * as demo from '@services/demoSession';
import { formatDuration, formatRating } from '@services/api';
import { tourCoverSource } from '../assets/imageSource';
import type { Tour } from '@app-types/api';

/**
 * Bishnu's tour management screen. Lists his active listings, lets him toggle
 * each one, and (in a future build) lets him edit schedules and pricing.
 */
export function GuideMyToursScreen() {
  const { isDemo } = useAuth();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setTours(demo.listGuideOwnTours());
    }
    setLoading(false);
  }, [isDemo]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="My tours"
        subtitle={
          tours.length > 0
            ? `${tours.length} active ${tours.length === 1 ? 'listing' : 'listings'}`
            : 'You haven\'t published a tour yet'
        }
        right={
          <Pressable
            style={({ pressed }) => [styles.newButton, pressed && styles.newButtonPressed]}
            onPress={() => undefined}
          >
            <Ionicons name="add" size={18} color="#021007" />
            <AppText variant="label" tone="inverse">
              New
            </AppText>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tours.length === 0 ? (
          <EmptyState
            icon="map-outline"
            title="No tours yet"
            body="Publish your first tour to start receiving bookings."
            actionLabel="Create a tour"
            onActionPress={() => undefined}
          />
        ) : (
          <View style={styles.list}>
            {tours.map((tour) => (
              <OwnTourCard key={tour.id} tour={tour} />
            ))}
          </View>
        )}

        <View style={{ height: space.huge }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function OwnTourCard({ tour }: { tour: Tour }) {
  const cover = tourCoverSource(tour);
  return (
    <Card variant="outlined" noPadding radius="lg" style={styles.tourCard}>
      <View style={styles.tourImageBlock}>
        {cover ? (
          <Image source={cover} style={styles.tourImage} />
        ) : (
          <View style={[styles.tourImage, styles.tourImagePlaceholder]} />
        )}
        <View style={styles.tourImageOverlay}>
          <Tag
            label={tour.isActive ? 'Live' : 'Paused'}
            tone={tour.isActive ? 'accent' : 'neutral'}
            solid
            size="sm"
          />
        </View>
      </View>

      <View style={styles.tourBody}>
        <AppText variant="h4" numberOfLines={2}>
          {tour.title}
        </AppText>

        <View style={styles.tourStats}>
          <Stat icon="star" iconColor={colors.star} value={formatRating(tour.rating)} label={`${tour.totalReviews}`} />
          <View style={styles.tourStatDivider} />
          <Stat icon="time-outline" value={formatDuration(tour.duration)} />
          <View style={styles.tourStatDivider} />
          <Stat icon="people-outline" value={`max ${tour.maxGroupSize}`} />
        </View>

        <View style={styles.scheduleRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
          <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.flex1}>
            {tour.schedules?.length ?? 0} weekly slot
            {(tour.schedules?.length ?? 0) === 1 ? '' : 's'}
          </AppText>
        </View>

        <View style={styles.tourActions}>
          <Button label="Edit" size="sm" variant="ghost" onPress={() => undefined} />
          <Button label="View" size="sm" variant="secondary" onPress={() => undefined} rightIcon="arrow-forward" />
        </View>
      </View>
    </Card>
  );
}

function Stat({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  value: string;
  label?: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={13} color={iconColor ?? colors.textSecondary} />
      <AppText variant="caption" tone="primary" style={styles.statValue}>
        {value}
      </AppText>
      {label && (
        <AppText variant="caption" tone="muted">
          ({label})
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  newButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  list: {
    gap: space.md,
  },
  tourCard: {
    overflow: 'hidden',
  },
  tourImageBlock: {
    height: 140,
    width: '100%',
    backgroundColor: '#0a3d1f',
  },
  tourImage: {
    width: '100%',
    height: '100%',
  },
  tourImagePlaceholder: {
    backgroundColor: '#0a3d1f',
  },
  tourImageOverlay: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
  },
  tourBody: {
    padding: space.lg,
    gap: space.sm,
    backgroundColor: colors.card,
  },
  tourStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '700',
  },
  tourStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flex1: { flex: 1 },
  tourActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.sm,
    marginTop: space.xs,
  },
});
