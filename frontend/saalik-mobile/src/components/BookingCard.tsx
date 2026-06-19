import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { AppText } from './AppText';
import { PressableCard } from './Card';
import { Button } from './Button';
import { Tag } from './Tag';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { radii, space } from '@theme';
import type { Booking } from '@app-types/api';
import { tourCoverSource } from '../assets/imageSource';
import { formatDuration } from '../services/api';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onCancel?: () => void;
  onReview?: () => void;
}

export function BookingCard({ booking, onPress, onCancel, onReview }: BookingCardProps) {
  const bookingDate = new Date(booking.bookingDate);
  const now = new Date();
  const isPast = bookingDate < now;
  const isCancelled = booking.status === 'CANCELLED';
  const isCompleted = booking.status === 'COMPLETED';

  const status = isCancelled
    ? { label: 'Cancelled', tone: 'danger' as const }
    : isCompleted
      ? { label: 'Completed', tone: 'success' as const }
      : isPast
        ? { label: 'Past', tone: 'neutral' as const }
        : { label: 'Confirmed', tone: 'accent' as const };

  const dateLabel = bookingDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Days-until pill — adds context without forcing the user to do math.
  const daysUntil = Math.ceil((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const showCountdown = !isPast && !isCancelled && daysUntil >= 0;
  const countdownLabel =
    daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;

  const tourPhoto = tourCoverSource(booking.tour);

  return (
    <PressableCard onPress={onPress} variant="outlined" noPadding radius="lg" style={styles.card}>
      <View style={styles.row}>
        {/* Image rail */}
        <View style={styles.imageWrap}>
          {tourPhoto ? (
            <Image source={tourPhoto} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}
          {showCountdown && (
            <View style={styles.countdown}>
              <AppText variant="overline" tone="inverse" style={styles.countdownText}>
                {countdownLabel}
              </AppText>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Tag label={status.label} tone={status.tone} solid={status.tone !== 'neutral'} size="sm" />
          </View>

          <AppText variant="h4" numberOfLines={2} style={styles.title}>
            {booking.tour.title}
          </AppText>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <AppText variant="caption" tone="secondary">
              {dateLabel}
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <AppText variant="caption" tone="secondary">
              {booking.schedule.startTime} · {formatDuration(booking.tour.duration)}
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
            <AppText variant="caption" tone="secondary">
              {booking.partySize} {booking.partySize === 1 ? 'person' : 'people'}
            </AppText>
          </View>

          {/* Footer — guide + actions */}
          <View style={styles.footerRow}>
            <View style={styles.guideRow}>
              {booking.tour.guide?.user?.avatar ? (
                <Image source={{ uri: booking.tour.guide.user.avatar }} style={styles.guideAvatar} />
              ) : (
                <View style={[styles.guideAvatar, styles.guideAvatarFallback]}>
                  <Ionicons name="person" size={11} color={colors.textMuted} />
                </View>
              )}
              <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.guideName}>
                {booking.tour.guide?.user?.name ?? 'Local Guide'}
              </AppText>
            </View>

            {booking.tipAmount ? (
              <Tag
                label={`Tipped ${booking.tipCurrency} ${booking.tipAmount}`}
                tone="accent"
                icon="heart"
                size="sm"
              />
            ) : (isPast || isCompleted) && !isCancelled && onReview ? (
              <Button label="Review" size="sm" onPress={onReview} leftIcon="star-outline" />
            ) : !isPast && !isCancelled && onCancel ? (
              <Button label="Cancel" size="sm" variant="danger" onPress={onCancel} />
            ) : null}
          </View>
        </View>
      </View>
    </PressableCard>
  );
}

const IMAGE_WIDTH = 110;

const styles = StyleSheet.create({
  card: {
    marginBottom: space.md,
  },
  row: {
    flexDirection: 'row',
  },
  imageWrap: {
    width: IMAGE_WIDTH,
    minHeight: 180,
    backgroundColor: '#0a3d1f',
  },
  image: {
    width: IMAGE_WIDTH,
    height: '100%',
    minHeight: 180,
  },
  imagePlaceholder: {
    backgroundColor: '#0a3d1f',
  },
  countdown: {
    position: 'absolute',
    bottom: space.sm,
    left: space.sm,
    right: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.xs,
    paddingHorizontal: space.xs,
    paddingVertical: 3,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  content: {
    flex: 1,
    padding: space.md,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: space.xs,
  },
  title: {
    marginBottom: space.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.sm,
  },
  guideRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guideAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  guideAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideName: {
    flex: 1,
  },
});
