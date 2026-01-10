import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Pressable,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { BookingCard } from '@components/BookingCard';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getMyBookings, cancelBooking } from '../services/api';
import type { Booking } from '@app-types/api';

type TabType = 'upcoming' | 'past' | 'cancelled';

export function TripsScreen() {
    const navigation = useNavigation<any>();
    const [activeTab, setActiveTab] = useState<TabType>('upcoming');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadBookings = async () => {
        try {
            const data = await getMyBookings(activeTab);
            setBookings(data);
        } catch (e) {
            console.error('Error loading bookings:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadBookings();
        }, [activeTab])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadBookings();
    };

    const handleBookingPress = (booking: Booking) => {
        navigation.navigate('TourDetail', { tourId: booking.tourId, tour: booking.tour });
    };

    const handleCancelBooking = async (booking: Booking) => {
        Alert.alert(
            'Cancel Booking',
            `Are you sure you want to cancel your booking for "${booking.tour.title}"?`,
            [
                { text: 'Keep Booking', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelBooking(booking.id);
                            Alert.alert('Cancelled', 'Your booking has been cancelled.');
                            loadBookings();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to cancel booking. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleReviewBooking = (booking: Booking) => {
        navigation.navigate('WriteReview', { booking });
    };

    const tabs: { key: TabType; label: string; icon: string }[] = [
        { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
        { key: 'past', label: 'Past', icon: 'time-outline' },
        { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerTitle}>My Bookings</AppText>
                <Pressable style={styles.exploreButton} onPress={() => navigation.navigate('Explore')}>
                    <Ionicons name="compass-outline" size={20} color={colors.primary} />
                </Pressable>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {tabs.map((tab) => (
                    <Pressable
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => {
                            setActiveTab(tab.key);
                            setLoading(true);
                        }}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={18}
                            color={activeTab === tab.key ? colors.primary : colors.textSecondary}
                        />
                        <AppText style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </AppText>
                    </Pressable>
                ))}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <BookingCard
                            booking={item}
                            onPress={() => handleBookingPress(item)}
                            onCancel={activeTab === 'upcoming' ? () => handleCancelBooking(item) : undefined}
                            onReview={activeTab === 'past' ? () => handleReviewBooking(item) : undefined}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons
                                name={
                                    activeTab === 'upcoming' ? 'calendar-outline' :
                                        activeTab === 'past' ? 'time-outline' : 'close-circle-outline'
                                }
                                size={64}
                                color={colors.textMuted}
                            />
                            <AppText style={styles.emptyTitle}>
                                {activeTab === 'upcoming' ? 'No upcoming tours' :
                                    activeTab === 'past' ? 'No past tours yet' : 'No cancelled bookings'}
                            </AppText>
                            <AppText style={styles.emptyText}>
                                {activeTab === 'upcoming'
                                    ? 'Discover amazing walking tours in Nepal and book your first adventure!'
                                    : activeTab === 'past'
                                        ? 'Your completed tours will appear here'
                                        : 'Cancelled bookings will appear here'}
                            </AppText>
                            {activeTab === 'upcoming' && (
                                <Pressable style={styles.exploreCardButton} onPress={() => navigation.navigate('Explore')}>
                                    <AppText style={styles.exploreCardButtonText}>Explore Tours</AppText>
                                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                                </Pressable>
                            )}
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
    exploreButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Tabs
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 8,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.inputBg,
    },
    tabActive: {
        backgroundColor: `${colors.primary}15`,
    },
    tabText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },

    // Loading
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // List
    listContent: {
        padding: 16,
        flexGrow: 1,
    },

    // Empty State
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    exploreCardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 8,
    },
    exploreCardButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
