import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { GuideCard } from '@components/GuideCard';
import { ReviewCard } from '@components/ReviewCard';
import { colors, categoryColors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getTourById, formatDuration, formatRating, getDayName } from '../services/api';
import type { Tour, TourSchedule } from '@app-types/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function TourDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { tourId, tour: passedTour } = route.params;

    const [tour, setTour] = useState<Tour | null>(passedTour || null);
    const [loading, setLoading] = useState(!passedTour);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);

    useEffect(() => {
        if (!passedTour) {
            loadTour();
        } else {
            // Refresh to get full details including reviews
            loadTour();
        }
    }, [tourId]);

    const loadTour = async () => {
        try {
            const data = await getTourById(tourId);
            setTour(data);
        } catch (e) {
            console.error('Error loading tour:', e);
            Alert.alert('Error', 'Failed to load tour details');
        } finally {
            setLoading(false);
        }
    };

    const handleBookNow = () => {
        if (!tour) return;
        navigation.navigate('Booking', { tour });
    };

    const handleGuidePress = () => {
        if (!tour?.guide) return;
        navigation.navigate('GuideProfile', { guideId: tour.guide.id, guide: tour.guide });
    };

    const categoryColor = tour ? categoryColors[tour.category] || colors.primary : colors.primary;

    if (loading || !tour) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Photo Gallery */}
                <View style={styles.photoContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                            setActivePhotoIndex(index);
                        }}
                        scrollEventThrottle={16}
                    >
                        {tour.photos.map((photo, index) => (
                            <Image key={index} source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                        ))}
                    </ScrollView>

                    {/* Back Button */}
                    <SafeAreaView style={styles.backButtonContainer} edges={['top']}>
                        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </Pressable>
                    </SafeAreaView>

                    {/* Photo Indicators */}
                    <View style={styles.photoIndicators}>
                        {tour.photos.map((_, index) => (
                            <View
                                key={index}
                                style={[styles.indicator, index === activePhotoIndex && styles.indicatorActive]}
                            />
                        ))}
                    </View>

                    {/* Category Badge */}
                    <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                        <AppText style={styles.categoryText}>{tour.category}</AppText>
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Title & Free Badge */}
                    <View style={styles.titleRow}>
                        <View style={styles.freeBadge}>
                            <AppText style={styles.freeText}>FREE TOUR</AppText>
                        </View>
                    </View>
                    <AppText style={styles.title}>{tour.title}</AppText>

                    {/* Location */}
                    <View style={styles.row}>
                        <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                        <AppText style={styles.location}>{tour.hub}, Nepal</AppText>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Ionicons name="star" size={18} color={colors.star} />
                            <AppText style={styles.statValue}>{formatRating(tour.rating)}</AppText>
                            <AppText style={styles.statLabel}>({tour.totalReviews} reviews)</AppText>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Ionicons name="time-outline" size={18} color={colors.primary} />
                            <AppText style={styles.statValue}>{formatDuration(tour.duration)}</AppText>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Ionicons name="people-outline" size={18} color={colors.primary} />
                            <AppText style={styles.statValue}>Max {tour.maxGroupSize}</AppText>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <AppText style={styles.sectionTitle}>About This Tour</AppText>
                        <AppText style={styles.description}>{tour.description}</AppText>
                    </View>

                    {/* Highlights */}
                    <View style={styles.section}>
                        <AppText style={styles.sectionTitle}>Tour Highlights</AppText>
                        {tour.highlights.map((highlight, index) => (
                            <View key={index} style={styles.highlightRow}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.successLight} />
                                <AppText style={styles.highlightText}>{highlight}</AppText>
                            </View>
                        ))}
                    </View>

                    {/* Meeting Point */}
                    <View style={styles.section}>
                        <AppText style={styles.sectionTitle}>Meeting Point</AppText>
                        <View style={styles.meetingCard}>
                            <Ionicons name="location" size={24} color={colors.primary} />
                            <View style={styles.meetingInfo}>
                                <AppText style={styles.meetingText}>{tour.meetingPoint}</AppText>
                                {tour.hub && (
                                    <AppText style={styles.meetingSubtext}>{tour.hub}, Nepal</AppText>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Schedule */}
                    {tour.schedules && tour.schedules.length > 0 && (
                        <View style={styles.section}>
                            <AppText style={styles.sectionTitle}>Available Days</AppText>
                            <View style={styles.scheduleRow}>
                                {tour.schedules.map((schedule: TourSchedule, index: number) => (
                                    <View key={index} style={styles.scheduleChip}>
                                        <AppText style={styles.scheduleDay}>
                                            {schedule.dayOfWeek !== undefined && schedule.dayOfWeek !== null
                                                ? getDayName(schedule.dayOfWeek)
                                                : 'Special'}
                                        </AppText>
                                        <AppText style={styles.scheduleTime}>{schedule.startTime}</AppText>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* What's Included */}
                    <View style={styles.section}>
                        <View style={styles.includedGrid}>
                            <View style={styles.includedColumn}>
                                <AppText style={styles.includedTitle}>✓ Included</AppText>
                                {tour.included.map((item, index) => (
                                    <AppText key={index} style={styles.includedItem}>{item}</AppText>
                                ))}
                            </View>
                            <View style={styles.includedColumn}>
                                <AppText style={styles.notIncludedTitle}>✗ Not Included</AppText>
                                {tour.notIncluded.map((item, index) => (
                                    <AppText key={index} style={styles.notIncludedItem}>{item}</AppText>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Guide */}
                    <View style={styles.section}>
                        <AppText style={styles.sectionTitle}>Your Guide</AppText>
                        <GuideCard guide={tour.guide} onPress={handleGuidePress} compact />
                    </View>

                    {/* Reviews */}
                    {tour.reviews && tour.reviews.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <AppText style={styles.sectionTitle}>Reviews</AppText>
                                <AppText style={styles.seeAllText}>See all ({tour.totalReviews})</AppText>
                            </View>
                            {tour.reviews.slice(0, 3).map((review) => (
                                <ReviewCard key={review.id} review={review} />
                            ))}
                        </View>
                    )}

                    {/* Tip Info */}
                    <View style={styles.tipInfoCard}>
                        <Ionicons name="heart" size={24} color={colors.accent} />
                        <View style={styles.tipInfoContent}>
                            <AppText style={styles.tipInfoTitle}>Pay What You Want</AppText>
                            <AppText style={styles.tipInfoText}>
                                This is a free tour! At the end, tip your guide based on your experience.
                                Most travelers tip $10-20 per person.
                            </AppText>
                        </View>
                    </View>

                    {/* Spacer for button */}
                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* Book Now Button */}
            <SafeAreaView style={styles.bookingBar} edges={['bottom']}>
                <View style={styles.priceInfo}>
                    <AppText style={styles.priceLabel}>Price</AppText>
                    <AppText style={styles.priceValue}>FREE</AppText>
                    <AppText style={styles.tipNote}>Tips welcome</AppText>
                </View>
                <Pressable style={styles.bookButton} onPress={handleBookNow}>
                    <AppText style={styles.bookButtonText}>Book Now</AppText>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                </Pressable>
            </SafeAreaView>
        </View>
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
    },
    scrollContent: {
        paddingBottom: 0,
    },

    // Photos
    photoContainer: {
        height: 300,
        position: 'relative',
    },
    photo: {
        width: SCREEN_WIDTH,
        height: 300,
    },
    backButtonContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
        marginTop: 8,
    },
    photoIndicators: {
        position: 'absolute',
        bottom: 16,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    indicatorActive: {
        backgroundColor: '#fff',
        width: 20,
    },
    categoryBadge: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    categoryText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Content
    content: {
        padding: 20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    freeBadge: {
        backgroundColor: colors.successLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    freeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: colors.textPrimary,
        lineHeight: 32,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    location: {
        fontSize: 15,
        color: colors.textSecondary,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    stat: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border,
    },

    // Sections
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    seeAllText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
    },
    description: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 24,
    },

    // Highlights
    highlightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    highlightText: {
        flex: 1,
        fontSize: 14,
        color: colors.textPrimary,
        lineHeight: 20,
    },

    // Meeting Point
    meetingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    meetingInfo: {
        flex: 1,
    },
    meetingText: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    meetingSubtext: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },

    // Schedule
    scheduleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    scheduleChip: {
        backgroundColor: colors.card,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    scheduleDay: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    scheduleTime: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },

    // Included
    includedGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    includedColumn: {
        flex: 1,
    },
    includedTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.successLight,
        marginBottom: 8,
    },
    notIncludedTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    includedItem: {
        fontSize: 13,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    notIncludedItem: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 4,
    },

    // Tip Info
    tipInfoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: `${colors.accent}10`,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: `${colors.accent}30`,
        marginTop: 8,
    },
    tipInfoContent: {
        flex: 1,
    },
    tipInfoTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.accent,
        marginBottom: 4,
    },
    tipInfoText: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 19,
    },

    // Booking Bar
    bookingBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    priceInfo: {
        gap: 0,
    },
    priceLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    priceValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.successLight,
    },
    tipNote: {
        fontSize: 11,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    bookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 12,
    },
    bookButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
