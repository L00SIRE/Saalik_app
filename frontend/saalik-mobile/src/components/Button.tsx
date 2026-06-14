import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors } from '@theme/colors';
import { radii, shadows, space, typography } from '@theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional Ionicons name to show before the label. */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Optional Ionicons name to show after the label. */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading,
  fullWidth,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyle = VARIANTS[variant];
  const sizeStyle = SIZES[size];
  const iconSize = size === 'lg' ? 20 : size === 'sm' ? 14 : 18;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyle.container,
        variantStyle.container,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.activityColor} />
      ) : (
        <View style={styles.row}>
          {leftIcon && (
            <Ionicons name={leftIcon} size={iconSize} color={variantStyle.iconColor} />
          )}
          <AppText
            style={[typography.button, sizeStyle.label, { color: variantStyle.textColor }]}
            numberOfLines={1}
          >
            {label}
          </AppText>
          {rightIcon && (
            <Ionicons name={rightIcon} size={iconSize} color={variantStyle.iconColor} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<ButtonVariant, {
  container: ViewStyle;
  textColor: string;
  iconColor: string;
  activityColor: string;
}> = {
  primary: {
    container: {
      backgroundColor: colors.accent,
      ...shadows.glow,
    },
    textColor: '#021007',
    iconColor: '#021007',
    activityColor: '#021007',
  },
  secondary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    textColor: colors.accent,
    iconColor: colors.accent,
    activityColor: colors.accent,
  },
  ghost: {
    container: {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    textColor: colors.textPrimary,
    iconColor: colors.textPrimary,
    activityColor: colors.textPrimary,
  },
  danger: {
    container: {
      backgroundColor: 'rgba(255, 107, 107, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 107, 0.4)',
    },
    textColor: colors.error,
    iconColor: colors.error,
    activityColor: colors.error,
  },
};

const SIZES: Record<ButtonSize, { container: ViewStyle; label: ViewStyle }> = {
  sm: {
    container: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.md },
    label: { fontSize: 13 } as any,
  },
  md: {
    container: { paddingHorizontal: space.xl, paddingVertical: space.md, borderRadius: radii.md },
    label: {} as any,
  },
  lg: {
    container: { paddingHorizontal: space.xxl, paddingVertical: space.lg, borderRadius: radii.lg },
    label: { fontSize: 16 } as any,
  },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});
