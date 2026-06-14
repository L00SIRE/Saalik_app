import React from 'react';
import { StyleSheet, View, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors } from '@theme/colors';
import { space } from '@theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** If provided, shows a back button on the left. */
  onBack?: () => void;
  /** Optional right-side adornment — pass a Button, IconButton, etc. */
  right?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Standard screen header. Sits inside the SafeAreaView; doesn't add its own.
 * Generous bottom padding so the next section doesn't crowd the title.
 */
export function ScreenHeader({ title, subtitle, onBack, right, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.titleBlock}>
          <AppText variant="h2" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="bodySm" tone="secondary" style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </AppText>
          )}
        </View>
        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
}

const HEADER_BUTTON_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  backButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: HEADER_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  backSpacer: {
    width: 0,
  },
  titleBlock: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
  rightSlot: {
    minWidth: HEADER_BUTTON_SIZE,
    alignItems: 'flex-end',
  },
});
