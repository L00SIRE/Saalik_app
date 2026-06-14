import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppText } from '@components/AppText';
import { TourCard } from '@components/TourCard';
import { Chip } from '@components/Chip';
import { EmptyState } from '@components/EmptyState';
import { IconButton } from '@components/IconButton';
import { Tag } from '@components/Tag';
import { colors, categoryColors, categoryIcons } from '@theme/colors';
import { radii, space } from '@theme';
import { getCategories, searchTours } from '../services/api';
import type { CategoryMeta, Tour, TourCategory } from '@app-types/api';

const HUBS = ['Kathmandu', 'Pokhara', 'Bhaktapur', 'Patan'];

export function SearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { query: initialQuery, hub: initialHub, category: initialCategory } = route.params || {};

  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [selectedHub, setSelectedHub] = useState<string | null>(initialHub || null);
  const [selectedCategory, setSelectedCategory] = useState<TourCategory | null>(
    initialCategory || null,
  );
  const [tours, setTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<CategoryMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      setCategories(await getCategories());
    })();
  }, []);

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHub, selectedCategory]);

  const runSearch = async () => {
    setLoading(true);
    try {
      const results = await searchTours({
        hub: selectedHub || undefined,
        category: selectedCategory || undefined,
      });
      let filtered = results;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = results.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.hub.toLowerCase().includes(q),
        );
      }
      setTours(filtered);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setSelectedHub(null);
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const hasActiveFilters = !!(selectedHub || selectedCategory || searchQuery);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tours, cities, or guides"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
            autoFocus={!initialHub && !initialCategory}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <IconButton
          icon={showFilters ? 'options' : 'options-outline'}
          onPress={() => setShowFilters((s) => !s)}
          color={showFilters ? colors.accent : colors.textPrimary}
          background={showFilters ? 'rgba(21, 255, 117, 0.12)' : undefined}
        />
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <AppText variant="overline" tone="muted">
            Location
          </AppText>
          <View style={styles.chipsRow}>
            {HUBS.map((hub) => (
              <Chip
                key={hub}
                label={hub}
                selected={selectedHub === hub}
                onPress={() => setSelectedHub(selectedHub === hub ? null : hub)}
              />
            ))}
          </View>

          <AppText variant="overline" tone="muted" style={styles.filterSpacer}>
            Category
          </AppText>
          <View style={styles.chipsRow}>
            {categories.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                icon={categoryIcons[c.key] as any}
                selected={selectedCategory === c.key}
                onPress={() =>
                  setSelectedCategory(selectedCategory === c.key ? null : c.key)
                }
                selectedBg={categoryColors[c.key]}
              />
            ))}
          </View>

          {hasActiveFilters && (
            <Pressable onPress={clearAll} style={styles.clearAll} hitSlop={6}>
              <Ionicons name="close-circle" size={14} color={colors.error} />
              <AppText variant="label" tone="error">
                Clear all filters
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      {/* Active filter pills */}
      {hasActiveFilters && !showFilters && (
        <View style={styles.activeBar}>
          {selectedHub && (
            <Pressable onPress={() => setSelectedHub(null)}>
              <Tag label={selectedHub} icon="close" tone="neutral" />
            </Pressable>
          )}
          {selectedCategory && (
            <Pressable onPress={() => setSelectedCategory(null)}>
              <Tag
                label={selectedCategory}
                icon="close"
                tone="custom"
                bg={`${categoryColors[selectedCategory]}26`}
                fg={categoryColors[selectedCategory]}
              />
            </Pressable>
          )}
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <AppText variant="bodySm" tone="secondary" style={styles.loadingText}>
            Searching tours...
          </AppText>
        </View>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TourCard
              tour={item}
              onPress={() =>
                navigation.navigate('TourDetail', { tourId: item.id, tour: item })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <AppText variant="bodySm" tone="secondary" style={styles.resultsCount}>
              {tours.length} {tours.length === 1 ? 'tour' : 'tours'} found
            </AppText>
          }
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No tours match"
              body="Try fewer filters or a different search term."
              actionLabel="Clear filters"
              onActionPress={clearAll}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.lg,
    gap: space.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: 'LeagueSpartan_400Regular',
  },

  // Filters
  filtersPanel: {
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
    gap: space.sm,
  },
  filterSpacer: {
    marginTop: space.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  clearAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: space.md,
    alignSelf: 'flex-start',
  },

  activeBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
    gap: space.sm,
  },

  // List
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  loadingText: {
    marginTop: space.sm,
  },
  listContent: {
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
    flexGrow: 1,
  },
  resultsCount: {
    marginBottom: space.md,
  },
});
