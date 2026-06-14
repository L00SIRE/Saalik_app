import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '@components/AppText';
import { Tag } from '@components/Tag';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';
import { useCheckpoints, type Checkpoint, type CheckpointCategory } from '../services/checkpoints';

const CATEGORY_ICON: Record<CheckpointCategory, keyof typeof Ionicons.glyphMap> = {
  Temple: 'business-outline',
  Square: 'grid-outline',
  Stupa: 'ellipse-outline',
  Nature: 'leaf-outline',
  Market: 'basket-outline',
  Craft: 'hammer-outline',
  Viewpoint: 'eye-outline',
};

export function CheckpointsScreen() {
  const navigation = useNavigation<any>();
  const { checkpoints, areas, isVisited, toggle, clearAll, visitedCount, total } = useCheckpoints();

  const byArea = useMemo(() => {
    const groups: Record<string, Checkpoint[]> = {};
    for (const area of areas) groups[area] = [];
    for (const cp of checkpoints) groups[cp.area].push(cp);
    return groups;
  }, [checkpoints, areas]);

  const pct = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Places to visit"
        subtitle="Tick off the valley's hotspots as you go"
        right={
          visitedCount > 0 ? (
            <Pressable onPress={clearAll} hitSlop={8}>
              <AppText variant="caption" tone="accent">
                Reset
              </AppText>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress banner */}
        <View style={styles.progressCard}>
          <LinearGradient
            colors={['rgba(21, 255, 117, 0.16)', 'rgba(21, 255, 117, 0.02)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.progressTop}>
            <View style={styles.progressIconRing}>
              <Ionicons name="map" size={20} color={colors.accent} />
            </View>
            <View style={styles.progressText}>
              <AppText variant="h3">
                {visitedCount} of {total} visited
              </AppText>
              <AppText variant="bodySm" tone="secondary">
                {visitedCount === 0
                  ? 'Tap a pin’s circle to mark it visited'
                  : visitedCount === total
                    ? 'You’ve seen them all — incredible!'
                    : `${pct}% of the valley explored`}
              </AppText>
            </View>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {areas.map((area) => {
          const list = byArea[area];
          const doneInArea = list.filter((c) => isVisited(c.id)).length;
          return (
            <View key={area} style={styles.areaBlock}>
              <View style={styles.areaHeader}>
                <Ionicons name="location-sharp" size={14} color={colors.accent} />
                <AppText variant="overline" tone="muted" style={styles.areaTitle}>
                  {area}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {doneInArea}/{list.length}
                </AppText>
              </View>

              {list.map((cp) => {
                const visited = isVisited(cp.id);
                return (
                  <Pressable
                    key={cp.id}
                    onPress={() =>
                      cp.tourId && navigation.navigate('TourDetail', { tourId: cp.tourId })
                    }
                    style={({ pressed }) => [
                      styles.pin,
                      visited && styles.pinVisited,
                      pressed && styles.pinPressed,
                    ]}
                  >
                    <View style={styles.pinImageWrap}>
                      <Image source={{ uri: cp.image }} style={styles.pinImage} />
                      {visited && (
                        <View style={styles.visitedOverlay}>
                          <Ionicons name="checkmark-circle" size={26} color={colors.accent} />
                        </View>
                      )}
                    </View>

                    <View style={styles.pinBody}>
                      <View style={styles.pinTitleRow}>
                        <Ionicons
                          name={CATEGORY_ICON[cp.category]}
                          size={13}
                          color={colors.textSecondary}
                        />
                        <AppText variant="label" numberOfLines={1} style={styles.pinName}>
                          {cp.name}
                        </AppText>
                      </View>
                      <AppText variant="caption" tone="muted" numberOfLines={2}>
                        {cp.blurb}
                      </AppText>
                      <View style={styles.pinMetaRow}>
                        {cp.unesco && <Tag label="UNESCO" tone="accent" size="sm" />}
                        {cp.tourId && (
                          <View style={styles.tourLink}>
                            <Ionicons name="walk" size={11} color={colors.accent} />
                            <AppText variant="caption" tone="accent">
                              tour available
                            </AppText>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Visited check toggle */}
                    <Pressable
                      onPress={() => toggle(cp.id)}
                      hitSlop={10}
                      style={({ pressed }) => [
                        styles.checkBtn,
                        visited && styles.checkBtnOn,
                        pressed && styles.pinPressed,
                      ]}
                    >
                      <Ionicons
                        name={visited ? 'checkmark' : 'ellipse-outline'}
                        size={visited ? 20 : 22}
                        color={visited ? '#021007' : colors.textMuted}
                      />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        <AppText variant="caption" tone="muted" align="center" style={styles.footnote}>
          Your visited pins are saved on this device.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
  },

  // Progress banner
  progressCard: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(21, 255, 117, 0.18)',
    padding: space.lg,
    marginBottom: space.xl,
    gap: space.md,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  progressIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(21, 255, 117, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    flex: 1,
    gap: 2,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },

  // Area grouping
  areaBlock: {
    marginBottom: space.lg,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.sm,
    marginLeft: space.xs,
  },
  areaTitle: {
    flex: 1,
  },

  // Pin row
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: space.sm,
    marginBottom: space.sm,
  },
  pinVisited: {
    borderColor: 'rgba(21, 255, 117, 0.4)',
  },
  pinPressed: {
    opacity: 0.7,
  },
  pinImageWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  pinImage: {
    width: '100%',
    height: '100%',
  },
  visitedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 18, 8, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBody: {
    flex: 1,
    gap: 3,
  },
  pinTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pinName: {
    flex: 1,
  },
  pinMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: 2,
  },
  tourLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  checkBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkBtnOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  footnote: {
    marginTop: space.md,
  },
});
