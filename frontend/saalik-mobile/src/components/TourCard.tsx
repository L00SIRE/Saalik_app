import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { AppText } from './AppText';
import { colors, categoryColors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import type { Tour } from '@app-types/api';
import { formatDuration, formatRating } from '../services/api';

interface TourCardProps {
    tour: Tour;
    onPress: () => void;
    compact?: boolean;
}

export function TourCard({ tour, onPress, compact = false }: TourCardProps) {
    const categoryColor = categoryColors[tour.category] || colors.primary;

    if (compact) {
        return (
            <Pressable style={styles.compactCard} onPress={onPress}>
                <Image
                    source={{ uri: tour.photos[0] }}
                    style={styles.compactImage}
                    resizeMode="cover"
                />
                <View style={styles.compactContent}>
                    <AppText style={styles.compactTitle} numberOfLines={2}>{tour.title}</AppText>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color={colors.star} />
                        <AppText style={styles.ratingText}>{formatRating(tour.rating)}</AppText>
                        <AppText style={styles.reviewCount}>({tour.totalReviews})</AppText>
                    </View>
                    <AppText style={styles.compactDuration}>{formatDuration(tour.duration)}</AppText>
                </View>
            </Pressable>
        );
    }

    return (
        <Pressable style={styles.card} onPress={onPress}>
            <Image
                source={{ uri: tour.photos[0] }}
                style={styles.image}
                resizeMode="cover"
            />

            {/* Category Badge */}
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                <AppText style={styles.categoryText}>{tour.category}</AppText>
            </View>

            <View style={styles.content}>
                {/* Title */}
                <AppText style={styles.title} numberOfLines={2}>{tour.title}</AppText>

                {/* Location */}
                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <AppText style={styles.location}>{tour.hub}</AppText>
                </View>

                {/* Rating & Duration */}
                <View style={styles.infoRow}>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color={colors.star} />
                        <AppText style={styles.ratingText}>{formatRating(tour.rating)}</AppText>
                        <AppText style={styles.reviewCount}>({tour.totalReviews} reviews)</AppText>
                    </View>
                    <View style={styles.durationRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <AppText style={styles.duration}>{formatDuration(tour.duration)}</AppText>
                    </View>
                </View>

                {/* Guide Info */}
                <View style={styles.guideRow}>
                    {tour.guide?.user?.avatar ? (
                        <Image source={{ uri: tour.guide.user.avatar }} style={styles.guideAvatar} />
                    ) : (
                        <View style={[styles.guideAvatar, styles.guideAvatarPlaceholder]}>
                            <Ionicons name="person" size={12} color={colors.textMuted} />
                        </View>
                    )}
                    <AppText style={styles.guideName}>{tour.guide?.user?.name || 'Local Guide'}</AppText>
                    {tour.guide?.isVerified && (
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    )}
                </View>

                {/* Free Badge */}
                <View style={styles.freeRow}>
                    <View style={styles.freeBadge}>
                        <AppText style={styles.freeText}>FREE TOUR</AppText>
                    </View>
                    <AppText style={styles.tipText}>Tips welcome</AppText>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 16,
    },
    image: {
        width: '100%',
        height: 180,
    },
    categoryBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    content: {
        padding: 16,
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        lineHeight: 24,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    location: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    reviewCount: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    duration: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    guideRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    guideAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    guideAvatarPlaceholder: {
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guideName: {
        fontSize: 13,
        color: colors.textSecondary,
        flex: 1,
    },
    freeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    freeBadge: {
        backgroundColor: colors.successLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    freeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    tipText: {
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
    },

    // Compact styles
    compactCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        width: 160,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    compactImage: {
        width: '100%',
        height: 100,
    },
    compactContent: {
        padding: 10,
        gap: 4,
    },
    compactTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        lineHeight: 18,
    },
    compactDuration: {
        fontSize: 11,
        color: colors.textMuted,
    },
});
