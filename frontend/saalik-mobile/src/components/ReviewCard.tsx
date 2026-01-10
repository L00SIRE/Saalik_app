import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { AppText } from './AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import type { Review } from '@app-types/api';

interface ReviewCardProps {
    review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return date.toLocaleDateString();
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Ionicons
                key={i}
                name={i < rating ? 'star' : 'star-outline'}
                size={14}
                color={i < rating ? colors.star : colors.starEmpty}
            />
        ));
    };

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                {review.user.avatar ? (
                    <Image source={{ uri: review.user.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <AppText style={styles.avatarInitial}>
                            {review.user.name.charAt(0).toUpperCase()}
                        </AppText>
                    </View>
                )}

                <View style={styles.headerInfo}>
                    <AppText style={styles.userName}>{review.user.name}</AppText>
                    <View style={styles.ratingRow}>
                        {renderStars(review.rating)}
                        <AppText style={styles.date}>{formatDate(review.createdAt)}</AppText>
                    </View>
                </View>
            </View>

            {/* Title */}
            {review.title && (
                <AppText style={styles.title}>{review.title}</AppText>
            )}

            {/* Comment */}
            <AppText style={styles.comment}>{review.comment}</AppText>

            {/* Photos (if any) */}
            {review.photos && review.photos.length > 0 && (
                <View style={styles.photosRow}>
                    {review.photos.slice(0, 3).map((photo, index) => (
                        <Image key={index} source={{ uri: photo }} style={styles.photo} />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    headerInfo: {
        flex: 1,
        gap: 4,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    date: {
        fontSize: 12,
        color: colors.textMuted,
        marginLeft: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    comment: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    photosRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    photo: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
});
