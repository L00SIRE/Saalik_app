import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Demo tours data
const DEMO_TOURS = [
    {
        id: 't1',
        title: 'Kathmandu Durbar Square Secrets',
        status: 'APPROVED',
        category: 'Historical',
        duration: 180,
        bookingsThisMonth: 24,
        rating: 4.9,
    },
    {
        id: 't2',
        title: 'Street Food Safari',
        status: 'APPROVED',
        category: 'Food',
        duration: 150,
        bookingsThisMonth: 18,
        rating: 4.8,
    },
    {
        id: 't3',
        title: 'Hidden Temples of Patan',
        status: 'PENDING_APPROVAL',
        category: 'Religious',
        duration: 120,
        bookingsThisMonth: 0,
        rating: 0,
    },
    {
        id: 't4',
        title: 'Sunrise Photography Walk',
        status: 'DRAFT',
        category: 'Photography',
        duration: 90,
        bookingsThisMonth: 0,
        rating: 0,
    },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: 'Draft', color: '#9E9E9E', bg: '#9E9E9E20' },
    PENDING_APPROVAL: { label: 'Pending Review', color: '#FF9800', bg: '#FF980020' },
    APPROVED: { label: 'Live', color: '#4CAF50', bg: '#4CAF5020' },
    REJECTED: { label: 'Needs Changes', color: '#F44336', bg: '#F4433620' },
};

export function GuideToursScreen() {
    const navigation = useNavigation<any>();
    const [refreshing, setRefreshing] = useState(false);
    const [tours, setTours] = useState(DEMO_TOURS);

    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    const handleCreateTour = () => {
        navigation.navigate('CreateTour');
    };

    const handleEditTour = (tourId: string) => {
        navigation.navigate('CreateTour', { tourId, mode: 'edit' });
    };

    const handleToggleActive = (tourId: string, currentActive: boolean) => {
        Alert.alert(
            currentActive ? 'Pause Tour' : 'Activate Tour',
            currentActive 
                ? 'This tour will be hidden from travelers.'
                : 'This tour will be visible to travelers.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => {
                    // Toggle in demo
                    Alert.alert('Done', currentActive ? 'Tour paused' : 'Tour activated');
                }},
            ]
        );
    };

    const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerTitle}>My Tours</AppText>
                <Pressable style={styles.createButton} onPress={handleCreateTour}>
                    <Ionicons name="add" size={22} color="#021007" />
                    <AppText style={styles.createButtonText}>Create</AppText>
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                }
            >
                {/* Stats Summary */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <AppText style={styles.statValue}>{tours.filter(t => t.status === 'APPROVED').length}</AppText>
                        <AppText style={styles.statLabel}>Live Tours</AppText>
                    </View>
                    <View style={styles.statCard}>
                        <AppText style={styles.statValue}>{tours.filter(t => t.status === 'PENDING_APPROVAL').length}</AppText>
                        <AppText style={styles.statLabel}>Pending</AppText>
                    </View>
                    <View style={styles.statCard}>
                        <AppText style={styles.statValue}>{tours.filter(t => t.status === 'DRAFT').length}</AppText>
                        <AppText style={styles.statLabel}>Drafts</AppText>
                    </View>
                </View>

                {/* Tours List */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>All Tours</AppText>
                    
                    {tours.map(tour => {
                        const statusConfig = getStatusConfig(tour.status);
                        return (
                            <View key={tour.id} style={styles.tourCard}>
                                <View style={styles.tourCardHeader}>
                                    <View style={styles.tourInfo}>
                                        <AppText style={styles.tourTitle} numberOfLines={1}>
                                            {tour.title}
                                        </AppText>
                                        <AppText style={styles.tourMeta}>
                                            {tour.category} • {Math.floor(tour.duration / 60)}h {tour.duration % 60}m
                                        </AppText>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                                        <AppText style={[styles.statusText, { color: statusConfig.color }]}>
                                            {statusConfig.label}
                                        </AppText>
                                    </View>
                                </View>

                                {tour.status === 'APPROVED' && (
                                    <View style={styles.tourStats}>
                                        <View style={styles.tourStat}>
                                            <Ionicons name="ticket-outline" size={14} color={colors.textSecondary} />
                                            <AppText style={styles.tourStatText}>
                                                {tour.bookingsThisMonth} this month
                                            </AppText>
                                        </View>
                                        <View style={styles.tourStat}>
                                            <Ionicons name="star" size={14} color={colors.warning} />
                                            <AppText style={styles.tourStatText}>
                                                {tour.rating > 0 ? tour.rating.toFixed(1) : 'No ratings'}
                                            </AppText>
                                        </View>
                                    </View>
                                )}

                                {tour.status === 'PENDING_APPROVAL' && (
                                    <View style={styles.pendingNote}>
                                        <Ionicons name="time-outline" size={16} color="#FF9800" />
                                        <AppText style={styles.pendingNoteText}>
                                            Under review. Usually takes 24-48 hours.
                                        </AppText>
                                    </View>
                                )}

                                {tour.status === 'REJECTED' && (
                                    <View style={styles.rejectedNote}>
                                        <Ionicons name="alert-circle-outline" size={16} color="#F44336" />
                                        <AppText style={styles.rejectedNoteText}>
                                            Needs changes. Tap Edit to review feedback.
                                        </AppText>
                                    </View>
                                )}

                                <View style={styles.tourActions}>
                                    <Pressable 
                                        style={styles.tourActionButton}
                                        onPress={() => handleEditTour(tour.id)}
                                    >
                                        <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                                        <AppText style={styles.tourActionText}>Edit</AppText>
                                    </Pressable>
                                    
                                    {tour.status === 'APPROVED' && (
                                        <Pressable 
                                            style={styles.tourActionButton}
                                            onPress={() => handleToggleActive(tour.id, true)}
                                        >
                                            <Ionicons name="pause-outline" size={18} color={colors.textSecondary} />
                                            <AppText style={styles.tourActionText}>Pause</AppText>
                                        </Pressable>
                                    )}
                                    
                                    {tour.status === 'DRAFT' && (
                                        <Pressable 
                                            style={[styles.tourActionButton, styles.submitButton]}
                                            onPress={() => Alert.alert('Submit', 'Submit for review?')}
                                        >
                                            <Ionicons name="send" size={18} color={colors.accent} />
                                            <AppText style={[styles.tourActionText, { color: colors.accent }]}>Submit</AppText>
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Create Tour CTA */}
                <Pressable style={styles.createTourCTA} onPress={handleCreateTour}>
                    <View style={styles.createTourIcon}>
                        <Ionicons name="add-circle" size={32} color={colors.accent} />
                    </View>
                    <View>
                        <AppText style={styles.createTourTitle}>Create a New Tour</AppText>
                        <AppText style={styles.createTourSubtitle}>
                            Share your local knowledge with travelers
                        </AppText>
                    </View>
                </Pressable>

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
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.accent,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    createButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#021007',
    },
    scrollContent: {
        padding: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.accent,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    tourCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    tourCardHeader: {
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
    tourMeta: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    tourStats: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 12,
    },
    tourStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tourStatText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    pendingNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FF980010',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    pendingNoteText: {
        fontSize: 13,
        color: '#FF9800',
        flex: 1,
    },
    rejectedNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F4433610',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    rejectedNoteText: {
        fontSize: 13,
        color: '#F44336',
        flex: 1,
    },
    tourActions: {
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    tourActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.inputBg,
    },
    tourActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    submitButton: {
        backgroundColor: `${colors.accent}15`,
    },
    createTourCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    createTourIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: `${colors.accent}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createTourTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    createTourSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
});
