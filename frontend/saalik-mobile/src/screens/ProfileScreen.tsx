import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export function ProfileScreen() {
    const { user, logout } = useAuth();
    const navigation = useNavigation<any>();

    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: logout },
            ]
        );
    };

    const menuItems = [
        {
            icon: 'person-outline',
            label: 'Edit Profile',
            onPress: () => Alert.alert('Coming Soon', 'Profile editing will be available soon!'),
        },
        {
            icon: 'heart-outline',
            label: 'Saved Tours',
            onPress: () => Alert.alert('Coming Soon', 'Your saved tours will appear here.'),
        },
        {
            icon: 'star-outline',
            label: 'My Reviews',
            onPress: () => Alert.alert('Coming Soon', 'View your reviews here.'),
        },
        {
            icon: 'map-outline',
            label: 'Become a Guide',
            onPress: () => Alert.alert('Become a Guide', 'Share your passion for Nepal with travelers from around the world. Apply to become a Saalik guide!'),
            highlight: true,
        },
        {
            icon: 'notifications-outline',
            label: 'Notifications',
            onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available soon.'),
        },
        {
            icon: 'help-circle-outline',
            label: 'Help & Support',
            onPress: () => Alert.alert('Contact Us', 'Email: support@saalik.com\nPhone: +977-1-4XXXXXX'),
        },
        {
            icon: 'information-circle-outline',
            label: 'About Saalik',
            onPress: () => Alert.alert('About Saalik', 'Saalik connects travelers with passionate local guides for free walking tours across Nepal.\n\nVersion 2.0.0'),
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerTitle}>Profile</AppText>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {user?.avatar ? (
                            <Image source={{ uri: user.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <AppText style={styles.avatarInitial}>
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </AppText>
                            </View>
                        )}
                        <Pressable style={styles.editAvatarButton}>
                            <Ionicons name="camera" size={14} color="#fff" />
                        </Pressable>
                    </View>

                    <AppText style={styles.userName}>{user?.name || 'Traveler'}</AppText>
                    <AppText style={styles.userEmail}>{user?.email || 'demo@saalik.com'}</AppText>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <AppText style={styles.statValue}>0</AppText>
                            <AppText style={styles.statLabel}>Tours</AppText>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <AppText style={styles.statValue}>0</AppText>
                            <AppText style={styles.statLabel}>Reviews</AppText>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <AppText style={styles.statValue}>0</AppText>
                            <AppText style={styles.statLabel}>Saved</AppText>
                        </View>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => (
                        <Pressable
                            key={index}
                            style={[styles.menuItem, item.highlight && styles.menuItemHighlight]}
                            onPress={item.onPress}
                        >
                            <Ionicons
                                name={item.icon as any}
                                size={22}
                                color={item.highlight ? colors.accent : colors.textSecondary}
                            />
                            <AppText style={[styles.menuItemText, item.highlight && styles.menuItemTextHighlight]}>
                                {item.label}
                            </AppText>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </Pressable>
                    ))}
                </View>

                {/* Logout Button */}
                <Pressable style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color={colors.error} />
                    <AppText style={styles.logoutText}>Log Out</AppText>
                </Pressable>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <AppText style={styles.appName}>SAALIK</AppText>
                    <AppText style={styles.appVersion}>Nepal Tour Platform v2.0</AppText>
                    <AppText style={styles.appTagline}>Discover Nepal with Passionate Local Guides</AppText>
                </View>
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
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },

    // Profile Card
    profileCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 40,
        fontWeight: '700',
        color: '#fff',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.card,
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    userEmail: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        gap: 24,
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.border,
    },

    // Menu
    menuSection: {
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuItemHighlight: {
        backgroundColor: `${colors.accent}08`,
    },
    menuItemText: {
        flex: 1,
        fontSize: 15,
        color: colors.textPrimary,
    },
    menuItemTextHighlight: {
        color: colors.accent,
        fontWeight: '600',
    },

    // Logout
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        backgroundColor: `${colors.error}10`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${colors.error}30`,
        marginBottom: 32,
    },
    logoutText: {
        fontSize: 15,
        color: colors.error,
        fontWeight: '600',
    },

    // App Info
    appInfo: {
        alignItems: 'center',
        gap: 4,
    },
    appName: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 4,
    },
    appVersion: {
        fontSize: 12,
        color: colors.textMuted,
    },
    appTagline: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 4,
    },
});
