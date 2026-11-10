import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import type { StorytellerOffer } from '../../repositories/GuideMarketplaceRepository';

export function LocalStorytellersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { monumentId } = route.params as { monumentId: string };
  const { repositories } = useAppMode();
  const [offers, setOffers] = useState<StorytellerOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const monument = repositories?.monuments.getById(monumentId);

  useEffect(() => {
    if (!repositories || !monument) return;
    let cancelled = false;
    repositories.guides
      .refresh()
      .catch(() => [])
      .then(() => repositories.guides.findStorytellersNear(monument, 10))
      .then((found) => {
        if (!cancelled) setOffers(found);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repositories, monument]);

  if (!repositories || !monument) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const route_ = repositories.walkingTours.getForZone(monument.zoneId);
  const stops = route_ ? repositories.walkingTours.getStops(route_.tourId) : [];
  const nearbyRoutes = repositories.walkingTours.getToursNear(monument.geo, 3000).filter((r) => r.tour.tourId !== route_?.tourId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <AppText style={styles.topTitle} numberOfLines={1}>
          Storytellers near {monument.names.en}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.sectionTitle}>Verified local guides</AppText>
        {loading && <ActivityIndicator color={colors.accent} />}
        {!loading && offers.length === 0 && (
          <AppText style={styles.helper}>No guide tours are listed near this monument yet.</AppText>
        )}
        {offers.map((offer) => (
          <Pressable
            key={offer.tour.id}
            style={styles.offer}
            onPress={() => navigation.navigate('TourDetail', { tourId: offer.tour.id, tour: offer.tour })}
          >
            {offer.tour.guide?.user.avatar ? (
              <Image source={{ uri: offer.tour.guide.user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={20} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.offerBody}>
              <View style={styles.row}>
                <AppText style={styles.guideName}>{offer.tour.guide?.user.name ?? 'Local guide'}</AppText>
                {offer.isVerifiedGuide && <Ionicons name="shield-checkmark" size={14} color={colors.accent} />}
              </View>
              <AppText style={styles.tourTitle}>{offer.tour.title}</AppText>
              <AppText style={styles.meta}>
                {offer.distanceM !== null ? `${(offer.distanceM / 1000).toFixed(1)} km from the monument` : offer.tour.meetingPoint} -{' '}
                {Math.round(offer.tour.duration / 60)} h - {offer.tour.rating.toFixed(1)} stars ({offer.tour.totalReviews})
              </AppText>
              <AppText style={styles.languages}>Speaks {offer.tour.guide?.languages.join(', ')}</AppText>
            </View>
          </Pressable>
        ))}

        {route_ && (
          <>
            <AppText style={styles.sectionTitle}>Free self-guided walking route</AppText>
            <View style={styles.routeCard}>
              <AppText style={styles.routeTitle}>{route_.title}</AppText>
              <AppText style={styles.helper}>
                Start: {route_.startPoint} at {route_.bestStartTime} - {(route_.totalDistanceM / 1000).toFixed(1)} km - about{' '}
                {Math.round(route_.totalDurationMinutes / 60)} h
              </AppText>
              {stops.map((stop) => (
                <Pressable
                  key={stop.monument.id}
                  style={styles.stop}
                  onPress={() => navigation.push('MonumentStory', { monumentId: stop.monument.id })}
                >
                  <AppText style={[styles.stopNumber, stop.monument.id === monument.id && styles.stopCurrent]}>{stop.sequence}</AppText>
                  <View style={styles.stopBody}>
                    <AppText style={[styles.stopName, stop.monument.id === monument.id && styles.stopCurrent]}>{stop.monument.names.en}</AppText>
                    <AppText style={styles.meta}>{stop.talkingPoint}</AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {nearbyRoutes.length > 0 && (
          <>
            <AppText style={styles.sectionTitle}>Other routes within 3 km</AppText>
            {nearbyRoutes.map(({ tour, nearestStopM }) => (
              <View key={tour.tourId} style={styles.routeCard}>
                <AppText style={styles.routeTitle}>{tour.title}</AppText>
                <AppText style={styles.helper}>Nearest stop {(nearestStopM / 1000).toFixed(1)} km away</AppText>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  topTitle: { color: colors.textPrimary, fontSize: 17, flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, marginTop: 6 },
  helper: { color: colors.textSecondary, fontSize: 13 },
  offer: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' },
  offerBody: { flex: 1, gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guideName: { color: colors.textPrimary, fontSize: 15 },
  tourTitle: { color: colors.accent, fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12 },
  languages: { color: colors.textSecondary, fontSize: 12 },
  routeCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  routeTitle: { color: colors.textPrimary, fontSize: 15 },
  stop: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  stopNumber: { color: colors.textSecondary, width: 22, textAlign: 'center' },
  stopBody: { flex: 1, gap: 2 },
  stopName: { color: colors.textPrimary, fontSize: 14 },
  stopCurrent: { color: colors.accent },
});
