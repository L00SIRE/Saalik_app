// ============================================
// SAALIK BRAND COLORS - Original Theme
// ============================================

// Original dark, elegant Nepal-inspired palette
export const colors = {
  // Core Brand Colors
  background: '#021d0f',           // Deep forest green/black
  card: 'rgba(2, 18, 8, 0.85)',    // Translucent dark card
  accent: '#15ff75',               // Vibrant green accent
  accentMuted: '#0cc65a',          // Muted green

  // Text Colors
  textPrimary: '#f8fff4',          // Light text on dark
  textSecondary: '#94d5a3',        // Muted green text
  textLight: '#ffffff',            // Pure white
  textMuted: '#6b8f73',            // Very muted text

  // UI Elements
  border: 'rgba(21, 255, 117, 0.4)', // Green-tinted border
  inputBg: 'rgba(255, 255, 255, 0.05)', // Subtle input background

  // Status Colors
  success: '#15ff75',              // Same as accent
  successLight: '#22C55E',         // Lighter green
  warning: '#FBBF24',              // Gold/amber
  error: '#ff6b6b',                // Coral red

  // Interactive
  primary: '#15ff75',              // Primary actions (same as accent)
  primaryLight: '#4dff99',         // Hover state
  primaryDark: '#0cc65a',          // Pressed state

  // Rating
  star: '#FBBF24',                 // Gold stars
  starEmpty: '#4a5a4d',            // Empty star

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(255, 255, 255, 0.1)',

  // Gradients (for LinearGradient)
  gradientPrimary: ['#021d0f', '#0a3d1f'],
  gradientCard: ['rgba(2, 18, 8, 0.95)', 'rgba(2, 18, 8, 0.7)'],
  gradientHero: ['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.3)'],
};

// Category-specific colors (kept vibrant for visual distinction)
export const categoryColors: Record<string, string> = {
  HISTORICAL: '#8B5CF6',   // Purple
  CULTURAL: '#EC4899',     // Pink
  FOOD: '#F59E0B',         // Amber
  RELIGIOUS: '#6366F1',    // Indigo
  ADVENTURE: '#10B981',    // Emerald
  PHOTOGRAPHY: '#3B82F6',  // Blue
  NATURE: '#22C55E',       // Green
  NIGHTLIFE: '#A855F7',    // Violet
};

export const categoryIcons: Record<string, string> = {
  HISTORICAL: 'library',
  CULTURAL: 'color-palette',
  FOOD: 'restaurant',
  RELIGIOUS: 'flame',
  ADVENTURE: 'compass',
  PHOTOGRAPHY: 'camera',
  NATURE: 'leaf',
  NIGHTLIFE: 'moon',
};
