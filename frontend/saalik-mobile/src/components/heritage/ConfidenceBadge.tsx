import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../AppText';
import { colors } from '@theme/colors';
import type { MatchConfidence } from '../../types/heritage';

const PALETTE: Record<MatchConfidence, { background: string; text: string; label: string }> = {
  HIGH: { background: 'rgba(21, 255, 117, 0.16)', text: colors.success, label: 'High confidence' },
  MEDIUM: { background: 'rgba(251, 191, 36, 0.16)', text: colors.warning, label: 'Medium confidence' },
  LOW: { background: 'rgba(255, 107, 107, 0.16)', text: colors.error, label: 'Low confidence' },
};

export function ConfidenceBadge({ confidence, score }: { confidence: MatchConfidence; score: number }) {
  const palette = PALETTE[confidence];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <AppText style={[styles.text, { color: palette.text }]}>
        {palette.label} - {(score * 100).toFixed(0)}%
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  text: { fontSize: 12 },
});
