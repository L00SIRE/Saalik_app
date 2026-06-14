import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createBooking, formatDuration, getDayName } from '../services/api';
import type { Tour, TourSchedule } from '@app-types/api';

export function BookingScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { tour } = route.params as { tour: Tour };

    const [selectedSchedule, setSelectedSchedule] = useState<TourSchedule | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [partySize, setPartySize] = useState(1);
    const [loading, setLoading] = useState(false);

    // Generate next 14 days of available dates
    const getAvailableDates = () => {
        const dates: { date: Date; schedule: TourSchedule }[] = [];
        const today = new Date();

        for (let i = 1; i <= 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayOfWeek = date.getDay();

            // Find matching schedule
            const schedule = tour.schedules?.find(s => s.dayOfWeek === dayOfWeek && s.isActive);
            if (schedule) {
                dates.push({ date, schedule });
            }
        }

        return dates;
    };

    const availableDates = getAvailableDates();

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleSelectDate = (date: Date, schedule: TourSchedule) => {
        setSelectedDate(date);
        setSelectedSchedule(schedule);
    };

    const handleConfirmBooking = async () => {
        if (!selectedDate || !selectedSchedule) {
            Alert.alert('Select Date', 'Please select a tour date to continue.');
            return;
        }

        setLoading(true);
        try {
            const booking = await createBooking({
                tourId: tour.id,
                scheduleId: selectedSchedule.id,
                bookingDate: selectedDate.toISOString(),
                partySize,
            });

            Alert.alert(
                'Booking Confirmed! 🎉',
                `Your tour "${tour.title}" is booked for ${formatDate(selectedDate)} at ${selectedSchedule.startTime}.\n\nYou'll receive a confirmation email with all the details.`,
                [
                    {
                        text: 'View My Bookings',
                        onPress: () =>
                            navigation.navigate('TripsTab', { screen: 'MyBookings' }),
                    },
                    {
                        text: 'Done',
                        onPress: () => navigation.popToTop(),
                    },
                ]
            );
        } catch (e) {
            Alert.alert('Booking Failed', 'Unable to complete booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <AppText style={styles.headerTitle}>Book Tour</AppText>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Tour Summary */}
                <View style={styles.tourSummary}>
                    <Image source={{ uri: tour.photos[0] }} style={styles.tourImage} />
                    <View style={styles.tourInfo}>
                        <AppText style={styles.tourTitle} numberOfLines={2}>{tour.title}</AppText>
                        <View style={styles.tourRow}>
                            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                            <AppText style={styles.tourLocation}>{tour.hub}</AppText>
                        </View>
                        <View style={styles.tourRow}>
                            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                            <AppText style={styles.tourDuration}>{formatDuration(tour.duration)}</AppText>
                        </View>
                    </View>
                </View>

                {/* Select Date */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>Select Date</AppText>
                    <AppText style={styles.sectionSubtitle}>
                        Choose from available dates in the next 2 weeks
                    </AppText>

                    <View style={styles.datesGrid}>
                        {availableDates.map(({ date, schedule }, index) => {
                            const isSelected = selectedDate?.toDateString() === date.toDateString();
                            return (
                                <Pressable
                                    key={index}
                                    style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                                    onPress={() => handleSelectDate(date, schedule)}
                                >
                                    <AppText style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                                        {getDayName(date.getDay())}
                                    </AppText>
                                    <AppText style={[styles.dateNumber, isSelected && styles.dateTextSelected]}>
                                        {date.getDate()}
                                    </AppText>
                                    <AppText style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                                        {date.toLocaleDateString('en-US', { month: 'short' })}
                                    </AppText>
                                    <AppText style={[styles.dateTime, isSelected && styles.dateTextSelected]}>
                                        {schedule.startTime}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </View>

                    {availableDates.length === 0 && (
                        <View style={styles.noDatesBanner}>
                            <Ionicons name="calendar-outline" size={24} color={colors.textMuted} />
                            <AppText style={styles.noDatesText}>No available dates in the next 2 weeks</AppText>
                        </View>
                    )}
                </View>

                {/* Party Size */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>Party Size</AppText>
                    <View style={styles.partySizeRow}>
                        <Pressable
                            style={[styles.partySizeButton, partySize <= 1 && styles.partySizeButtonDisabled]}
                            onPress={() => partySize > 1 && setPartySize(partySize - 1)}
                            disabled={partySize <= 1}
                        >
                            <Ionicons name="remove" size={24} color={partySize <= 1 ? colors.textMuted : colors.textPrimary} />
                        </Pressable>
                        <View style={styles.partySizeValue}>
                            <AppText style={styles.partySizeNumber}>{partySize}</AppText>
                            <AppText style={styles.partySizeLabel}>
                                {partySize === 1 ? 'person' : 'people'}
                            </AppText>
                        </View>
                        <Pressable
                            style={[styles.partySizeButton, partySize >= tour.maxGroupSize && styles.partySizeButtonDisabled]}
                            onPress={() => partySize < tour.maxGroupSize && setPartySize(partySize + 1)}
                            disabled={partySize >= tour.maxGroupSize}
                        >
                            <Ionicons name="add" size={24} color={partySize >= tour.maxGroupSize ? colors.textMuted : colors.textPrimary} />
                        </Pressable>
                    </View>
                    <AppText style={styles.maxGroupText}>
                        Maximum {tour.maxGroupSize} people per group
                    </AppText>
                </View>

                {/* Booking Summary */}
                {selectedDate && selectedSchedule && (
                    <View style={styles.summaryCard}>
                        <AppText style={styles.summaryTitle}>Booking Summary</AppText>
                        <View style={styles.summaryRow}>
                            <AppText style={styles.summaryLabel}>Date</AppText>
                            <AppText style={styles.summaryValue}>{formatDate(selectedDate)}</AppText>
                        </View>
                        <View style={styles.summaryRow}>
                            <AppText style={styles.summaryLabel}>Time</AppText>
                            <AppText style={styles.summaryValue}>{selectedSchedule.startTime}</AppText>
                        </View>
                        <View style={styles.summaryRow}>
                            <AppText style={styles.summaryLabel}>Party Size</AppText>
                            <AppText style={styles.summaryValue}>{partySize} {partySize === 1 ? 'person' : 'people'}</AppText>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryRow}>
                            <AppText style={styles.summaryLabel}>Price</AppText>
                            <View style={styles.priceRow}>
                                <AppText style={styles.priceValue}>FREE</AppText>
                                <AppText style={styles.tipNote}>Tips welcome at end</AppText>
                            </View>
                        </View>
                    </View>
                )}

                {/* Meeting Point Reminder */}
                <View style={styles.reminderCard}>
                    <Ionicons name="information-circle" size={24} color={colors.primary} />
                    <View style={styles.reminderContent}>
                        <AppText style={styles.reminderTitle}>Meeting Point</AppText>
                        <AppText style={styles.reminderText}>{tour.meetingPoint}</AppText>
                        <AppText style={styles.reminderSubtext}>
                            Please arrive 5 minutes early
                        </AppText>
                    </View>
                </View>

                {/* Spacer */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Confirm Button */}
            <SafeAreaView style={styles.footer} edges={['bottom']}>
                <Pressable
                    style={[styles.confirmButton, (!selectedDate || loading) && styles.confirmButtonDisabled]}
                    onPress={handleConfirmBooking}
                    disabled={!selectedDate || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <AppText style={styles.confirmButtonText}>Confirm Booking</AppText>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </>
                    )}
                </Pressable>
            </SafeAreaView>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    scrollContent: {
        padding: 20,
    },

    // Tour Summary
    tourSummary: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tourImage: {
        width: 100,
        height: 100,
    },
    tourInfo: {
        flex: 1,
        padding: 12,
        gap: 6,
    },
    tourTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    tourRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tourLocation: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    tourDuration: {
        fontSize: 13,
        color: colors.textSecondary,
    },

    // Section
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 12,
    },

    // Dates
    datesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    dateCard: {
        width: 75,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateCardSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    dateDay: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    dateNumber: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    dateMonth: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    dateTime: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 4,
    },
    dateTextSelected: {
        color: '#fff',
    },
    noDatesBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        backgroundColor: colors.inputBg,
        borderRadius: 12,
    },
    noDatesText: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    // Party Size
    partySizeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    partySizeButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    partySizeButtonDisabled: {
        opacity: 0.5,
    },
    partySizeValue: {
        alignItems: 'center',
        minWidth: 90,
    },
    partySizeNumber: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    partySizeLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    maxGroupText: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 8,
    },

    // Summary
    summaryCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 8,
    },
    priceRow: {
        alignItems: 'flex-end',
    },
    priceValue: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.successLight,
    },
    tipNote: {
        fontSize: 11,
        color: colors.textMuted,
        fontStyle: 'italic',
    },

    // Reminder
    reminderCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: `${colors.primary}10`,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    reminderContent: {
        flex: 1,
    },
    reminderTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 4,
    },
    reminderText: {
        fontSize: 13,
        color: colors.textPrimary,
    },
    reminderSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
    },
    confirmButtonDisabled: {
        backgroundColor: colors.textMuted,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
