import React, { useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    RefreshControl,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface Booking {
    id: string;
    tourTitle: string;
    tourId: string;
    date: string;
    time: string;
    guests: number;
    status: BookingStatus;
    travelerName: string;
    travelerEmail: string;
    travelerPhone?: string;
    notes?: string;
    tipAmount?: number;
}

// Demo bookings data
const DEMO_BOOKINGS: Booking[] = [
    {
        id: 'b1',
        tourTitle: 'Kathmandu Durbar Square Secrets',
        tourId: 't1',
        date: 'Today',
        time: '9:00 AM',
        guests: 3,
        status: 'CONFIRMED',
        travelerName: 'Sarah Mitchell',
        travelerEmail: 'sarah@example.com',
        travelerPhone: '+1 555-123-4567',
        notes: 'First time visiting Nepal, very excited!',
    },
    {
        id: 'b2',
        tourTitle: 'Street Food Safari',
        tourId: 't2',
        date: 'Tomorrow',
        time: '11:00 AM',
        guests: 2,
        status: 'PENDING',
        travelerName: 'James Wilson',
        travelerEmail: 'james@example.com',
        notes: 'Vegetarian options please',
    },
    {
        id: 'b3',
        tourTitle: 'Kathmandu Durbar Square Secrets',
        tourId: 't1',
        date: 'Jan 15',
        time: '9:00 AM',
        guests: 4,
        status: 'CONFIRMED',
        travelerName: 'Emma Thompson',
        travelerEmail: 'emma@example.com',
        travelerPhone: '+44 20-7946-0958',
    },
    {
        id: 'b4',
        tourTitle: 'Hidden Temples of Patan',
        tourId: 't3',
        date: 'Jan 16',
        time: '10:00 AM',
        guests: 1,
        status: 'PENDING',
        travelerName: 'David Chen',
        travelerEmail: 'david@example.com',
    },
    {
        id: 'b5',
        tourTitle: 'Kathmandu Durbar Square Secrets',
        tourId: 't1',
        date: 'Jan 10',
        time: '9:00 AM',
        guests: 2,
        status: 'COMPLETED',
        travelerName: 'Lisa Anderson',
        travelerEmail: 'lisa@example.com',
        tipAmount: 25,
    },
    {
        id: 'b6',
        tourTitle: 'Street Food Safari',
        tourId: 't2',
        date: 'Jan 8',
        time: '11:00 AM',
        guests: 3,
        status: 'COMPLETED',
        travelerName: 'Mark Johnson',
        travelerEmail: 'mark@example.com',
        tipAmount: 30,
    },
    {
        id: 'b7',
        tourTitle: 'Hidden Temples of Patan',
        tourId: 't3',
        date: 'Jan 5',
        time: '10:00 AM',
        guests: 2,
        status: 'CANCELLED',
        travelerName: 'Anna Smith',
        travelerEmail: 'anna@example.com',
    },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string; icon: string }> = {
    PENDING: { label: 'Pending', color: '#FF9800', bg: '#FF980015', icon: 'time' },
    CONFIRMED: { label: 'Confirmed', color: '#4CAF50', bg: '#4CAF5015', icon: 'checkmark-circle' },
    COMPLETED: { label: 'Completed', color: '#2196F3', bg: '#2196F315', icon: 'checkmark-done' },
    CANCELLED: { label: 'Cancelled', color: '#9E9E9E', bg: '#9E9E9E15', icon: 'close-circle' },
    NO_SHOW: { label: 'No Show', color: '#F44336', bg: '#F4433615', icon: 'alert-circle' },
};

type FilterType = 'all' | 'upcoming' | 'pending' | 'past';

const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'pending', label: 'Pending' },
    { key: 'past', label: 'Past' },
];

export function GuideBookingsScreen() {
    const navigation = useNavigation<any>();
    const [refreshing, setRefreshing] = useState(false);
    const [bookings, setBookings] = useState(DEMO_BOOKINGS);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    }, []);

    const filterBookings = (bookings: Booking[]): Booking[] => {
        switch (activeFilter) {
            case 'upcoming':
                return bookings.filter(b =>
                    b.status === 'CONFIRMED' &&
                    (b.date === 'Today' || b.date === 'Tomorrow' || b.date.startsWith('Jan'))
                );
            case 'pending':
                return bookings.filter(b => b.status === 'PENDING');
            case 'past':
                return bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');
            default:
                return bookings;
        }
    };

    const handleAcceptBooking = (bookingId: string) => {
        Alert.alert(
            'Accept Booking',
            'Confirm this booking? The traveler will be notified.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    onPress: () => {
                        setBookings(prev =>
                            prev.map(b =>
                                b.id === bookingId ? { ...b, status: 'CONFIRMED' as BookingStatus } : b
                            )
                        );
                        Alert.alert('Success', 'Booking confirmed!');
                    }
                },
            ]
        );
    };

    const handleDeclineBooking = (bookingId: string) => {
        Alert.alert(
            'Decline Booking',
            'Are you sure you want to decline this booking?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: () => {
                        setBookings(prev =>
                            prev.map(b =>
                                b.id === bookingId ? { ...b, status: 'CANCELLED' as BookingStatus } : b
                            )
                        );
                        Alert.alert('Booking Declined', 'The traveler has been notified.');
                    }
                },
            ]
        );
    };

    const handleMarkComplete = (bookingId: string) => {
        Alert.alert(
            'Mark as Completed',
            'Mark this tour as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: () => {
                        setBookings(prev =>
                            prev.map(b =>
                                b.id === bookingId ? { ...b, status: 'COMPLETED' as BookingStatus } : b
                            )
                        );
                        Alert.alert('Tour Completed!', 'Great job! Don\'t forget to follow up for a review.');
                    }
                },
            ]
        );
    };

    const handleContactTraveler = (booking: Booking, method: 'email' | 'phone') => {
        if (method === 'email') {
            Linking.openURL(`mailto:${booking.travelerEmail}?subject=Your ${booking.tourTitle} Booking`);
        } else if (method === 'phone' && booking.travelerPhone) {
            Linking.openURL(`tel:${booking.travelerPhone}`);
        }
    };

    const filteredBookings = filterBookings(bookings);
    const pendingCount = bookings.filter(b => b.status === 'PENDING').length;
    const todayCount = bookings.filter(b => b.date === 'Today' && b.status === 'CONFIRMED').length;

    const renderBookingCard = (booking: Booking) => {
        const statusConfig = STATUS_CONFIG[booking.status];
        const isExpanded = expandedBooking === booking.id;

        return (
            <Pressable
                key={booking.id}
                style={styles.bookingCard}
                onPress={() => setExpandedBooking(isExpanded ? null : booking.id)}
            >
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.tourInfo}>
                        <AppText style={styles.tourTitle} numberOfLines={1}>
                            {booking.tourTitle}
                        </AppText>
                        <View style={styles.dateTimeRow}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                            <AppText style={styles.dateTimeText}>
                                {booking.date} at {booking.time}
                            </AppText>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                        <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                        <AppText style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </AppText>
                    </View>
                </View>

                {/* Traveler Info */}
                <View style={styles.travelerRow}>
                    <View style={styles.travelerAvatar}>
                        <AppText style={styles.travelerInitial}>
                            {booking.travelerName.charAt(0)}
                        </AppText>
                    </View>
                    <View style={styles.travelerInfo}>
                        <AppText style={styles.travelerName}>{booking.travelerName}</AppText>
                        <AppText style={styles.guestCount}>
                            {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
                        </AppText>
                    </View>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                    />
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {/* Notes */}
                        {booking.notes && (
                            <View style={styles.notesSection}>
                                <AppText style={styles.notesLabel}>Notes:</AppText>
                                <AppText style={styles.notesText}>{booking.notes}</AppText>
                            </View>
                        )}

                        {/* Tip Amount (for completed) */}
                        {booking.status === 'COMPLETED' && booking.tipAmount && (
                            <View style={styles.tipSection}>
                                <Ionicons name="gift" size={16} color={colors.accent} />
                                <AppText style={styles.tipText}>
                                    Tip received: ${booking.tipAmount}
                                </AppText>
                            </View>
                        )}

                        {/* Contact Buttons */}
                        <View style={styles.contactRow}>
                            <Pressable
                                style={styles.contactButton}
                                onPress={() => handleContactTraveler(booking, 'email')}
                            >
                                <Ionicons name="mail-outline" size={18} color={colors.primary} />
                                <AppText style={styles.contactButtonText}>Email</AppText>
                            </Pressable>
                            {booking.travelerPhone && (
                                <Pressable
                                    style={styles.contactButton}
                                    onPress={() => handleContactTraveler(booking, 'phone')}
                                >
                                    <Ionicons name="call-outline" size={18} color={colors.primary} />
                                    <AppText style={styles.contactButtonText}>Call</AppText>
                                </Pressable>
                            )}
                        </View>

                        {/* Action Buttons based on status */}
                        {booking.status === 'PENDING' && (
                            <View style={styles.actionRow}>
                                <Pressable
                                    style={styles.declineButton}
                                    onPress={() => handleDeclineBooking(booking.id)}
                                >
                                    <Ionicons name="close" size={18} color={colors.error} />
                                    <AppText style={styles.declineButtonText}>Decline</AppText>
                                </Pressable>
                                <Pressable
                                    style={styles.acceptButton}
                                    onPress={() => handleAcceptBooking(booking.id)}
                                >
                                    <Ionicons name="checkmark" size={18} color="#021007" />
                                    <AppText style={styles.acceptButtonText}>Accept</AppText>
                                </Pressable>
                            </View>
                        )}

                        {booking.status === 'CONFIRMED' && (
                            <View style={styles.actionRow}>
                                <Pressable
                                    style={styles.cancelButton}
                                    onPress={() => handleDeclineBooking(booking.id)}
                                >
                                    <AppText style={styles.cancelButtonText}>Cancel Booking</AppText>
                                </Pressable>
                                {booking.date === 'Today' && (
                                    <Pressable
                                        style={styles.completeButton}
                                        onPress={() => handleMarkComplete(booking.id)}
                                    >
                                        <Ionicons name="checkmark-done" size={18} color="#021007" />
                                        <AppText style={styles.completeButtonText}>Mark Complete</AppText>
                                    </Pressable>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerTitle}>Bookings</AppText>
                {pendingCount > 0 && (
                    <View style={styles.pendingBadge}>
                        <AppText style={styles.pendingBadgeText}>{pendingCount} pending</AppText>
                    </View>
                )}
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
                <View style={styles.quickStatCard}>
                    <Ionicons name="today" size={20} color={colors.accent} />
                    <AppText style={styles.quickStatValue}>{todayCount}</AppText>
                    <AppText style={styles.quickStatLabel}>Today</AppText>
                </View>
                <View style={styles.quickStatCard}>
                    <Ionicons name="time-outline" size={20} color={colors.warning} />
                    <AppText style={styles.quickStatValue}>{pendingCount}</AppText>
                    <AppText style={styles.quickStatLabel}>Pending</AppText>
                </View>
                <View style={styles.quickStatCard}>
                    <Ionicons name="checkmark-done" size={20} color={colors.primary} />
                    <AppText style={styles.quickStatValue}>
                        {bookings.filter(b => b.status === 'COMPLETED').length}
                    </AppText>
                    <AppText style={styles.quickStatLabel}>Completed</AppText>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {FILTERS.map(filter => (
                    <Pressable
                        key={filter.key}
                        style={[
                            styles.filterChip,
                            activeFilter === filter.key && styles.filterChipActive,
                        ]}
                        onPress={() => setActiveFilter(filter.key)}
                    >
                        <AppText style={[
                            styles.filterChipText,
                            activeFilter === filter.key && styles.filterChipTextActive,
                        ]}>
                            {filter.label}
                        </AppText>
                    </Pressable>
                ))}
            </View>

            {/* Bookings List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accent}
                    />
                }
            >
                {filteredBookings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
                        <AppText style={styles.emptyTitle}>No Bookings Found</AppText>
                        <AppText style={styles.emptyText}>
                            {activeFilter === 'pending'
                                ? 'No pending bookings at the moment.'
                                : activeFilter === 'upcoming'
                                    ? 'No upcoming tours scheduled.'
                                    : 'Your booking history will appear here.'}
                        </AppText>
                    </View>
                ) : (
                    filteredBookings.map(renderBookingCard)
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    pendingBadge: {
        backgroundColor: `${colors.warning}20`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    pendingBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.warning,
    },
    quickStats: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 12,
    },
    quickStatCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        gap: 6,
    },
    quickStatValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    quickStatLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterChipTextActive: {
        color: '#021007',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    bookingCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    tourInfo: {
        flex: 1,
        marginRight: 12,
    },
    tourTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateTimeText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    travelerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    travelerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    travelerInitial: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    travelerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    travelerName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    guestCount: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    notesSection: {
        backgroundColor: colors.inputBg,
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
    },
    notesLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    notesText: {
        fontSize: 14,
        color: colors.textPrimary,
    },
    tipSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: `${colors.accent}15`,
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
    },
    tipText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.accent,
    },
    contactRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: colors.inputBg,
    },
    contactButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    declineButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: `${colors.error}15`,
    },
    declineButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.error,
    },
    acceptButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.accent,
    },
    acceptButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#021007',
    },
    cancelButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.inputBg,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    completeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.accent,
    },
    completeButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#021007',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
