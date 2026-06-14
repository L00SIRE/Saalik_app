import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AppText } from '@components/AppText';
import { BookingCard } from '@components/BookingCard';
import { ScreenHeader } from '@components/ScreenHeader';
import { IconButton } from '@components/IconButton';
import { EmptyState } from '@components/EmptyState';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';
import { cancelBooking, getMyBookings } from '../services/api';
import type { Booking } from '@app-types/api';

type TabType = 'upcoming' | 'past' | 'cancelled';

const TABS: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'past', label: 'Past', icon: 'time-outline' },
  { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
];

export function TripsScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = async () => {
    try {
      const data = await getMyBookings(activeTab);
      setBookings(data);
    } catch (e) {
      console.error('Error loading bookings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBookings();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleBookingPress = (booking: Booking) => {
    navigation.navigate('TourDetail', { tourId: booking.tourId, tour: booking.tour });
  };

  const handleCancel = (booking: Booking) =>
    Alert.alert(
      'Cancel booking',
      `Are you sure you want to cancel "${booking.tour.title}"?`,
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(booking.id);
              loadBookings();
            } catch {
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          },
        },
      ],
    );

  const handleReview = (booking: Booking) => navigation.navigate('WriteReview', { booking });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="My trips"
        subtitle={
          bookings.length > 0
            ? `${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'} in ${activeTab}`
            : 'Track and manage your tours'
        }
        right={
          <IconButton
            icon="compass-outline"
            onPress={() => navigation.navigate('Explore')}
            color={colors.accent}
            background="rgba(21, 255, 117, 0.12)"
          />
        }
      />

      {/* Segmented control */}
      <View style={styles.segmentedWrap}>
        <View style={styles.segmented}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  if (tab.key !== activeTab) {
                    setActiveTab(tab.key);
                    setLoading(true);
                  }
                }}
                style={({ pressed }) => [
                  styles.segment,
                  active && styles.segmentActive,
                  pressed && styles.segmentPressed,
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={active ? '#021007' : colors.textSecondary}
                />
                <AppText
                  variant="label"
                  style={{ color: active ? '#021007' : colors.textSecondary }}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => handleBookingPress(item)}
              onCancel={activeTab === 'upcoming' ? () => handleCancel(item) : undefined}
              onReview={activeTab === 'past' ? () => handleReview(item) : undefined}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={
                activeTab === 'upcoming'
                  ? 'calendar-outline'
                  : activeTab === 'past'
                    ? 'time-outline'
                    : 'close-circle-outline'
              }
              title={
                activeTab === 'upcoming'
                  ? 'No upcoming trips'
                  : activeTab === 'past'
                    ? 'No past trips yet'
                    : 'No cancelled bookings'
              }
              body={
                activeTab === 'upcoming'
                  ? 'Discover unique walking tours across Nepal and book your first one.'
                  : activeTab === 'past'
                    ? 'Tours you complete will land here, ready to review.'
                    : 'Cancelled bookings will show up here.'
              }
              actionLabel={activeTab === 'upcoming' ? 'Explore tours' : undefined}
              onActionPress={
                activeTab === 'upcoming' ? () => navigation.navigate('Explore') : undefined
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Segmented control
  segmentedWrap: {
    paddingHorizontal: space.xl,
    marginBottom: space.lg,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentPressed: {
    opacity: 0.85,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
    flexGrow: 1,
  },
});
