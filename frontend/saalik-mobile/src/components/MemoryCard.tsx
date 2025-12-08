import React from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { AppText } from './AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { Memory } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

interface MemoryCardProps {
    memory: Memory;
    onToggleLike: (id: string) => void;
}

export function MemoryCard({ memory, onToggleLike }: MemoryCardProps) {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image source={{ uri: memory.user.avatar }} style={styles.avatar} />
                <View style={styles.headerText}>
                    <AppText style={styles.username}>{memory.user.name}</AppText>
                    <AppText style={styles.handle}>{memory.user.handle}</AppText>
                </View>
                <AppText style={styles.date}>{memory.date}</AppText>
            </View>

            {/* Content */}
            <View style={styles.imageContainer}>
                <Image source={{ uri: memory.uri }} style={styles.image} resizeMode="cover" />
            </View>

            {/* Actions */}
            <View style={styles.footer}>
                <View style={styles.actions}>
                    <Pressable onPress={() => onToggleLike(memory.id)} style={styles.actionButton}>
                        <Ionicons
                            name={memory.isLiked ? "heart" : "heart-outline"}
                            size={28}
                            color={memory.isLiked ? colors.error : colors.textPrimary}
                        />
                        <AppText style={styles.actionText}>{memory.likes}</AppText>
                    </Pressable>

                    <Pressable style={styles.actionButton}>
                        <Ionicons name="chatbubble-outline" size={26} color={colors.textPrimary} />
                    </Pressable>

                    <Pressable style={styles.actionButton}>
                        <Ionicons name="paper-plane-outline" size={26} color={colors.textPrimary} />
                    </Pressable>
                </View>

                {/* Caption */}
                {memory.caption && (
                    <View style={styles.captionContainer}>
                        <AppText style={styles.captionUsername}>{memory.user.handle}</AppText>
                        <AppText style={styles.caption}>{memory.caption}</AppText>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        backgroundColor: colors.card,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerText: {
        flex: 1,
    },
    username: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    handle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    date: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1, // Square for now, or 4:5
        backgroundColor: '#1a1a1a',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    footer: {
        padding: 12,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginBottom: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    captionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    captionUsername: {
        fontWeight: 'bold',
        fontSize: 14,
        color: colors.textPrimary,
    },
    caption: {
        fontSize: 14,
        color: colors.textPrimary,
        flex: 1,
    },
});
