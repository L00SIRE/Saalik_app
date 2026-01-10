import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Pressable,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { TourCard } from '@components/TourCard';
import { colors, categoryColors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { searchTours, getCategories } from '../services/api';
import type { Tour, TourCategory, CategoryMeta } from '@app-types/api';

export function SearchScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { query: initialQuery, hub: initialHub, category: initialCategory } = route.params || {};

    const [searchQuery, setSearchQuery] = useState(initialQuery || '');
    const [selectedHub, setSelectedHub] = useState<string | null>(initialHub || null);
    const [selectedCategory, setSelectedCategory] = useState<TourCategory | null>(initialCategory || null);
    const [tours, setTours] = useState<Tour[]>([]);
    const [categories, setCategories] = useState<CategoryMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    const HUBS = ['Kathmandu', 'Pokhara', 'Bhaktapur', 'Patan'];

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        performSearch();
    }, [selectedHub, selectedCategory]);

    const loadCategories = async () => {
        const cats = await getCategories();
        setCategories(cats);
    };

    const performSearch = async () => {
        setLoading(true);
        try {
            const results = await searchTours({
                hub: selectedHub || undefined,
                category: selectedCategory || undefined,
            });

            // Filter by search query if present
            let filtered = results;
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                filtered = results.filter(
                    t => t.title.toLowerCase().includes(query) ||
                        t.description.toLowerCase().includes(query) ||
                        t.hub.toLowerCase().includes(query)
                );
            }

            setTours(filtered);
        } catch (e) {
            console.error('Search failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        performSearch();
    };

    const handleTourPress = (tour: Tour) => {
        navigation.navigate('TourDetail', { tourId: tour.id, tour });
    };

    const clearFilters = () => {
        setSelectedHub(null);
        setSelectedCategory(null);
        setSearchQuery('');
    };

    const hasActiveFilters = selectedHub || selectedCategory || searchQuery;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>

                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search tours..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                    )}
                </View>

                <Pressable
                    style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Ionicons
                        name="options-outline"
                        size={22}
                        color={showFilters ? colors.primary : colors.textSecondary}
                    />
                </Pressable>
            </View>

            {/* Filters */}
            {showFilters && (
                <View style={styles.filtersContainer}>
                    {/* Hub Filter */}
                    <AppText style={styles.filterLabel}>Location</AppText>
                    <View style={styles.filterChips}>
                        {HUBS.map((hub) => (
                            <Pressable
                                key={hub}
                                style={[styles.filterChip, selectedHub === hub && styles.filterChipActive]}
                                onPress={() => setSelectedHub(selectedHub === hub ? null : hub)}
                            >
                                <AppText style={[styles.filterChipText, selectedHub === hub && styles.filterChipTextActive]}>
                                    {hub}
                                </AppText>
                            </Pressable>
                        ))}
                    </View>

                    {/* Category Filter */}
                    <AppText style={styles.filterLabel}>Category</AppText>
                    <View style={styles.filterChips}>
                        {categories.map((cat) => (
                            <Pressable
                                key={cat.key}
                                style={[
                                    styles.filterChip,
                                    selectedCategory === cat.key && { backgroundColor: categoryColors[cat.key] },
                                ]}
                                onPress={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                            >
                                <AppText
                                    style={[styles.filterChipText, selectedCategory === cat.key && styles.filterChipTextActive]}
                                >
                                    {cat.label}
                                </AppText>
                            </Pressable>
                        ))}
                    </View>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <Pressable style={styles.clearButton} onPress={clearFilters}>
                            <Ionicons name="close" size={16} color={colors.error} />
                            <AppText style={styles.clearText}>Clear Filters</AppText>
                        </Pressable>
                    )}
                </View>
            )}

            {/* Active Filters Bar */}
            {hasActiveFilters && !showFilters && (
                <View style={styles.activeFiltersBar}>
                    {selectedHub && (
                        <View style={styles.activeFilter}>
                            <AppText style={styles.activeFilterText}>{selectedHub}</AppText>
                            <Pressable onPress={() => setSelectedHub(null)}>
                                <Ionicons name="close" size={14} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                    )}
                    {selectedCategory && (
                        <View style={[styles.activeFilter, { backgroundColor: `${categoryColors[selectedCategory]}20` }]}>
                            <AppText style={[styles.activeFilterText, { color: categoryColors[selectedCategory] }]}>
                                {selectedCategory}
                            </AppText>
                            <Pressable onPress={() => setSelectedCategory(null)}>
                                <Ionicons name="close" size={14} color={categoryColors[selectedCategory]} />
                            </Pressable>
                        </View>
                    )}
                </View>
            )}

            {/* Results */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <AppText style={styles.loadingText}>Searching tours...</AppText>
                </View>
            ) : (
                <FlatList
                    data={tours}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <TourCard tour={item} onPress={() => handleTourPress(item)} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <AppText style={styles.resultsCount}>
                            {tours.length} tour{tours.length !== 1 ? 's' : ''} found
                        </AppText>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="compass-outline" size={64} color={colors.textMuted} />
                            <AppText style={styles.emptyTitle}>No tours found</AppText>
                            <AppText style={styles.emptyText}>Try adjusting your filters or search terms</AppText>
                            <Pressable style={styles.emptyButton} onPress={clearFilters}>
                                <AppText style={styles.emptyButtonText}>Clear Filters</AppText>
                            </Pressable>
                        </View>
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
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: colors.textPrimary,
    },
    filterButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: colors.inputBg,
    },
    filterButtonActive: {
        backgroundColor: `${colors.primary}15`,
    },

    // Filters
    filtersContainer: {
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    filterLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
        marginTop: 8,
    },
    filterChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.inputBg,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
    },
    filterChipText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    filterChipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    clearText: {
        fontSize: 13,
        color: colors.error,
    },

    // Active Filters Bar
    activeFiltersBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    activeFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: colors.inputBg,
    },
    activeFilterText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    // Loading
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    // List
    listContent: {
        padding: 16,
    },
    resultsCount: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    emptyButton: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: colors.primary,
        borderRadius: 8,
    },
    emptyButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
});
