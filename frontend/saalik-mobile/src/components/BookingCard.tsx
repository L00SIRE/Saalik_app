import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { AppText } from './AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import type { Booking } from '@app-types/api';
import { formatDuration } from '../services/api';

interface BookingCardProps {
    booking: Booking;
    onPress: () => void;
    onCancel?: () => void;
    onReview?: () => void;
}

export function BookingCard({ booking, onPress, onCancel, onReview }: BookingCardProps) {
    const bookingDate = new Date(booking.bookingDate);
    const isPast = bookingDate < new Date();
    const isCancelled = booking.status === 'CANCELLED';
    const isCompleted = booking.status === 'COMPLETED';

    const formatBookingDate = () => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };
        return bookingDate.toLocaleDateString('en-US', options);
    };

    const getStatusColor = () => {
        if (isCancelled) return colors.error;
        if (isCompleted) return colors.successLight;
        if (isPast) return colors.textMuted;
        return colors.primary;
    };

    const getStatusText = () => {
        if (isCancelled) return 'Cancelled';
        if (isCompleted) return 'Completed';
        if (isPast) return 'Past';
        return 'Confirmed';
    };

    return (
        <Pressable style={styles.card} onPress={onPress}>
            {/* Image */}
            <Image
                source={{ uri: booking.tour.photos[0] }}
                style={styles.image}
                resizeMode="cover"
            />

            <View style={styles.content}>
                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                    <AppText style={styles.statusText}>{getStatusText()}</AppText>
                </View>

                {/* Title */}
                <AppText style={styles.title} numberOfLines={2}>{booking.tour.title}</AppText>

                {/* Date & Time */}
                <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <AppText style={styles.info}>{formatBookingDate()}</AppText>
                </View>

                <View style={styles.row}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <AppText style={styles.info}>
                        {booking.schedule.startTime} • {formatDuration(booking.tour.duration)}
                    </AppText>
                </View>

                {/* Party Size */}
                <View style={styles.row}>
                    <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                    <AppText style={styles.info}>
                        {booking.partySize} {booking.partySize === 1 ? 'person' : 'people'}
                    </AppText>
                </View>

                {/* Guide */}
                <View style={styles.guideRow}>
                    {booking.tour.guide?.user?.avatar ? (
                        <Image source={{ uri: booking.tour.guide.user.avatar }} style={styles.guideAvatar} />
                    ) : (
                        <View style={[styles.guideAvatar, styles.guideAvatarPlaceholder]}>
                            <Ionicons name="person" size={12} color={colors.textMuted} />
                        </View>
                    )}
                    <AppText style={styles.guideName}>{booking.tour.guide?.user?.name || 'Local Guide'}</AppText>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    {!isPast && !isCancelled && onCancel && (
                        <Pressable style={styles.cancelButton} onPress={onCancel}>
                            <AppText style={styles.cancelText}>Cancel</AppText>
                        </Pressable>
                    )}

                    {(isPast || isCompleted) && !isCancelled && onReview && !booking.tipAmount && (
                        <Pressable style={styles.reviewButton} onPress={onReview}>
                            <AppText style={styles.reviewText}>Leave Review</AppText>
                        </Pressable>
                    )}

                    {booking.tipAmount && (
                        <View style={styles.tippedBadge}>
                            <Ionicons name="heart" size={12} color={colors.accent} />
                            <AppText style={styles.tippedText}>
                                Tipped {booking.tipCurrency} {booking.tipAmount}
                            </AppText>
                        </View>
                    )}
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
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 16,
    },
    image: {
        width: 100,
        height: '100%',
        minHeight: 160,
    },
    content: {
        flex: 1,
        padding: 12,
        gap: 6,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
        lineHeight: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    info: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    guideRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    guideAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    guideAvatarPlaceholder: {
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guideName: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    cancelButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.error,
    },
    cancelText: {
        fontSize: 12,
        color: colors.error,
        fontWeight: '600',
    },
    reviewButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    reviewText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    tippedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: `${colors.accent}15`,
        borderRadius: 6,
    },
    tippedText: {
        fontSize: 11,
        color: colors.accent,
        fontWeight: '600',
    },
});
