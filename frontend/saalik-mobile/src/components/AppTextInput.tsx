import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@theme/colors';
import { space, radii, typography } from '@theme';

interface AppTextInputProps extends TextInputProps {
  /** Optional leading icon (Ionicons name). */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Optional trailing icon. Provide `onRightIconPress` to make it tappable. */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  /** Container style override (e.g. flex layout). */
  containerStyle?: ViewStyle;
  /** Render an inline error border + helper handled by parent. */
  hasError?: boolean;
}

export function AppTextInput({
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  hasError,
  onFocus,
  onBlur,
  style,
  ...rest
}: AppTextInputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = hasError
    ? colors.error
    : focused
      ? colors.accent
      : colors.border;

  return (
    <View
      style={[
        styles.wrapper,
        { borderColor },
        focused && !hasError && styles.wrapperFocused,
        containerStyle,
      ]}
    >
      {leftIcon && (
        <Ionicons
          name={leftIcon}
          size={18}
          color={focused ? colors.accent : colors.textSecondary}
          style={styles.leftIcon}
        />
      )}
      <TextInput
        {...rest}
        style={[styles.input, style]}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={18}
          color={colors.textMuted}
          style={styles.rightIcon}
          onPress={onRightIconPress}
          suppressHighlighting
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    minHeight: 48,
  },
  wrapperFocused: {
    backgroundColor: 'rgba(21, 255, 117, 0.06)',
  },
  input: {
    flex: 1,
    ...typography.bodyLg,
    color: colors.textPrimary,
    paddingVertical: space.sm,
    paddingHorizontal: 0,
  },
  leftIcon: {
    marginRight: space.sm,
  },
  rightIcon: {
    marginLeft: space.sm,
  },
});
