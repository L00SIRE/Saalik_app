import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export function TripsScreen() {
    const { savedPlans } = useAuth();
    const navigation = useNavigation<any>();
    const [filter, setFilter] = useState<'Upcoming' | 'Past'>('Upcoming');

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.background, '#000000']} style={styles.background}>
                <View style={styles.header}>
                    <AppText style={styles.title}>My Trips</AppText>
                    <View style={styles.filterContainer}>
                        <Pressable
                            style={[styles.filterPill, filter === 'Upcoming' && styles.filterActive]}
                            onPress={() => setFilter('Upcoming')}
                        >
                            <AppText style={[styles.filterText, filter === 'Upcoming' && styles.filterTextActive]}>Upcoming</AppText>
                        </Pressable>
                        <Pressable
                            style={[styles.filterPill, filter === 'Past' && styles.filterActive]}
                            onPress={() => setFilter('Past')}
                        >
                            <AppText style={[styles.filterText, filter === 'Past' && styles.filterTextActive]}>Past</AppText>
                        </Pressable>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {filter === 'Upcoming' && (
                        <>
                            {/* Mock Active Trip Card if we had state for it, for now using static placeholder or saved plans */}
                            {savedPlans.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <View style={styles.iconCircle}>
                                        <Ionicons name="map-outline" size={48} color={colors.accent} />
                                    </View>
                                    <AppText style={styles.emptyTitle}>No upcoming trips</AppText>
                                    <AppText style={styles.emptyDesc}>Your booked guides and saved itineraries will appear here.</AppText>
                                    <Pressable style={styles.exploreButton} onPress={() => navigation.navigate('Explore')}>
                                        <AppText style={styles.exploreButtonText}>Explore Destinations</AppText>
                                    </Pressable>
                                </View>
                            ) : (
                                savedPlans.map((plan, index) => (
                                    <Pressable
                                        key={index}
                                        style={styles.tripCard}
                                        onPress={() => navigation.navigate('Journey', { screen: 'Plan', params: { plan } })}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View style={styles.statusBadge}>
                                                <AppText style={styles.statusText}>PLANNED</AppText>
                                            </View>
                                            <AppText style={styles.dateText}>Flexible Dates</AppText>
                                        </View>
                                        <AppText style={styles.tripTitle}>{plan.headline}</AppText>
                                        <AppText style={styles.tripSummary} numberOfLines={2}>{plan.summary}</AppText>

                                        <View style={styles.cardFooter}>
                                            <View style={styles.footerItem}>
                                                <Ionicons name="musical-note" size={14} color={colors.textSecondary} />
                                                <AppText style={styles.footerText}>{plan.theme.toUpperCase()}</AppText>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                                        </View>
                                    </Pressable>
                                ))
                            )}
                        </>
                    )}

                    {filter === 'Past' && (
                        <View style={styles.emptyState}>
                            <AppText style={styles.emptyDesc}>No past trips history.</AppText>
                        </View>
                    )}
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
    header: { marginBottom: 20 },
    title: { fontSize: 32, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
    filterContainer: { flexDirection: 'row', gap: 12 },
    filterPill: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    filterActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    filterText: { color: colors.textSecondary, fontWeight: '600' },
    filterTextActive: { color: '#000', fontWeight: 'bold' },
    scroll: { paddingBottom: 100, gap: 16 },

    emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(21, 255, 117, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
    emptyDesc: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', maxWidth: '80%' },
    exploreButton: { marginTop: 20, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: colors.accent, borderRadius: 12 },
    exploreButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

    tripCard: { backgroundColor: colors.card, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.border, gap: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    statusBadge: { backgroundColor: 'rgba(21, 255, 117, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { color: colors.accent, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    dateText: { color: colors.textSecondary, fontSize: 12 },
    tripTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
    tripSummary: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border },
    footerItem: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    footerText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
});
