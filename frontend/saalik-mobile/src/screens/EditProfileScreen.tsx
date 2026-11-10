import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export function EditProfileScreen() {
    const navigation = useNavigation<any>();
    const { user } = useAuth();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [bio, setBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);

        Alert.alert('Success', 'Your profile has been updated!', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    };

    const handleChangePhoto = () => {
        Alert.alert(
            'Change Photo',
            'Choose an option',
            [
                { text: 'Take Photo', onPress: () => Alert.alert('Demo', 'Camera would open here') },
                { text: 'Choose from Library', onPress: () => Alert.alert('Demo', 'Photo library would open here') },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <AppText style={styles.headerTitle}>Edit Profile</AppText>
                <Pressable
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <AppText style={styles.saveButtonText}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </AppText>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <Pressable style={styles.avatarContainer} onPress={handleChangePhoto}>
                            {user?.avatar ? (
                                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <AppText style={styles.avatarInitial}>
                                        {name?.charAt(0)?.toUpperCase() || 'U'}
                                    </AppText>
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <Ionicons name="camera" size={16} color="#fff" />
                            </View>
                        </Pressable>
                        <AppText style={styles.changePhotoText}>Tap to change photo</AppText>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.formSection}>
                        <View style={styles.inputGroup}>
                            <AppText style={styles.label}>Full Name</AppText>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <AppText style={styles.label}>Email</AppText>
                            <TextInput
                                style={[styles.input, styles.inputDisabled]}
                                value={email}
                                editable={false}
                                placeholder="your@email.com"
                                placeholderTextColor={colors.textMuted}
                            />
                            <AppText style={styles.hint}>Email cannot be changed</AppText>
                        </View>

                        <View style={styles.inputGroup}>
                            <AppText style={styles.label}>Phone Number</AppText>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="+1 234 567 8900"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <AppText style={styles.label}>Bio</AppText>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell us about yourself..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                maxLength={200}
                            />
                            <AppText style={styles.charCount}>{bio.length}/200</AppText>
                        </View>
                    </View>

                    {/* Danger Zone */}
                    <View style={styles.dangerSection}>
                        <AppText style={styles.dangerTitle}>Account</AppText>
                        <Pressable
                            style={styles.dangerButton}
                            onPress={() => Alert.alert('Delete Account', 'Please contact support@saalik.com to delete your account.')}
                        >
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                            <AppText style={styles.dangerButtonText}>Delete Account</AppText>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.accent,
        borderRadius: 20,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#021007',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    avatarPlaceholder: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: '700',
        color: '#fff',
    },
    editBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.background,
    },
    changePhotoText: {
        fontSize: 14,
        color: colors.primary,
        marginTop: 12,
    },
    formSection: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    input: {
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputDisabled: {
        opacity: 0.6,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 14,
    },
    hint: {
        fontSize: 12,
        color: colors.textMuted,
    },
    charCount: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'right',
    },
    dangerSection: {
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    dangerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 12,
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    dangerButtonText: {
        fontSize: 15,
        color: colors.error,
    },
});
