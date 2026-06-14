import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useAuth } from '@context/AuthContext';
import { colors } from '@theme/colors';
import { space } from '@theme';

/**
 * Sticky strip rendered at the very top of the app while a demo session is
 * active. Tells the user (and any App Store reviewer) that this is a preview,
 * shows which persona is signed in, and gives a one-tap exit. Intentionally
 * thin and unobtrusive — visible but not annoying.
 */
export function DemoBanner() {
  const { isDemo, demoPersona, exitDemo, resetDemo } = useAuth();
  if (!isDemo) return null;

  const personaLabel =
    demoPersona === 'guide-bishnu' ? 'Bishnu — Guide preview' : 'Aanya — Traveler preview';

  const handleExit = () =>
    Alert.alert(
      'Exit demo?',
      'You\'ll be signed out and returned to the login screen. Anything you booked or saved in this demo will be discarded.',
      [
        { text: 'Stay in demo', style: 'cancel' },
        { text: 'Reset demo', onPress: resetDemo, style: 'default' },
        { text: 'Exit', onPress: exitDemo, style: 'destructive' },
      ],
    );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <View style={styles.dot} />
        <View style={styles.textBlock}>
          <AppText variant="overline" tone="inverse" style={styles.label}>
            Demo session
          </AppText>
          <AppText variant="caption" tone="inverse" style={styles.persona} numberOfLines={1}>
            {personaLabel}
          </AppText>
        </View>
        <Pressable
          onPress={handleExit}
          hitSlop={8}
          style={({ pressed }) => [styles.exit, pressed && styles.exitPressed]}
        >
          <AppText variant="label" tone="inverse" style={styles.exitText}>
            Exit
          </AppText>
          <Ionicons name="close" size={14} color="#021007" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.accent,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#021007',
  },
  textBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1,
  },
  persona: {
    fontSize: 12,
    fontWeight: '600',
  },
  exit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  exitPressed: {
    opacity: 0.6,
  },
  exitText: {
    fontSize: 12,
  },
});
