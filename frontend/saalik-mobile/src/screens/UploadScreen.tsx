import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { AppText } from '@components/AppText';
import { AppTextInput } from '@components/AppTextInput';
import { colors } from '@theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export function UploadScreen() {
    const { addMemory } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [caption, setCaption] = useState('');

    const handleUpload = async () => {
        if (!caption.trim()) {
            Alert.alert('Error', 'Please add a caption for your memory.');
            return;
        }

        setUploading(true);
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newMemory = {
            id: Date.now().toString(),
            uri: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000&auto=format&fit=crop', // Random placeholder image (Cinque Terre)
            date: 'Just now',
            type: 'image' as const,
            caption: caption,
            likes: 0,
            isLiked: false,
            user: {
                name: 'Explorer',
                avatar: 'https://i.pravatar.cc/150?u=saalik',
                handle: '@explorer_one',
            },
        };

        addMemory(newMemory);
        setUploading(false);
        setCaption('');
        Alert.alert('Success', 'Memory uploaded successfully!');
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.background, '#000000']} style={styles.background}>
                <AppText style={styles.title}>Upload Memory</AppText>
                <AppText style={styles.subtitle}>Share your journey artifacts with Saalik.</AppText>

                <Pressable
                    style={styles.uploadZone}
                    onPress={() => Alert.alert('Select Media', 'Simulating native gallery picker... (This would open iOS Image Library)')}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator size="large" color={colors.accent} />
                    ) : (
                        <>
                            <View style={styles.iconPlaceholder}>
                                <Ionicons name="cloud-upload-outline" size={32} color={colors.accent} />
                            </View>
                            <AppText style={styles.uploadText}>Tap to select photos or videos</AppText>
                            <AppText style={styles.uploadSubtext}>Supported: JPG, PNG, MP4</AppText>
                        </>
                    )}
                </Pressable>

                <AppTextInput
                    placeholder="Write a caption..."
                    value={caption}
                    onChangeText={setCaption}
                    style={styles.captionInput}
                />

                <Pressable
                    style={[styles.button, (uploading || !caption) && styles.disabledButton]}
                    onPress={handleUpload}
                    disabled={uploading || !caption}
                >
                    <AppText style={styles.buttonText}>
                        {uploading ? 'Uploading...' : 'Share Memory'}
                    </AppText>
                </Pressable>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
        padding: 24,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        color: colors.accent,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 40,
    },
    uploadZone: {
        flex: 1,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: 24,
        backgroundColor: 'rgba(21, 255, 117, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    iconPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(21, 255, 117, 0.1)',
        marginBottom: 8,
    },
    uploadText: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    uploadSubtext: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    captionInput: {
        marginBottom: 24,
    },
    button: {
        backgroundColor: colors.accent,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#021007',
        fontSize: 16,
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.5,
    },
});
