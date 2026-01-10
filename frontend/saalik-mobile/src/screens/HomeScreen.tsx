import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Image,
    RefreshControl,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { TourCard } from '@components/TourCard';
import { colors, categoryColors, categoryIcons } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFeaturedTours, searchTours, getCategories } from '../services/api';
import type { Tour, CategoryMeta, TourCategory } from '@app-types/api';

// Hero background
const heroImage = require('../../assets/bgsaalik.jpg');

// Nepali cities/hubs
const HUBS = [
    { name: 'Kathmandu', image: 'https://images.unsplash.com/photo-1582654454409-778d91d845a0?w=400' },
    { name: 'Pokhara', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400' },
    { name: 'Bhaktapur', image: 'https://images.unsplash.com/photo-1609766857326-18a204797d22?w=400' },
    { name: 'Patan', image: 'https://images.unsplash.com/photo-1585016495481-91613a3ab1bc?w=400' },
];

export function HomeScreen() {
    const navigation = useNavigation<any>();
    const [searchQuery, setSearchQuery] = useState('');
    const [featuredTours, setFeaturedTours] = useState<Tour[]>([]);
    const [allTours, setAllTours] = useState<Tour[]>([]);
    const [categories, setCategories] = useState<CategoryMeta[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<TourCategory | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
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
        loadData();
    }, [selectedCategory]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            navigation.navigate('Search', { query: searchQuery });
        }
    };

    const handleTourPress = (tour: Tour) => {
        navigation.navigate('TourDetail', { tourId: tour.id, tour });
    };

    const handleHubPress = (hubName: string) => {
        navigation.navigate('Search', { hub: hubName });
    };

    const handleCategoryPress = (category: TourCategory) => {
        if (selectedCategory === category) {
            setSelectedCategory(null);
        } else {
            setSelectedCategory(category);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <AppText style={styles.loadingText}>Discovering tours...</AppText>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Hero Section */}
                <View style={styles.hero}>
                    <Image source={heroImage} style={styles.heroImage} resizeMode="cover" />
                    <View style={styles.heroOverlay}>
                        <AppText style={styles.heroLogo}>SAALIK</AppText>
                        <AppText style={styles.heroTagline}>Free Walking Tours in Nepal</AppText>
                        <AppText style={styles.heroSubtitle}>
                            Discover authentic experiences with passionate local guides
                        </AppText>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Where do you want to explore?"
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
                </View>

                {/* Categories */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>Browse by Category</AppText>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesScroll}
                    >
                        {categories.map((category) => {
                            const isSelected = selectedCategory === category.key;
                            const iconName = categoryIcons[category.key] || 'help-circle';
                            const bgColor = isSelected ? categoryColors[category.key] : colors.inputBg;

                            return (
                                <Pressable
                                    key={category.key}
                                    style={[styles.categoryPill, { backgroundColor: bgColor }]}
                                    onPress={() => handleCategoryPress(category.key)}
                                >
                                    <Ionicons
                                        name={iconName as any}
                                        size={16}
                                        color={isSelected ? '#fff' : colors.textSecondary}
                                    />
                                    <AppText style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                                        {category.label}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Popular Destinations */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>Popular Destinations</AppText>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.hubsScroll}
                    >
                        {HUBS.map((hub) => (
                            <Pressable key={hub.name} style={styles.hubCard} onPress={() => handleHubPress(hub.name)}>
                                <Image source={{ uri: hub.image }} style={styles.hubImage} resizeMode="cover" />
                                <View style={styles.hubOverlay}>
                                    <AppText style={styles.hubName}>{hub.name}</AppText>
                                </View>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Featured Tours */}
                {featuredTours.length > 0 && !selectedCategory && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <AppText style={styles.sectionTitle}>Featured Tours</AppText>
                            <Pressable onPress={() => navigation.navigate('Search', {})}>
                                <AppText style={styles.seeAllText}>See All</AppText>
                            </Pressable>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.featuredScroll}
                        >
                            {featuredTours.map((tour) => (
                                <TourCard key={tour.id} tour={tour} onPress={() => handleTourPress(tour)} compact />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* All Tours (or filtered by category) */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>
                        {selectedCategory ? `${selectedCategory} Tours` : 'All Tours'}
                    </AppText>
                    <View style={styles.toursGrid}>
                        {allTours.map((tour) => (
                            <TourCard key={tour.id} tour={tour} onPress={() => handleTourPress(tour)} />
                        ))}
                    </View>

                    {allTours.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="compass-outline" size={48} color={colors.textMuted} />
                            <AppText style={styles.emptyText}>No tours found</AppText>
                            <AppText style={styles.emptySubtext}>Try a different category or destination</AppText>
                        </View>
                    )}
                </View>

                {/* Bottom Padding */}
                <View style={{ height: 20 }} />
            </ScrollView>

            {/* AI Chat FAB */}
            <Pressable
                style={styles.aiFab}
                onPress={() => navigation.navigate('AIChat')}
            >
                <Ionicons name="sparkles" size={24} color="#021007" />
            </Pressable>
        </SafeAreaView>
    );
}

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
        gap: 12,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    scrollContent: {
        paddingBottom: 20,
    },

    // Hero
    hero: {
        height: 220,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    heroLogo: {
        fontSize: 36,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 6,
    },
    heroTagline: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.accent,
        marginTop: 4,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 280,
    },

    // Search
    searchContainer: {
        paddingHorizontal: 16,
        marginTop: -24,
        zIndex: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: colors.textPrimary,
    },

    // Sections
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    seeAllText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
    },

    // Categories
    categoriesScroll: {
        paddingRight: 16,
        gap: 10,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        marginRight: 10,
    },
    categoryText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    categoryTextActive: {
        color: '#fff',
    },

    // Hubs
    hubsScroll: {
        paddingRight: 16,
    },
    hubCard: {
        width: 140,
        height: 100,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 12,
    },
    hubImage: {
        width: '100%',
        height: '100%',
    },
    hubOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hubName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    // Featured
    featuredScroll: {
        paddingRight: 16,
    },

    // Tours Grid
    toursGrid: {
        gap: 0,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textMuted,
    },

    // AI FAB
    aiFab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
});
