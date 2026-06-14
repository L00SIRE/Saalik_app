import { Text, TextProps, StyleSheet } from 'react-native';
import { typography, type TextVariant } from '@theme/typography';
import { colors } from '@theme/colors';

interface AppTextProps extends TextProps {
  /** Typography variant. Defaults to `body`. */
  variant?: TextVariant;
  /** Convenience color tokens. Pass a custom hex via `style` if needed. */
  tone?: 'primary' | 'secondary' | 'muted' | 'accent' | 'inverse' | 'error';
  /** Override default left alignment. */
  align?: 'auto' | 'left' | 'center' | 'right';
}

const toneToColor: Record<NonNullable<AppTextProps['tone']>, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  accent: colors.accent,
  inverse: '#021007',
  error: colors.error,
};

export function AppText({ variant = 'body', tone, align, style, ...rest }: AppTextProps) {
  const variantStyle = typography[variant];
  const toneStyle = tone ? { color: toneToColor[tone] } : null;
  const alignStyle = align ? { textAlign: align } : null;
  return <Text {...rest} style={[styles.default, variantStyle, toneStyle, alignStyle, style]} />;
}

// Kept for backwards compatibility — older imports that pass raw `style` keep working.
const styles = StyleSheet.create({
  default: {
    fontFamily: 'LeagueSpartan_400Regular',
  },
});
