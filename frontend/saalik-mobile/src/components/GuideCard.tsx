import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { AppText } from './AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import type { Guide } from '@app-types/api';
import { formatRating } from '../services/api';

interface GuideCardProps {
    guide: Guide;
    onPress?: () => void;
    compact?: boolean;
}

export function GuideCard({ guide, onPress, compact = false }: GuideCardProps) {
    const Container = onPress ? Pressable : View;

    if (compact) {
        return (
            <Container style={styles.compactCard} onPress={onPress}>
                {guide.user.avatar ? (
                    <Image source={{ uri: guide.user.avatar }} style={styles.compactAvatar} />
                ) : (
                    <View style={[styles.compactAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={20} color={colors.textMuted} />
                    </View>
                )}
                <View style={styles.compactInfo}>
                    <View style={styles.nameRow}>
                        <AppText style={styles.compactName}>{guide.user.name}</AppText>
                        {guide.isVerified && (
                            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                        )}
                    </View>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color={colors.star} />
                        <AppText style={styles.ratingText}>{formatRating(guide.rating)}</AppText>
                        <AppText style={styles.reviewCount}>({guide.totalReviews})</AppText>
                    </View>
                </View>
            </Container>
        );
    }

    return (
        <Container style={styles.card} onPress={onPress}>
            {/* Avatar */}
            {guide.user.avatar ? (
                <Image source={{ uri: guide.user.avatar }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={32} color={colors.textMuted} />
                </View>
            )}

            <View style={styles.info}>
                {/* Name & Verified */}
                <View style={styles.nameRow}>
                    <AppText style={styles.name}>{guide.user.name}</AppText>
                    {guide.isVerified && (
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                            <AppText style={styles.verifiedText}>Verified</AppText>
                        </View>
                    )}
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Ionicons name="star" size={14} color={colors.star} />
                        <AppText style={styles.statValue}>{formatRating(guide.rating)}</AppText>
                    </View>
                    <AppText style={styles.statDivider}>•</AppText>
                    <AppText style={styles.statLabel}>{guide.totalReviews} reviews</AppText>
                    <AppText style={styles.statDivider}>•</AppText>
                    <AppText style={styles.statLabel}>{guide.totalTours} tours</AppText>
                </View>

                {/* Languages */}
                <View style={styles.languagesRow}>
                    <Ionicons name="globe-outline" size={14} color={colors.textSecondary} />
                    <AppText style={styles.languages} numberOfLines={1}>
                        {guide.languages.join(', ')}
                    </AppText>
                </View>

                {/* Specialties */}
                <View style={styles.specialtiesRow}>
                    {guide.specialties.slice(0, 3).map((specialty, index) => (
                        <View key={index} style={styles.specialtyBadge}>
                            <AppText style={styles.specialtyText}>{specialty}</AppText>
                        </View>
                    ))}
                </View>

                {/* Experience */}
                <AppText style={styles.experience}>
                    {guide.yearsExperience} years experience
                </AppText>
            </View>
        </Container>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
        gap: 6,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verifiedText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    statDivider: {
        fontSize: 13,
        color: colors.textMuted,
    },
    languagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    languages: {
        fontSize: 13,
        color: colors.textSecondary,
        flex: 1,
    },
    specialtiesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 2,
    },
    specialtyBadge: {
        backgroundColor: colors.inputBg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    specialtyText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    experience: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },

    // Compact styles
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    compactAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    compactInfo: {
        flex: 1,
        gap: 4,
    },
    compactName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    reviewCount: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
