import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { ScreenHeader } from '@components/ScreenHeader';
import { TourCard } from '@components/TourCard';
import { EmptyState } from '@components/EmptyState';
import { colors } from '@theme/colors';
import { space } from '@theme';
import { getSavedTours } from '../services/api';
import type { Tour } from '@app-types/api';

export function SavedToursScreen() {
  const navigation = useNavigation<any>();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const saved = await getSavedTours();
      setTours(saved);
    } catch {
      setTours([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload every time the screen regains focus — keeps it in sync with hearts
  // toggled on the tour-detail screen.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Saved tours"
        subtitle={tours.length ? `${tours.length} saved` : 'Your wishlist'}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : tours.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No saved tours yet"
          body="Tap the heart on any tour to save it here for later."
          actionLabel="Explore tours"
          onActionPress={() => navigation.navigate('ExploreTab', { screen: 'Search' })}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onPress={() => navigation.navigate('TourDetail', { tourId: tour.id })}
            />
          ))}
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
  },
});
