import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Image, FlatList } from 'react-native';
import { AppText } from '@components/AppText';
import { MemoryCard } from '@components/MemoryCard';
import { colors } from '@theme/colors';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

export function ProfileScreen() {
    const { logout, savedPlans, memories, toggleLike } = useAuth();
    const navigation = useNavigation<any>();
    const [isPublicView, setIsPublicView] = useState(true);

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.avatarContainer}>
                <AppText style={styles.avatarText}>EX</AppText>
            </View>
            <AppText style={styles.name}>Explorer</AppText>
            <AppText style={styles.email}>explorer@saalik.ai</AppText>

            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <AppText style={styles.statNumber}>{memories.length}</AppText>
                    <AppText style={styles.statLabel}>Memories</AppText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <AppText style={styles.statNumber}>{savedPlans.length}</AppText>
                    <AppText style={styles.statLabel}>Journeys</AppText>
                </View>
            </View>

            {/* Toggle */}
            <View style={styles.toggleContainer}>
                <Pressable
                    style={[styles.toggleButton, isPublicView && styles.toggleActive]}
                    onPress={() => setIsPublicView(true)}
                >
                    <AppText style={[styles.toggleText, isPublicView && styles.toggleTextActive]}>Public Feed</AppText>
                </Pressable>
                <Pressable
                    style={[styles.toggleButton, !isPublicView && styles.toggleActive]}
                    onPress={() => setIsPublicView(false)}
                >
                    <AppText style={[styles.toggleText, !isPublicView && styles.toggleTextActive]}>My Profile</AppText>
                </Pressable>
            </View>
        </View>
    );

    const renderPrivateContent = () => (
        <View style={styles.privateContainer}>
            {/* Saved Journeys Section */}
            <View style={styles.section}>
                <AppText style={styles.sectionTitle}>My Journeys</AppText>
                {savedPlans.length === 0 ? (
                    <AppText style={styles.emptyText}>No saved journeys yet.</AppText>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                        {savedPlans.map((plan, index) => (
                            <Pressable
                                key={index}
                                style={styles.planCard}
                                onPress={() => navigation.navigate('Journey', { screen: 'Plan', params: { plan } })}
                            >
                                <AppText style={styles.planTheme}>{plan.theme.toUpperCase()}</AppText>
                                <AppText style={styles.planHeadline} numberOfLines={2}>{plan.headline}</AppText>
                            </Pressable>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Memories Grid Section */}
            <View style={styles.section}>
                <AppText style={styles.sectionTitle}>Memories Grid</AppText>
                {memories.length === 0 ? (
                    <AppText style={styles.emptyText}>No uploaded memories.</AppText>
                ) : (
                    <View style={styles.grid}>
                        {memories.map((memory) => (
                            <View key={memory.id} style={styles.memoryItem}>
                                <Image source={{ uri: memory.uri }} style={styles.memoryImage} />
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <Pressable style={styles.logoutButton} onPress={logout}>
                <AppText style={styles.logoutText}>Log Out</AppText>
            </Pressable>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.background, '#000000']} style={styles.background}>
                {isPublicView ? (
                    <FlatList
                        data={memories}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <MemoryCard memory={item} onToggleLike={toggleLike} />
                        )}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {renderHeader()}
                        {renderPrivateContent()}
                    </ScrollView>
                )}
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(21, 255, 117, 0.1)',
        borderWidth: 1,
        borderColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 24,
        color: colors.accent,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 24,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: colors.card,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border,
        marginHorizontal: 24,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
        width: '100%',
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleActive: {
        backgroundColor: colors.accent,
    },
    toggleText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#021007',
        fontWeight: 'bold',
    },
    privateContainer: {
        flex: 1,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        color: colors.accent,
        marginBottom: 16,
    },
    emptyText: {
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    horizontalScroll: {
        gap: 12,
    },
    planCard: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        width: 160,
        height: 120,
        justifyContent: 'space-between',
    },
    planTheme: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: 'bold',
    },
    planHeadline: {
        color: colors.textPrimary,
        fontSize: 14,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    memoryItem: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.card,
    },
    memoryImage: {
        width: '100%',
        height: '100%',
    },
    logoutButton: {
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.error,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
    },
    logoutText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '600',
    },
});
