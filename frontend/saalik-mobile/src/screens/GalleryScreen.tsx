import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '@components/AppText';
import { Chip } from '@components/Chip';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';
import { searchTours } from '../services/api';
import type { Tour } from '@app-types/api';

interface Tile {
  uri: string;
  tourId: string;
  title: string;
  hub: string;
  /** Taller tile for a staggered, magazine-like grid. */
  tall: boolean;
}

const SCREEN_W = Dimensions.get('window').width;
const COL_GAP = space.md;
const SIDE_PAD = space.xl;
const COL_W = (SCREEN_W - SIDE_PAD * 2 - COL_GAP) / 2;

const ALL = 'All';

export function GalleryScreen() {
  const navigation = useNavigation<any>();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState<string>(ALL);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await searchTours();
        if (mounted) setTours(data);
      } catch {
        if (mounted) setTours([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const hubs = useMemo(() => {
    const set: string[] = [ALL];
    tours.forEach((t) => {
      if (t.hub && !set.includes(t.hub)) set.push(t.hub);
    });
    return set;
  }, [tours]);

  // Flatten every tour photo into a gallery tile, deduped, linking back to its tour.
  const tiles = useMemo<Tile[]>(() => {
    const seen = new Set<string>();
    const out: Tile[] = [];
    let i = 0;
    for (const tour of tours) {
      if (hub !== ALL && tour.hub !== hub) continue;
      for (const uri of tour.photos ?? []) {
        if (!uri || seen.has(uri)) continue;
        seen.add(uri);
        out.push({
          uri,
          tourId: tour.id,
          title: tour.title,
          hub: tour.hub,
          tall: i % 3 === 0, // every third tile is taller
        });
        i += 1;
      }
    }
    return out;
  }, [tours, hub]);

  // Split into two balanced columns.
  const [colA, colB] = useMemo(() => {
    const a: Tile[] = [];
    const b: Tile[] = [];
    let ha = 0;
    let hb = 0;
    for (const tile of tiles) {
      const h = tile.tall ? 220 : 150;
      if (ha <= hb) {
        a.push(tile);
        ha += h;
      } else {
        b.push(tile);
        hb += h;
      }
    }
    return [a, b];
  }, [tiles]);

  const renderTile = useCallback(
    (tile: Tile, idx: number) => (
      <Pressable
        key={`${tile.tourId}-${idx}-${tile.uri}`}
        onPress={() => navigation.navigate('TourDetail', { tourId: tile.tourId })}
        style={({ pressed }) => [
          styles.tile,
          { height: tile.tall ? 220 : 150 },
          pressed && styles.tilePressed,
        ]}
      >
        <Image source={{ uri: tile.uri }} style={styles.tileImage} />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(2,18,8,0.85)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.tileCaption}>
          <AppText variant="caption" tone="primary" numberOfLines={2} style={styles.tileTitle}>
            {tile.title}
          </AppText>
          <View style={styles.tileHubRow}>
            <Ionicons name="location-sharp" size={10} color={colors.accent} />
            <AppText variant="caption" tone="secondary">
              {tile.hub}
            </AppText>
          </View>
        </View>
      </Pressable>
    ),
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Gallery"
        subtitle="Nepal through Saalik's tours"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hub filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {hubs.map((h) => (
              <Chip key={h} label={h} selected={hub === h} onPress={() => setHub(h)} />
            ))}
          </ScrollView>

          <View style={styles.grid}>
            <View style={styles.col}>{colA.map((t, i) => renderTile(t, i))}</View>
            <View style={styles.col}>{colB.map((t, i) => renderTile(t, i))}</View>
          </View>
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
    paddingHorizontal: SIDE_PAD,
    paddingBottom: space.huge,
  },
  filterRow: {
    gap: space.sm,
    paddingBottom: space.lg,
  },
  grid: {
    flexDirection: 'row',
    gap: COL_GAP,
  },
  col: {
    width: COL_W,
    gap: COL_GAP,
  },
  tile: {
    width: '100%',
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#0a3d1f',
    justifyContent: 'flex-end',
  },
  tilePressed: {
    opacity: 0.85,
  },
  tileImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  tileCaption: {
    padding: space.sm,
    gap: 2,
  },
  tileTitle: {
    fontWeight: '700',
  },
  tileHubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
