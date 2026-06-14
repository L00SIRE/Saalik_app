// 4-pt baseline grid. Use these tokens instead of magic numbers.
// `space.lg` reads better than `16` and stays consistent across the app.

export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  jumbo: 56,
} as const;

export type SpaceKey = keyof typeof space;

// Vertical rhythm helpers.
export const rhythm = {
  // Distance between sibling sections in a scroll view.
  betweenSections: space.xxl,
  // Distance from screen edge to content.
  screenEdge: space.xl,
  // Internal padding for surfaces (cards, modals).
  surfacePadding: space.lg,
} as const;
