import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@theme/colors';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  /** Decorate as an accent (filled brand color). */
  accent?: boolean;
  style?: ViewStyle;
}

/** Circular icon-only button. Used for header actions and FABs. */
export function IconButton({
  icon,
  onPress,
  size = 40,
  iconSize,
  color,
  background,
  accent,
  style,
}: IconButtonProps) {
  const bg = background ?? (accent ? colors.accent : 'rgba(255,255,255,0.05)');
  const fg = color ?? (accent ? '#021007' : colors.textPrimary);
  const computedIconSize = iconSize ?? Math.round(size * 0.5);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={computedIconSize} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.93 }],
  },
});
