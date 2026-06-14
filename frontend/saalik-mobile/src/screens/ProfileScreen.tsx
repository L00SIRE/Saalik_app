import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AppText } from '@components/AppText';
import { AppTextInput } from '@components/AppTextInput';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Tag } from '@components/Tag';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';
import { useAuth } from '../context/AuthContext';
import { getMyBookings, getMyReviews, getSavedTourIds } from '../services/api';

interface MenuRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper?: string;
  onPress: () => void;
  highlight?: boolean;
  destructive?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuRow[];
}

export function ProfileScreen() {
  const { user, logout, isDemo, demoPersona, resetDemo, exitDemo, updateProfile } = useAuth();
  const navigation = useNavigation<any>();

  // ─── Live profile stats (tours taken / reviews / saved) ─────────────────────
  const [stats, setStats] = useState({ tours: 0, reviews: 0, saved: 0 });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const [past, reviews, saved] = await Promise.all([
            getMyBookings('past'),
            getMyReviews(),
            getSavedTourIds(),
          ]);
          if (active) {
            setStats({ tours: past.length, reviews: reviews.length, saved: saved.length });
          }
        } catch {
          // Leave stats at their last good value.
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  // ─── Edit-profile modal ─────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

  const openEdit = () => {
    setDraftName(user?.name ?? '');
    setDraftEmail(user?.email ?? '');
    setDraftPhone(user?.phone ?? '');
    setEditing(true);
  };

  const saveEdit = () => {
    const name = draftName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    updateProfile({
      name,
      email: draftEmail.trim() || user?.email || '',
      phone: draftPhone.trim() || undefined,
    });
    setEditing(false);
  };

  const handleLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);

  const handleResetDemo = () =>
    Alert.alert(
      'Reset demo data?',
      "This wipes anything you booked or reviewed during this demo session and starts you fresh as " +
        (demoPersona === 'guide-bishnu' ? 'Bishnu' : 'Suman') +
        '.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDemo();
            Alert.alert('Done', 'Demo data has been reset.');
          },
        },
      ],
    );

  const handleExitDemo = () =>
    Alert.alert(
      'Exit demo?',
      'You\'ll be signed out and returned to the login screen. Anything you did in this demo will be discarded.',
      [
        { text: 'Stay in demo', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: exitDemo },
      ],
    );

  const demoGroup: MenuGroup | null = isDemo
    ? {
        title: 'Demo session',
        items: [
          {
            icon: 'refresh-outline',
            label: 'Reset demo data',
            helper: 'Restore the demo to its starting state',
            onPress: handleResetDemo,
          },
          {
            icon: 'exit-outline',
            label: 'Exit demo',
            helper: 'Return to the login screen',
            onPress: handleExitDemo,
            destructive: true,
          },
        ],
      }
    : null;

  const baseGroups: MenuGroup[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit profile',
          helper: 'Name, email, contact details',
          onPress: openEdit,
        },
        {
          icon: 'heart-outline',
          label: 'Saved tours',
          helper: stats.saved > 0 ? `${stats.saved} on your wishlist` : 'Your wishlist',
          onPress: () => navigation.navigate('Saved'),
        },
        {
          icon: 'star-outline',
          label: 'My reviews',
          helper: stats.reviews > 0 ? `${stats.reviews} written` : 'Reviews you’ve written',
          onPress: () => navigation.navigate('MyReviews'),
        },
      ],
    },
    {
      title: 'Discover',
      items: [
        {
          icon: 'images-outline',
          label: 'Gallery',
          helper: 'Nepal through Saalik’s tours',
          onPress: () => navigation.navigate('Gallery'),
        },
        {
          icon: 'location-outline',
          label: 'Places to visit',
          helper: 'Tick off the valley’s hotspots',
          onPress: () => navigation.navigate('PlacesTab', { screen: 'Checkpoints' }),
        },
      ],
    },
    {
      title: 'For guides',
      items: [
        {
          icon: 'compass-outline',
          label: 'Become a Saalik guide',
          helper: 'Share your Nepal with the world',
          onPress: () =>
            Alert.alert(
              'Become a guide',
              'Share your passion for Nepal with travelers from around the world. Apply to become a Saalik guide!',
            ),
          highlight: true,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          icon: 'settings-outline',
          label: 'App settings',
          helper: 'Notifications, currency, language',
          onPress: () => navigation.navigate('Settings'),
        },
        {
          icon: 'help-circle-outline',
          label: 'Help & support',
          onPress: () =>
            Alert.alert('Contact us', 'Email: support@saalik.com\nPhone: +977-1-4XXXXXX'),
        },
        {
          icon: 'information-circle-outline',
          label: 'About Saalik',
          onPress: () =>
            Alert.alert(
              'About Saalik',
              'Saalik connects travelers with passionate local guides for free walking tours across Nepal.\n\nVersion 2.0.0',
            ),
        },
      ],
    },
  ];

  // Demo controls live at the very end — out of the way, not the first thing seen.
  const groups: MenuGroup[] = demoGroup ? [...baseGroups, demoGroup] : baseGroups;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Profile" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile hero card */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['rgba(21, 255, 117, 0.18)', 'rgba(21, 255, 117, 0.02)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroInner}>
            <View style={styles.avatarBlock}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <AppText variant="h1" tone="inverse">
                    {user?.name?.charAt(0)?.toUpperCase() || 'T'}
                  </AppText>
                </View>
              )}
              <Pressable
                style={({ pressed }) => [styles.avatarEdit, pressed && styles.pressed]}
                onPress={openEdit}
              >
                <Ionicons name="pencil" size={13} color="#021007" />
              </Pressable>
            </View>
            <View style={styles.heroIdentity}>
              <View style={styles.nameRow}>
                <AppText variant="h2" numberOfLines={1}>
                  {user?.name || 'Traveler'}
                </AppText>
                <Tag
                  label={user?.role === 'GUIDE' ? 'Guide' : 'Explorer'}
                  tone={user?.role === 'GUIDE' ? 'accent' : 'neutral'}
                  size="sm"
                />
              </View>
              <AppText variant="bodySm" tone="secondary" numberOfLines={1}>
                {user?.email || 'demo@saalik.com'}
              </AppText>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat value={String(stats.tours)} label="Tours" />
            <View style={styles.statsDivider} />
            <Stat value={String(stats.reviews)} label="Reviews" />
            <View style={styles.statsDivider} />
            <Stat value={String(stats.saved)} label="Saved" />
          </View>
        </View>

        {/* Menu groups */}
        {groups.map((group) => (
          <View key={group.title} style={styles.group}>
            <AppText variant="overline" tone="muted" style={styles.groupTitle}>
              {group.title}
            </AppText>
            <Card variant="outlined" noPadding radius="lg" style={styles.menuCard}>
              {group.items.map((item, idx) => {
                const iconColor = item.destructive
                  ? colors.error
                  : item.highlight
                    ? colors.accent
                    : colors.textSecondary;
                const labelTone = item.destructive
                  ? 'error'
                  : item.highlight
                    ? 'accent'
                    : 'primary';
                return (
                  <Pressable
                    key={item.label}
                    onPress={item.onPress}
                    style={({ pressed }) => [
                      styles.menuRow,
                      idx > 0 && styles.menuRowDivider,
                      item.highlight && styles.menuRowHighlight,
                      pressed && styles.menuRowPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.menuIcon,
                        item.highlight && styles.menuIconHighlight,
                        item.destructive && styles.menuIconDestructive,
                      ]}
                    >
                      <Ionicons name={item.icon} size={18} color={iconColor} />
                    </View>
                    <View style={styles.menuTextBlock}>
                      <AppText variant="bodyLg" tone={labelTone} style={styles.menuLabel}>
                        {item.label}
                      </AppText>
                      {item.helper && (
                        <AppText variant="caption" tone="muted">
                          {item.helper}
                        </AppText>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))}

        {!isDemo && (
          <Button
            label="Log out"
            variant="danger"
            onPress={handleLogout}
            leftIcon="log-out-outline"
            fullWidth
            style={styles.logout}
          />
        )}

        <View style={styles.appInfo}>
          <AppText variant="overline" tone="muted">
            Saalik
          </AppText>
          <AppText variant="caption" tone="muted">
            Nepal Tour Platform · v2.0
          </AppText>
        </View>
      </ScrollView>

      {/* Edit profile modal */}
      <Modal
        visible={editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setEditing(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <AppText variant="h3">Edit profile</AppText>
              <Pressable onPress={() => setEditing(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.modalField}>
              <AppText variant="label" tone="secondary">
                Name
              </AppText>
              <AppTextInput
                placeholder="Your name"
                value={draftName}
                onChangeText={setDraftName}
                leftIcon="person-outline"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.modalField}>
              <AppText variant="label" tone="secondary">
                Email
              </AppText>
              <AppTextInput
                placeholder="you@example.com"
                value={draftEmail}
                onChangeText={setDraftEmail}
                leftIcon="mail-outline"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <View style={styles.modalField}>
              <AppText variant="label" tone="secondary">
                Phone (optional)
              </AppText>
              <AppTextInput
                placeholder="+977 ..."
                value={draftPhone}
                onChangeText={setDraftPhone}
                leftIcon="call-outline"
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={saveEdit}
              />
            </View>

            <Button
              label="Save changes"
              onPress={saveEdit}
              leftIcon="checkmark"
              fullWidth
              size="lg"
              style={styles.modalSave}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="h2">{value}</AppText>
      <AppText variant="caption" tone="muted" style={styles.statLabel}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
  },

  // Hero card
  heroCard: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(21, 255, 117, 0.18)',
    padding: space.xl,
    marginBottom: space.xxl,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  avatarBlock: {
    position: 'relative',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarFallback: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  heroIdentity: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    letterSpacing: 0.5,
  },
  statsDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Groups
  group: {
    marginBottom: space.xl,
  },
  groupTitle: {
    marginLeft: space.xs,
    marginBottom: space.sm,
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  menuRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  menuRowHighlight: {
    backgroundColor: 'rgba(21, 255, 117, 0.05)',
  },
  menuRowPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconHighlight: {
    backgroundColor: 'rgba(21, 255, 117, 0.12)',
  },
  menuIconDestructive: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  menuTextBlock: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    lineHeight: 20,
  },

  // Logout
  logout: {
    marginTop: space.sm,
  },

  // App info
  appInfo: {
    alignItems: 'center',
    gap: 4,
    marginTop: space.xxl,
  },

  // Edit modal
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#06291a',
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.huge,
    borderTopWidth: 1,
    borderColor: 'rgba(21, 255, 117, 0.18)',
    gap: space.lg,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: space.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalField: {
    gap: space.xs,
  },
  modalSave: {
    marginTop: space.sm,
  },
});
