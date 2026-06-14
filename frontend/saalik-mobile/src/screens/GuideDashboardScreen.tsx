import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@components/AppText';
import { Card } from '@components/Card';
import { Tag } from '@components/Tag';
import { Button } from '@components/Button';
import { ScreenHeader } from '@components/ScreenHeader';
import { SectionHeader } from '@components/SectionHeader';
import { ReviewCard } from '@components/ReviewCard';
import { EmptyState } from '@components/EmptyState';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';
import { useAuth } from '@context/AuthContext';
import * as demo from '@services/demoSession';
import { formatDuration } from '@services/api';
import type { GuideEarnings } from '@services/demoSeed';
import type { Booking, Review, Tour } from '@app-types/api';

/**
 * Bishnu's home screen. Shows earnings at a glance, incoming bookings he needs
 * to action, and recent reviews. Numbers come from demoSession when in demo
 * mode; in real mode this hits a guide-side API endpoint we have yet to ship.
 */
export function GuideDashboardScreen() {
  const { user, isDemo } = useAuth();
  const [earnings, setEarnings] = useState<GuideEarnings | null>(null);
  const [incoming, setIncoming] = useState<Booking[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (isDemo) {
      setEarnings(demo.getGuideEarnings());
      setIncoming(demo.listGuideIncoming());
      setRecentReviews(demo.getGuideOwnReviews().slice(0, 3));
    } else {
      // TODO: real guide-side API endpoints (out of scope for this build)
      setEarnings(null);
      setIncoming([]);
      setRecentReviews([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Guide';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Greeting header */}
        <View style={styles.headerBlock}>
          <AppText variant="overline" tone="accent">
            {greeting}, {firstName}
          </AppText>
          <AppText variant="h1" style={styles.headerTitle}>
            {incoming.length > 0
              ? `${incoming.length} ${incoming.length === 1 ? 'booking' : 'bookings'} on your plate`
              : 'No bookings yet today'}
          </AppText>
          <AppText variant="bodyLg" tone="secondary" style={styles.headerSubtitle}>
            Everything you need to run your week.
          </AppText>
        </View>

        {/* Earnings card */}
        {earnings && <EarningsCard earnings={earnings} />}

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <QuickAction icon="add-circle" label="New tour" onPress={() => undefined} />
          <QuickAction icon="calendar" label="Schedule" onPress={() => undefined} />
          <QuickAction icon="cash" label="Payouts" onPress={() => undefined} />
          <QuickAction icon="chatbubbles" label="Messages" onPress={() => undefined} />
        </View>

        {/* Incoming bookings */}
        <View style={styles.section}>
          <SectionHeader
            title="Upcoming bookings"
            subtitle={
              incoming.length > 0
                ? `Next: ${formatDateRelative(incoming[0]!.bookingDate)}`
                : 'Open a slot to start hosting'
            }
          />
          {incoming.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No bookings yet"
              body="When travelers book, they'll show up here with their notes and party size."
            />
          ) : (
            <View style={styles.bookingList}>
              {incoming.map((b) => (
                <IncomingBookingRow key={b.id} booking={b} />
              ))}
            </View>
          )}
        </View>

        {/* Recent reviews */}
        {recentReviews.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recent reviews"
              actionLabel="See all"
              onActionPress={() => undefined}
            />
            <View style={styles.reviewList}>
              {recentReviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: space.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EarningsCard({ earnings }: { earnings: GuideEarnings }) {
  const max = Math.max(1, ...earnings.daily.map((d) => d.tipUsd));

  return (
    <Card variant="outlined" radius="xl" style={styles.earningsCard}>
      <LinearGradient
        colors={['rgba(21, 255, 117, 0.16)', 'rgba(21, 255, 117, 0.02)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.earningsHeader}>
        <View>
          <AppText variant="overline" tone="accent">
            Last 7 days
          </AppText>
          <AppText variant="display" style={styles.earningsValue}>
            ${earnings.last7DaysUsd}
          </AppText>
        </View>
        <Tag
          label={`${earnings.bookingsLast7Days} tours`}
          tone="accent"
          icon="people"
          size="sm"
        />
      </View>

      {/* Sparkline bars — last 7 days */}
      <View style={styles.sparkline}>
        {earnings.daily.map((d, i) => {
          const heightPct = Math.max(6, (d.tipUsd / max) * 100);
          return (
            <View key={i} style={styles.sparkBarColumn}>
              <View style={styles.sparkBarTrack}>
                <View
                  style={[
                    styles.sparkBarFill,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: d.tipUsd > 0 ? colors.accent : 'rgba(255,255,255,0.1)',
                    },
                  ]}
                />
              </View>
              <AppText variant="caption" tone="muted" style={styles.sparkLabel}>
                {dayShort(d.date)}
              </AppText>
            </View>
          );
        })}
      </View>

      <View style={styles.earningsFooter}>
        <View style={styles.earningsStat}>
          <AppText variant="label" tone="primary">
            ${earnings.last30DaysUsd}
          </AppText>
          <AppText variant="caption" tone="muted">
            30 days
          </AppText>
        </View>
        <View style={styles.earningsDivider} />
        <View style={styles.earningsStat}>
          <AppText variant="label" tone="primary">
            ${earnings.allTimeUsd.toLocaleString()}
          </AppText>
          <AppText variant="caption" tone="muted">
            all time
          </AppText>
        </View>
        <View style={styles.earningsDivider} />
        <View style={styles.earningsStat}>
          <AppText variant="label" tone="accent">
            ${earnings.payoutPendingUsd}
          </AppText>
          <AppText variant="caption" tone="muted">
            pending payout
          </AppText>
        </View>
      </View>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <AppText variant="caption" tone="primary" style={styles.quickActionLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

function IncomingBookingRow({ booking }: { booking: Booking }) {
  const isPending = booking.status === 'PENDING';
  const dateLabel = formatDateRelative(booking.bookingDate);

  return (
    <Card variant="outlined" style={styles.bookingRow}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingHeaderLeft}>
          <AppText variant="caption" tone="accent" style={styles.bookingDate}>
            {dateLabel.toUpperCase()}
          </AppText>
          <AppText variant="h4" numberOfLines={1} style={styles.bookingTitle}>
            {booking.tour.title}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {booking.schedule.startTime} · {booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'} · {formatDuration(booking.tour.duration)}
          </AppText>
        </View>
        <Tag
          label={isPending ? 'Pending' : 'Confirmed'}
          tone={isPending ? 'warning' : 'accent'}
          solid={!isPending}
          size="sm"
        />
      </View>

      {booking.notes && (
        <View style={styles.bookingNote}>
          <Ionicons name="chatbox-outline" size={13} color={colors.textSecondary} />
          <AppText variant="caption" tone="secondary" style={styles.bookingNoteText}>
            {booking.notes}
          </AppText>
        </View>
      )}

      {isPending && (
        <View style={styles.bookingActions}>
          <Button label="Decline" size="sm" variant="ghost" onPress={() => undefined} />
          <Button label="Accept" size="sm" onPress={() => undefined} rightIcon="checkmark" />
        </View>
      )}
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dayShort(iso: string): string {
  const d = new Date(iso);
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()] ?? '';
}

function formatDateRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 0 && diffDays < 7) return `in ${diffDays} days`;
  if (diffDays >= 7 && diffDays < 14) return 'next week';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
    paddingTop: space.md,
    paddingBottom: space.huge,
    gap: space.xl,
  },

  // Header
  headerBlock: {
    gap: space.xs,
  },
  headerTitle: {
    marginTop: space.xs,
  },
  headerSubtitle: {
    marginTop: 2,
  },

  // Earnings
  earningsCard: {
    overflow: 'hidden',
    padding: space.xl,
    borderColor: 'rgba(21, 255, 117, 0.25)',
    gap: space.lg,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  earningsValue: {
    color: colors.textPrimary,
    fontSize: 36,
    marginTop: 2,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 70,
    gap: space.sm,
  },
  sparkBarColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
  },
  sparkBarTrack: {
    flex: 1,
    width: '100%',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sparkBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  sparkLabel: {
    fontSize: 10,
  },
  earningsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  earningsStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  earningsDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radii.md,
    paddingVertical: space.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  quickActionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(21, 255, 117, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  quickActionLabel: {
    fontSize: 11,
  },

  // Sections
  section: {
    gap: space.sm,
  },

  // Booking row
  bookingList: {
    gap: space.md,
  },
  bookingRow: {
    gap: space.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  bookingHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  bookingDate: {
    letterSpacing: 1,
    fontSize: 11,
  },
  bookingTitle: {
    fontSize: 15,
  },
  bookingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radii.sm,
    padding: space.sm,
  },
  bookingNoteText: {
    flex: 1,
    fontStyle: 'italic',
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.sm,
  },

  // Reviews
  reviewList: {
    gap: space.md,
  },
});
