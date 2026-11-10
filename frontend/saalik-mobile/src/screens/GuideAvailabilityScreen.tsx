import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Switch,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DaySchedule {
    enabled: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
}

interface ScheduleState {
    [key: string]: DaySchedule;
}

export function GuideAvailabilityScreen() {
    const navigation = useNavigation<any>();

    const [autoAccept, setAutoAccept] = useState(true);
    const [maxTours, setMaxTours] = useState(3);

    const [schedule, setSchedule] = useState<ScheduleState>({
        Monday: { enabled: true, morning: true, afternoon: true, evening: false },
        Tuesday: { enabled: true, morning: true, afternoon: true, evening: false },
        Wednesday: { enabled: true, morning: true, afternoon: false, evening: false },
        Thursday: { enabled: true, morning: true, afternoon: true, evening: false },
        Friday: { enabled: true, morning: true, afternoon: true, evening: true },
        Saturday: { enabled: true, morning: true, afternoon: true, evening: true },
        Sunday: { enabled: false, morning: false, afternoon: false, evening: false },
    });

    const [blackoutDates, setBlackoutDates] = useState([
        { id: '1', date: 'Jan 15, 2026', reason: 'Family event' },
        { id: '2', date: 'Jan 26, 2026', reason: 'Republic Day' },
    ]);

    const toggleDay = (day: string) => {
        setSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                enabled: !prev[day].enabled,
            },
        }));
    };

    const toggleTimeSlot = (day: string, slot: 'morning' | 'afternoon' | 'evening') => {
        if (!schedule[day].enabled) return;
        setSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [slot]: !prev[day][slot],
            },
        }));
    };

    const removeBlackout = (id: string) => {
        Alert.alert(
            'Remove Blackout',
            'Remove this blocked date?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive', onPress: () => {
                        setBlackoutDates(prev => prev.filter(d => d.id !== id));
                    }
                },
            ]
        );
    };

    const addBlackout = () => {
        Alert.alert('Add Blackout Date', 'Date picker coming soon! For now, tap any date and it will be blocked.');
    };

    const handleSave = () => {
        Alert.alert('✅ Saved', 'Your availability has been updated!');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <AppText style={styles.headerTitle}>My Availability</AppText>
                <Pressable onPress={handleSave}>
                    <AppText style={styles.saveButton}>Save</AppText>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Settings */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>⚙️ Booking Settings</AppText>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <AppText style={styles.settingLabel}>Auto-Accept Bookings</AppText>
                            <AppText style={styles.settingHint}>
                                Automatically confirm new bookings
                            </AppText>
                        </View>
                        <Switch
                            value={autoAccept}
                            onValueChange={setAutoAccept}
                            trackColor={{ false: colors.border, true: colors.accent }}
                            thumbColor="#fff"
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <AppText style={styles.settingLabel}>Max Tours Per Day</AppText>
                            <AppText style={styles.settingHint}>
                                Limit how many tours you lead daily
                            </AppText>
                        </View>
                        <View style={styles.counterContainer}>
                            <Pressable
                                style={styles.counterButton}
                                onPress={() => setMaxTours(Math.max(1, maxTours - 1))}
                            >
                                <Ionicons name="remove" size={18} color={colors.textPrimary} />
                            </Pressable>
                            <AppText style={styles.counterValue}>{maxTours}</AppText>
                            <Pressable
                                style={styles.counterButton}
                                onPress={() => setMaxTours(Math.min(10, maxTours + 1))}
                            >
                                <Ionicons name="add" size={18} color={colors.textPrimary} />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Weekly Schedule */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>📅 Weekly Schedule</AppText>
                    <AppText style={styles.sectionHint}>
                        Set when you're available to lead tours
                    </AppText>

                    {DAYS.map(day => (
                        <View key={day} style={styles.dayRow}>
                            <Pressable
                                style={styles.dayToggle}
                                onPress={() => toggleDay(day)}
                            >
                                <View style={[
                                    styles.dayCheckbox,
                                    schedule[day].enabled && styles.dayCheckboxActive,
                                ]}>
                                    {schedule[day].enabled && (
                                        <Ionicons name="checkmark" size={14} color="#021007" />
                                    )}
                                </View>
                                <AppText style={[
                                    styles.dayName,
                                    !schedule[day].enabled && styles.dayNameDisabled,
                                ]}>
                                    {day}
                                </AppText>
                            </Pressable>

                            <View style={styles.timeSlots}>
                                <Pressable
                                    style={[
                                        styles.timeSlot,
                                        schedule[day].morning && schedule[day].enabled && styles.timeSlotActive,
                                        !schedule[day].enabled && styles.timeSlotDisabled,
                                    ]}
                                    onPress={() => toggleTimeSlot(day, 'morning')}
                                >
                                    <AppText style={[
                                        styles.timeSlotText,
                                        schedule[day].morning && schedule[day].enabled && styles.timeSlotTextActive,
                                    ]}>
                                        AM
                                    </AppText>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.timeSlot,
                                        schedule[day].afternoon && schedule[day].enabled && styles.timeSlotActive,
                                        !schedule[day].enabled && styles.timeSlotDisabled,
                                    ]}
                                    onPress={() => toggleTimeSlot(day, 'afternoon')}
                                >
                                    <AppText style={[
                                        styles.timeSlotText,
                                        schedule[day].afternoon && schedule[day].enabled && styles.timeSlotTextActive,
                                    ]}>
                                        PM
                                    </AppText>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.timeSlot,
                                        schedule[day].evening && schedule[day].enabled && styles.timeSlotActive,
                                        !schedule[day].enabled && styles.timeSlotDisabled,
                                    ]}
                                    onPress={() => toggleTimeSlot(day, 'evening')}
                                >
                                    <AppText style={[
                                        styles.timeSlotText,
                                        schedule[day].evening && schedule[day].enabled && styles.timeSlotTextActive,
                                    ]}>
                                        EVE
                                    </AppText>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Blackout Dates */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <AppText style={styles.sectionTitle}>🚫 Blocked Dates</AppText>
                        <Pressable style={styles.addButton} onPress={addBlackout}>
                            <Ionicons name="add" size={20} color={colors.accent} />
                            <AppText style={styles.addButtonText}>Add Date</AppText>
                        </Pressable>
                    </View>
                    <AppText style={styles.sectionHint}>
                        Block specific dates when you're unavailable
                    </AppText>

                    {blackoutDates.length > 0 ? (
                        blackoutDates.map(item => (
                            <View key={item.id} style={styles.blackoutCard}>
                                <View style={styles.blackoutInfo}>
                                    <Ionicons name="calendar-outline" size={18} color={colors.error} />
                                    <View>
                                        <AppText style={styles.blackoutDate}>{item.date}</AppText>
                                        {item.reason && (
                                            <AppText style={styles.blackoutReason}>{item.reason}</AppText>
                                        )}
                                    </View>
                                </View>
                                <Pressable onPress={() => removeBlackout(item.id)}>
                                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                                </Pressable>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyBlackout}>
                            <AppText style={styles.emptyText}>No blocked dates</AppText>
                        </View>
                    )}
                </View>

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
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    saveButton: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.accent,
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    sectionHint: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: 16,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    settingHint: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    counterButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.accent,
        minWidth: 24,
        textAlign: 'center',
    },
    dayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    dayToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dayCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCheckboxActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    dayName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    dayNameDisabled: {
        color: colors.textMuted,
    },
    timeSlots: {
        flexDirection: 'row',
        gap: 8,
    },
    timeSlot: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.inputBg,
    },
    timeSlotActive: {
        backgroundColor: colors.accent,
    },
    timeSlotDisabled: {
        opacity: 0.4,
    },
    timeSlotText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
    },
    timeSlotTextActive: {
        color: '#021007',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.accent,
    },
    blackoutCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    blackoutInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    blackoutDate: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    blackoutReason: {
        fontSize: 13,
        color: colors.textMuted,
    },
    emptyBlackout: {
        backgroundColor: colors.card,
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
    },
});
