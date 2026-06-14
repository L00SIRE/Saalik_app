import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { colors } from '@theme/colors';
import { radii, shadows, space } from '@theme';

type CardVariant = 'flat' | 'elevated' | 'outlined';

type SharedProps = {
  variant?: CardVariant;
  /** Disable internal padding (e.g. when the card holds an edge-to-edge image). */
  noPadding?: boolean;
  /** Override radius. Defaults to `lg`. */
  radius?: keyof typeof radii;
};

type CardProps = ViewProps & SharedProps;
type PressableCardProps = Omit<PressableProps, 'style' | 'children'> &
  SharedProps & {
    children: React.ReactNode;
    style?: ViewStyle;
  };

const variantStyles: Record<CardVariant, ViewStyle> = {
  flat: {
    backgroundColor: colors.card,
  },
  elevated: {
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  outlined: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
};

export function Card({ variant = 'outlined', noPadding, radius = 'lg', style, children, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        { borderRadius: radii[radius] },
        variantStyles[variant],
        !noPadding && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Pressable variant — gives consistent press feedback (scale + dim). */
export function PressableCard({
  variant = 'outlined',
  noPadding,
  radius = 'lg',
  style,
  children,
  disabled,
  ...rest
}: PressableCardProps) {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: radii[radius] },
        variantStyles[variant],
        !noPadding && styles.padded,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  padded: {
    padding: space.lg,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
