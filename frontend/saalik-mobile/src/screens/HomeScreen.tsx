import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '@components/AppText';
import { TourCard } from '@components/TourCard';
import { Chip } from '@components/Chip';
import { SectionHeader } from '@components/SectionHeader';
import { EmptyState } from '@components/EmptyState';
import { colors, categoryColors, categoryIcons } from '@theme/colors';
import { radii, shadows, space, rhythm } from '@theme';
import { useAuthState } from '@context/AuthContext';
import { getCategories, getFeaturedTours, searchTours } from '../services/api';
import type { CategoryMeta, Tour, TourCategory } from '@app-types/api';

const heroImage = require('../../assets/bgsaalik.jpg');

const HUBS = [
  { name: 'Kathmandu', tagline: 'Capital of temples', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/View_of_Kathmandu_from_Swayambhunath_2%2C_Nepal.jpg?width=600' },
  { name: 'Tokha', tagline: 'Chaku & old Newar town', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chandeshwori_Temple_Tokha_Tokha_Municipility_Kathmandu_Nepal_Rajesh_Dhungana_%2815%29.jpg?width=600' },
  { name: 'Pokhara', tagline: 'Lakeside Himalayas', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600' },
  { name: 'Bhaktapur', tagline: 'Living museum', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/View_of_Bhaktapur_Durbar_Square.jpg?width=600' },
  { name: 'Patan', tagline: 'City of artisans', image: 'https://images.unsplash.com/photo-1585016495481-91613a3ab1bc?w=600' },
];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthState();

  const [searchQuery, setSearchQuery] = useState('');
  const [featuredTours, setFeaturedTours] = useState<Tour[]>([]);
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<CategoryMeta[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TourCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [featured, tours, cats] = await Promise.all([
        getFeaturedTours(),
        searchTours(selectedCategory ? { category: selectedCategory } : undefined),
        getCategories(),
      ]);
      setFeaturedTours(featured);
      setAllTours(tours);
      setCategories(cats);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSearch = () => {
    if (searchQuery.trim()) navigation.navigate('Search', { query: searchQuery });
  };

  const handleTourPress = (tour: Tour) => {
    navigation.navigate('TourDetail', { tourId: tour.id, tour });
  };

  const handleHubPress = (hubName: string) => {
    navigation.navigate('Search', { hub: hubName });
  };

  const handleCategoryPress = (category: TourCategory) => {
    setSelectedCategory((current) => (current === category ? null : category));
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const firstName = user?.name?.split(' ')[0] ?? 'Traveler';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="bodySm" tone="secondary" style={styles.loadingText}>
          Discovering tours...
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            progressViewOffset={120}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={heroImage} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(2,18,8,0.45)', 'rgba(2,18,8,0.85)', colors.background]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView edges={['top']}>
            <View style={styles.heroContent}>
              <AppText variant="overline" tone="accent">
                {greeting}, {firstName}
              </AppText>
              <AppText variant="h1" tone="primary" style={styles.heroTitle}>
                Where will Nepal take you today?
              </AppText>
              <AppText variant="body" tone="secondary" style={styles.heroSubtitle}>
                Free walking tours led by passionate locals.{'\n'}Pay what the experience is worth.
              </AppText>
            </View>
          </SafeAreaView>

          {/* Floating search bar — overlaps the hero edge */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tours, cities, or guides"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={[styles.section, styles.firstSection]}>
          <SectionHeader
            eyebrow="Filter"
            title="Browse by interest"
            subtitle="Tap to filter the tours below"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <Chip
              label="All"
              selected={selectedCategory === null}
              onPress={() => setSelectedCategory(null)}
              icon="apps-outline"
            />
            {categories.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                selected={selectedCategory === c.key}
                onPress={() => handleCategoryPress(c.key)}
                icon={categoryIcons[c.key] as any}
                selectedBg={categoryColors[c.key]}
              />
            ))}
          </ScrollView>
        </View>

        {/* Hubs */}
        <View style={styles.section}>
          <SectionHeader
            title="Popular hubs"
            actionLabel="See all"
            onActionPress={() => navigation.navigate('Search', {})}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hubsRow}
          >
            {HUBS.map((hub) => (
              <Pressable
                key={hub.name}
                onPress={() => handleHubPress(hub.name)}
                style={({ pressed }) => [styles.hubCard, pressed && styles.hubCardPressed]}
              >
                <Image source={{ uri: hub.image }} style={StyleSheet.absoluteFillObject} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.05)', 'rgba(2,18,8,0.95)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.hubContent}>
                  <AppText variant="h3" tone="primary">
                    {hub.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {hub.tagline}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Featured */}
        {featuredTours.length > 0 && !selectedCategory && (
          <View style={styles.section}>
            <SectionHeader
              eyebrow="Editor's picks"
              title="Featured tours"
              actionLabel="Gallery"
              onActionPress={() => navigation.navigate('Gallery')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
            >
              {featuredTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} onPress={() => handleTourPress(tour)} compact />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tours grid */}
        <View style={styles.section}>
          <SectionHeader
            title={selectedCategory ? `${categoryLabel(categories, selectedCategory)} tours` : 'All tours'}
            subtitle={
              allTours.length > 0
                ? `${allTours.length} ${allTours.length === 1 ? 'tour' : 'tours'} ready to explore`
                : undefined
            }
          />
          {allTours.length > 0 ? (
            <View style={styles.toursList}>
              {allTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} onPress={() => handleTourPress(tour)} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="compass-outline"
              title="No tours yet"
              body="Try a different category or check back soon — new tours land every week."
              actionLabel="Clear filters"
              onActionPress={() => setSelectedCategory(null)}
            />
          )}
        </View>

        <View style={{ height: space.xxxl }} />
      </ScrollView>

      {/* AI FAB */}
      <Pressable
        style={({ pressed }) => [styles.aiFab, pressed && styles.aiFabPressed]}
        onPress={() => navigation.navigate('AIChat')}
      >
        <Ionicons name="sparkles" size={22} color="#021007" />
      </Pressable>
    </View>
  );
}

function categoryLabel(cats: CategoryMeta[], key: TourCategory): string {
  return cats.find((c) => c.key === key)?.label ?? String(key);
}

const HERO_HEIGHT = 320;

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
    gap: space.md,
  },
  loadingText: {
    marginTop: space.sm,
  },
  scrollContent: {
    paddingBottom: space.xxxl,
  },

  // Hero
  hero: {
    minHeight: HERO_HEIGHT,
    paddingBottom: space.xxxl,
  },
  heroContent: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    gap: space.sm,
  },
  heroTitle: {
    marginTop: space.xs,
  },
  heroSubtitle: {
    marginTop: space.xs,
    maxWidth: 320,
  },
  searchWrap: {
    position: 'absolute',
    bottom: -28,
    left: space.xl,
    right: space.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    gap: space.md,
    borderWidth: 1,
    borderColor: 'rgba(21, 255, 117, 0.18)',
    ...shadows.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: 'LeagueSpartan_400Regular',
  },

  // Sections
  section: {
    marginTop: rhythm.betweenSections,
    paddingHorizontal: space.xl,
  },
  // The first section sits below the floating search bar, which overhangs the
  // hero by ~28px. Extra top margin keeps the "Filter" header clear of it.
  firstSection: {
    marginTop: space.jumbo,
  },

  // Chips row
  chipsRow: {
    gap: space.sm,
    paddingRight: space.xl,
  },

  // Hubs
  hubsRow: {
    gap: space.md,
    paddingRight: space.xl,
  },
  hubCard: {
    width: 170,
    height: 200,
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#0a3d1f',
  },
  hubCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  hubContent: {
    padding: space.md,
    gap: 2,
  },

  // Featured
  featuredRow: {
    paddingRight: space.xl,
  },

  // Tours list
  toursList: {
    gap: space.xs,
  },

  // FAB
  aiFab: {
    position: 'absolute',
    bottom: space.xl,
    right: space.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  aiFabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.94 }],
  },
});
