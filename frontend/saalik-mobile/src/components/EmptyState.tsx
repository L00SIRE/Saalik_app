import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export function EmptyState({ icon, title, body, actionLabel, onActionPress, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconRing}>
        <Ionicons name={icon} size={36} color={colors.accent} />
      </View>
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      {body && (
        <AppText variant="body" tone="secondary" align="center" style={styles.body}>
          {body}
        </AppText>
      )}
      {actionLabel && onActionPress && (
        <Button
          label={actionLabel}
          onPress={onActionPress}
          rightIcon="arrow-forward"
          style={styles.cta}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.huge,
    paddingHorizontal: space.xxl,
    gap: space.md,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(21, 255, 117, 0.35)',
    backgroundColor: 'rgba(21, 255, 117, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  body: {
    maxWidth: 280,
  },
  cta: {
    marginTop: space.md,
  },
});
