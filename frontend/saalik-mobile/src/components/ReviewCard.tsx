import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { AppText } from './AppText';
import { Card } from './Card';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { radii, space } from '@theme';
import type { Review } from '@app-types/api';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.header}>
        {review.user.avatar ? (
          <Image source={{ uri: review.user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <AppText variant="h4" tone="inverse">
              {review.user.name.charAt(0).toUpperCase()}
            </AppText>
          </View>
        )}
        <View style={styles.headerInfo}>
          <AppText variant="h4" style={styles.name}>
            {review.user.name}
          </AppText>
          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < review.rating ? 'star' : 'star-outline'}
                size={13}
                color={i < review.rating ? colors.star : colors.starEmpty}
              />
            ))}
            <AppText variant="caption" tone="muted" style={styles.date}>
              · {formatRelative(review.createdAt)}
            </AppText>
          </View>
        </View>
      </View>

      {review.title && (
        <AppText variant="h4" style={styles.title}>
          {review.title}
        </AppText>
      )}
      <AppText variant="body" tone="secondary">
        {review.comment}
      </AppText>

      {review.photos && review.photos.length > 0 && (
        <View style={styles.photosRow}>
          {review.photos.slice(0, 3).map((p, i) => (
            <Image key={i} source={{ uri: p }} style={styles.photo} />
          ))}
        </View>
      )}
    </Card>
  );
}

function formatRelative(dateString: string): string {
  const d = new Date(dateString);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return d.toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
  },
  header: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    marginBottom: space.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  date: {
    marginLeft: 4,
  },
  title: {
    fontSize: 15,
  },
  photosRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: radii.sm,
  },
});
