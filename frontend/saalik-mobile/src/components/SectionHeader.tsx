import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors } from '@theme/colors';
import { space } from '@theme';

interface SectionHeaderProps {
  title: string;
  /** Optional eyebrow text (overline) above the title. */
  eyebrow?: string;
  /** Optional secondary line below the title. */
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  eyebrow,
  subtitle,
  actionLabel,
  onActionPress,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.text}>
        {eyebrow && (
          <AppText variant="overline" tone="accent" style={styles.eyebrow}>
            {eyebrow}
          </AppText>
        )}
        <AppText variant="h3">{title}</AppText>
        {subtitle && (
          <AppText variant="bodySm" tone="secondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </View>
      {actionLabel && onActionPress && (
        <Pressable
          onPress={onActionPress}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <AppText variant="label" tone="accent">
            {actionLabel}
          </AppText>
          <Ionicons name="arrow-forward" size={14} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: space.md,
    gap: space.md,
  },
  text: {
    flex: 1,
  },
  eyebrow: {
    marginBottom: 4,
  },
  subtitle: {
    marginTop: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.xs,
  },
  actionPressed: {
    opacity: 0.6,
  },
});
