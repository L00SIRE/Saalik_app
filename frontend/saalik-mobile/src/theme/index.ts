// Single import surface for the design system.
// Prefer `import { space, radii, shadows, typography, colors } from '@theme'`
// over individual files in screens.

export { colors, categoryColors, categoryIcons } from './colors';
export { space, rhythm } from './spacing';
export type { SpaceKey } from './spacing';
export { radii } from './radii';
export type { RadiusKey } from './radii';
export { shadows } from './shadows';
export type { ShadowKey } from './shadows';
export { typography } from './typography';
export type { TextVariant } from './typography';
