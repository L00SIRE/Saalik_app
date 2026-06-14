import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { AppText } from './AppText';
import { Card, PressableCard } from './Card';
import { Tag } from './Tag';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { space } from '@theme';
import type { Guide } from '@app-types/api';
import { formatRating } from '../services/api';

interface GuideCardProps {
  guide: Guide;
  onPress?: () => void;
  compact?: boolean;
}

export function GuideCard({ guide, onPress, compact = false }: GuideCardProps) {
  const Body = onPress ? (
    <PressableCard onPress={onPress} variant="outlined" radius="lg" style={compact ? styles.compactCard : styles.card}>
      {compact ? <CompactBody guide={guide} /> : <FullBody guide={guide} />}
    </PressableCard>
  ) : (
    <Card variant="outlined" radius="lg" style={compact ? styles.compactCard : styles.card}>
      {compact ? <CompactBody guide={guide} /> : <FullBody guide={guide} />}
    </Card>
  );
  return Body;
}

function FullBody({ guide }: { guide: Guide }) {
  return (
    <View style={styles.fullRow}>
      {guide.user.avatar ? (
        <Image source={{ uri: guide.user.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="person" size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.fullInfo}>
        <View style={styles.nameRow}>
          <AppText variant="h4">{guide.user.name}</AppText>
          {guide.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
              <AppText variant="caption" tone="accent">
                Verified
              </AppText>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <Ionicons name="star" size={13} color={colors.star} />
          <AppText variant="caption" tone="primary" style={styles.statValue}>
            {formatRating(guide.rating)}
          </AppText>
          <AppText variant="caption" tone="muted">
            · {guide.totalReviews} reviews · {guide.totalTours} tours
          </AppText>
        </View>

        <View style={styles.iconLine}>
          <Ionicons name="globe-outline" size={13} color={colors.textSecondary} />
          <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.flexed}>
            {guide.languages.join(', ')}
          </AppText>
        </View>

        {guide.specialties.length > 0 && (
          <View style={styles.specialtiesRow}>
            {guide.specialties.slice(0, 3).map((s, i) => (
              <Tag key={i} label={s} tone="neutral" size="sm" />
            ))}
          </View>
        )}

        <AppText variant="caption" tone="muted" style={styles.experience}>
          {guide.yearsExperience} years experience
        </AppText>
      </View>
    </View>
  );
}

function CompactBody({ guide }: { guide: Guide }) {
  return (
    <View style={styles.compactRow}>
      {guide.user.avatar ? (
        <Image source={{ uri: guide.user.avatar }} style={styles.compactAvatar} />
      ) : (
        <View style={[styles.compactAvatar, styles.avatarFallback]}>
          <Ionicons name="person" size={20} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.compactInfo}>
        <View style={styles.nameRow}>
          <AppText variant="h4" style={styles.compactName}>
            {guide.user.name}
          </AppText>
          {guide.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
          )}
        </View>
        <View style={styles.statsRow}>
          <Ionicons name="star" size={12} color={colors.star} />
          <AppText variant="caption" tone="primary" style={styles.statValue}>
            {formatRating(guide.rating)}
          </AppText>
          <AppText variant="caption" tone="secondary">
            · {guide.totalReviews} reviews
          </AppText>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.lg,
  },
  compactCard: {
    padding: space.md,
  },
  fullRow: {
    flexDirection: 'row',
    gap: space.lg,
  },
  fullInfo: {
    flex: 1,
    gap: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '700',
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  flexed: {
    flex: 1,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: space.xs,
  },
  experience: {
    marginTop: space.xs,
  },

  // Compact
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  compactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  compactInfo: {
    flex: 1,
    gap: 4,
  },
  compactName: {
    fontSize: 15,
    lineHeight: 20,
  },
});
