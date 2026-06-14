import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';

type TagTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'custom';

interface TagProps {
  label: string;
  tone?: TagTone;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Override colors when `tone="custom"`. */
  bg?: string;
  fg?: string;
  /** Solid filled background (used for status pills). */
  solid?: boolean;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Tag({
  label,
  tone = 'neutral',
  icon,
  bg,
  fg,
  solid = false,
  size = 'md',
  style,
}: TagProps) {
  const palette = tone === 'custom' ? null : TONES[tone];
  const background = palette ? (solid ? palette.solid : palette.tint) : bg;
  const foreground = palette ? (solid ? palette.onSolid : palette.fg) : fg;
  const sizeStyle = size === 'sm' ? sizes.sm : sizes.md;
  const iconSize = size === 'sm' ? 11 : 13;

  return (
    <View style={[styles.tag, sizeStyle.container, { backgroundColor: background }, style]}>
      {icon && <Ionicons name={icon} size={iconSize} color={foreground} />}
      <AppText
        variant="overline"
        style={{
          color: foreground,
          fontSize: size === 'sm' ? 10 : 11,
          letterSpacing: 0.8,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

const TONES: Record<Exclude<TagTone, 'custom'>, {
  tint: string;
  fg: string;
  solid: string;
  onSolid: string;
}> = {
  neutral: {
    tint: 'rgba(255,255,255,0.08)',
    fg: colors.textSecondary,
    solid: '#1f3a29',
    onSolid: '#fff',
  },
  accent: {
    tint: 'rgba(21, 255, 117, 0.14)',
    fg: colors.accent,
    solid: colors.accent,
    onSolid: '#021007',
  },
  success: {
    tint: 'rgba(34, 197, 94, 0.16)',
    fg: colors.successLight,
    solid: colors.successLight,
    onSolid: '#fff',
  },
  warning: {
    tint: 'rgba(251, 191, 36, 0.16)',
    fg: colors.warning,
    solid: colors.warning,
    onSolid: '#000',
  },
  danger: {
    tint: 'rgba(255, 107, 107, 0.16)',
    fg: colors.error,
    solid: colors.error,
    onSolid: '#fff',
  },
  info: {
    tint: 'rgba(59, 130, 246, 0.16)',
    fg: '#60a5fa',
    solid: '#3B82F6',
    onSolid: '#fff',
  },
};

const sizes = {
  sm: { container: { paddingHorizontal: space.sm, paddingVertical: 3 } },
  md: { container: { paddingHorizontal: space.md, paddingVertical: 5 } },
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
});
