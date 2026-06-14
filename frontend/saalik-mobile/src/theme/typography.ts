import { TextStyle } from 'react-native';

// Single source of truth for all text styles.
// Variants describe intent ("h1", "body") so screens don't reach for raw fontSize.
//
// Note: only LeagueSpartan_400Regular is loaded today, so weight is faked with
// `fontWeight`. When League Spartan SemiBold/Bold get added to assets, swap the
// `fontFamily` per-weight here and every screen picks them up automatically.

const REGULAR = 'LeagueSpartan_400Regular';

const base: TextStyle = {
  fontFamily: REGULAR,
  color: '#f8fff4',
};

export const typography = {
  // Backwards-compat alias — still consumed by AppText/AppTextInput defaults.
  regular: REGULAR,
  bold: REGULAR,

  // ─── Display & headings ──────────────────────────────────────────────────
  display: {
    ...base,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    letterSpacing: -0.5,
  } as TextStyle,
  h1: {
    ...base,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.3,
  } as TextStyle,
  h2: {
    ...base,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.2,
  } as TextStyle,
  h3: {
    ...base,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  } as TextStyle,
  h4: {
    ...base,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  } as TextStyle,

  // ─── Body ────────────────────────────────────────────────────────────────
  bodyLg: {
    ...base,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  } as TextStyle,
  body: {
    ...base,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  } as TextStyle,
  bodySm: {
    ...base,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  } as TextStyle,

  // ─── Utility ─────────────────────────────────────────────────────────────
  label: {
    ...base,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  } as TextStyle,
  caption: {
    ...base,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  } as TextStyle,
  overline: {
    ...base,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,
  button: {
    ...base,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  } as TextStyle,
} as const;

export type TextVariant = Exclude<keyof typeof typography, 'regular' | 'bold'>;
