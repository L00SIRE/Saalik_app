import { Platform, ViewStyle } from 'react-native';

// Elevation tokens that produce reasonable iOS shadows + Android elevation.
// On a dark background, subtle iOS shadows are barely visible; we lean on
// borders and contrast for separation, and reserve real shadows for floating
// surfaces (FAB, sticky bottom bars, modals).

type Shadow = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const make = (
  opacity: number,
  radius: number,
  offsetY: number,
  elevation: number,
  color = '#000',
): Shadow => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: Platform.OS === 'ios' ? opacity : 0,
  shadowRadius: radius,
  elevation,
});

export const shadows = {
  none: make(0, 0, 0, 0),
  // Resting card. Almost invisible on dark UI but adds subtle depth.
  sm: make(0.18, 6, 2, 2),
  // Pressed-up surface (search bar, sticky headers).
  md: make(0.28, 12, 4, 4),
  // Floating action button, modals.
  lg: make(0.4, 18, 8, 8),
  // Glow accents — use the brand green as shadow color for emphasis.
  glow: make(0.45, 16, 6, 8, '#15ff75'),
} as const;

export type ShadowKey = keyof typeof shadows;
