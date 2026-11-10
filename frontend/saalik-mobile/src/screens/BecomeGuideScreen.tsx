import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const LANGUAGES = ['English', 'Nepali', 'Hindi', 'Mandarin', 'Japanese', 'German', 'French', 'Spanish'];
const SPECIALTIES = ['Historical', 'Cultural', 'Food', 'Religious', 'Adventure', 'Photography', 'Nature', 'Nightlife', 'Architecture', 'Art'];

interface FormData {
    phone: string;
    languages: string[];
    yearsExperience: string;
    specialties: string[];
    certifications: string;
    motivation: string;
    uniqueValue: string;
}

export function BecomeGuideScreen() {
    const navigation = useNavigation<any>();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        phone: '',
        languages: [],
        yearsExperience: '',
        specialties: [],
        certifications: '',
        motivation: '',
        uniqueValue: '',
    });

    const totalSteps = 4;

    const updateField = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayItem = (field: 'languages' | 'specialties', item: string) => {
        setFormData(prev => {
            const current = prev[field];
            if (current.includes(item)) {
                return { ...prev, [field]: current.filter(i => i !== item) };
            } else {
                return { ...prev, [field]: [...current, item] };
            }
        });
    };

    const validateStep = (): boolean => {
        switch (step) {
            case 1:
                if (!formData.phone || formData.phone.length < 10) {
                    Alert.alert('Missing Info', 'Please enter a valid phone number');
                    return false;
                }
                if (formData.languages.length === 0) {
                    Alert.alert('Missing Info', 'Please select at least one language');
                    return false;
                }
                return true;
            case 2:
                if (!formData.yearsExperience) {
                    Alert.alert('Missing Info', 'Please enter your years of experience');
                    return false;
                }
                if (formData.specialties.length === 0) {
                    Alert.alert('Missing Info', 'Please select at least one specialty');
                    return false;
                }
                return true;
            case 3:
                if (formData.motivation.length < 50) {
                    Alert.alert('Tell Us More', 'Please write at least 50 characters about why you want to join');
                    return false;
                }
                if (formData.uniqueValue.length < 20) {
                    Alert.alert('Tell Us More', 'Please describe what makes you unique (at least 20 characters)');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep()) {
            if (step < totalSteps) {
                setStep(step + 1);
            } else {
                handleSubmit();
            }
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            navigation.goBack();
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // In demo mode, simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            Alert.alert(
                '🎉 Application Submitted!',
                'Thank you for applying to become a Saalik guide! Our team will review your application within 48 hours.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to submit application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <>
            <AppText style={styles.stepTitle}>Personal Information</AppText>
            <AppText style={styles.stepSubtitle}>How can travelers contact you?</AppText>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Phone Number *</AppText>
                <TextInput
                    style={styles.input}
                    placeholder="+977 98XXXXXXXX"
                    placeholderTextColor={colors.textMuted}
                    value={formData.phone}
                    onChangeText={(v) => updateField('phone', v)}
                    keyboardType="phone-pad"
                />
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Languages You Speak *</AppText>
                <AppText style={styles.hint}>Select all that apply</AppText>
                <View style={styles.chipContainer}>
                    {LANGUAGES.map(lang => (
                        <Pressable
                            key={lang}
                            style={[
                                styles.chip,
                                formData.languages.includes(lang) && styles.chipSelected,
                            ]}
                            onPress={() => toggleArrayItem('languages', lang)}
                        >
                            <AppText style={[
                                styles.chipText,
                                formData.languages.includes(lang) && styles.chipTextSelected,
                            ]}>
                                {lang}
                            </AppText>
                        </Pressable>
                    ))}
                </View>
            </View>
        </>
    );

    const renderStep2 = () => (
        <>
            <AppText style={styles.stepTitle}>Your Experience</AppText>
            <AppText style={styles.stepSubtitle}>Tell us about your guiding background</AppText>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Years of Experience *</AppText>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., 5"
                    placeholderTextColor={colors.textMuted}
                    value={formData.yearsExperience}
                    onChangeText={(v) => updateField('yearsExperience', v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                />
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Specialties *</AppText>
                <AppText style={styles.hint}>What types of tours can you lead?</AppText>
                <View style={styles.chipContainer}>
                    {SPECIALTIES.map(spec => (
                        <Pressable
                            key={spec}
                            style={[
                                styles.chip,
                                formData.specialties.includes(spec) && styles.chipSelected,
                            ]}
                            onPress={() => toggleArrayItem('specialties', spec)}
                        >
                            <AppText style={[
                                styles.chipText,
                                formData.specialties.includes(spec) && styles.chipTextSelected,
                            ]}>
                                {spec}
                            </AppText>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Certifications (Optional)</AppText>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Nepal Tourism Board Certified"
                    placeholderTextColor={colors.textMuted}
                    value={formData.certifications}
                    onChangeText={(v) => updateField('certifications', v)}
                />
            </View>
        </>
    );

    const renderStep3 = () => (
        <>
            <AppText style={styles.stepTitle}>Why Saalik?</AppText>
            <AppText style={styles.stepSubtitle}>Help us get to know you better</AppText>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Why do you want to be a Saalik guide? *</AppText>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Share your passion for Nepal and what motivates you to share it with travelers..."
                    placeholderTextColor={colors.textMuted}
                    value={formData.motivation}
                    onChangeText={(v) => updateField('motivation', v)}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                />
                <AppText style={styles.charCount}>
                    {formData.motivation.length}/50 min characters
                </AppText>
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>What makes you unique as a guide? *</AppText>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Your hidden gems, family connections, special stories..."
                    placeholderTextColor={colors.textMuted}
                    value={formData.uniqueValue}
                    onChangeText={(v) => updateField('uniqueValue', v)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>
        </>
    );

    const renderStep4 = () => (
        <>
            <AppText style={styles.stepTitle}>Review Your Application</AppText>
            <AppText style={styles.stepSubtitle}>Make sure everything looks good!</AppText>

            <View style={styles.reviewSection}>
                <View style={styles.reviewItem}>
                    <AppText style={styles.reviewLabel}>Phone</AppText>
                    <AppText style={styles.reviewValue}>{formData.phone}</AppText>
                </View>

                <View style={styles.reviewItem}>
                    <AppText style={styles.reviewLabel}>Languages</AppText>
                    <AppText style={styles.reviewValue}>{formData.languages.join(', ')}</AppText>
                </View>

                <View style={styles.reviewItem}>
                    <AppText style={styles.reviewLabel}>Experience</AppText>
                    <AppText style={styles.reviewValue}>{formData.yearsExperience} years</AppText>
                </View>

                <View style={styles.reviewItem}>
                    <AppText style={styles.reviewLabel}>Specialties</AppText>
                    <AppText style={styles.reviewValue}>{formData.specialties.join(', ')}</AppText>
                </View>

                {formData.certifications && (
                    <View style={styles.reviewItem}>
                        <AppText style={styles.reviewLabel}>Certifications</AppText>
                        <AppText style={styles.reviewValue}>{formData.certifications}</AppText>
                    </View>
                )}

                <View style={styles.reviewItem}>
                    <AppText style={styles.reviewLabel}>Motivation</AppText>
                    <AppText style={styles.reviewValue} numberOfLines={3}>{formData.motivation}</AppText>
                </View>
            </View>

            <View style={styles.agreementBox}>
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                <AppText style={styles.agreementText}>
                    By submitting, you agree to Saalik's guide terms and commit to providing authentic, safe experiences.
                </AppText>
            </View>
        </>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <AppText style={styles.headerTitle}>Become a Guide</AppText>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
                {[1, 2, 3, 4].map((s) => (
                    <View
                        key={s}
                        style={[
                            styles.progressDot,
                            s <= step && styles.progressDotActive,
                        ]}
                    />
                ))}
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <AppText style={styles.stepIndicator}>Step {step} of {totalSteps}</AppText>
                    <Pressable
                        style={[styles.nextButton, loading && styles.buttonDisabled]}
                        onPress={handleNext}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#021007" />
                        ) : (
                            <>
                                <AppText style={styles.nextButtonText}>
                                    {step === totalSteps ? 'Submit Application' : 'Continue'}
                                </AppText>
                                {step < totalSteps && (
                                    <Ionicons name="arrow-forward" size={20} color="#021007" />
                                )}
                            </>
                        )}
                    </Pressable>
                </View>
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
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    progressDotActive: {
        backgroundColor: colors.accent,
        width: 24,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    hint: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: 12,
    },
    input: {
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    textArea: {
        minHeight: 120,
        paddingTop: 14,
    },
    charCount: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'right',
        marginTop: 4,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipSelected: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    chipText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    chipTextSelected: {
        color: '#021007',
        fontWeight: '600',
    },
    reviewSection: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        gap: 16,
        marginBottom: 20,
    },
    reviewItem: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 12,
    },
    reviewLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 4,
    },
    reviewValue: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    agreementBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: `${colors.accent}15`,
        padding: 16,
        borderRadius: 12,
    },
    agreementText: {
        flex: 1,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    footer: {
        padding: 20,
        paddingBottom: 10,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    stepIndicator: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 12,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#021007',
    },
});
