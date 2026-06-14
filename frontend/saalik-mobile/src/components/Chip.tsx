import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Color used for the selected fill. Defaults to brand accent. */
  selectedBg?: string;
  /** Optional leading icon. */
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

/**
 * Selectable horizontal chip — used for category filters, hub filters, etc.
 * Visually distinct from `Tag` (which is a non-interactive status pill).
 */
export function Chip({ label, selected, onPress, selectedBg, icon, style }: ChipProps) {
  const fillColor = selected ? (selectedBg ?? colors.accent) : 'rgba(255,255,255,0.06)';
  const textColor = selected
    ? (selectedBg ? '#fff' : '#021007')
    : colors.textSecondary;
  const iconColor = textColor;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: fillColor },
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={iconColor} />}
      <AppText
        variant="caption"
        style={{ color: textColor, fontWeight: selected ? '700' : '500' }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    // Slight glow border keeps selected chips legible on hero backdrops.
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
