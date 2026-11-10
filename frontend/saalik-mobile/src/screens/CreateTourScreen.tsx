import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Tour categories
const CATEGORIES = [
    { key: 'HISTORICAL', label: 'Historical', icon: 'library' },
    { key: 'CULTURAL', label: 'Cultural', icon: 'color-palette' },
    { key: 'FOOD', label: 'Food & Drink', icon: 'restaurant' },
    { key: 'RELIGIOUS', label: 'Religious', icon: 'flame' },
    { key: 'ADVENTURE', label: 'Adventure', icon: 'compass' },
    { key: 'PHOTOGRAPHY', label: 'Photography', icon: 'camera' },
    { key: 'NATURE', label: 'Nature', icon: 'leaf' },
    { key: 'NIGHTLIFE', label: 'Nightlife', icon: 'moon' },
];

const HUBS = ['Kathmandu', 'Pokhara', 'Bhaktapur', 'Patan'];

const DURATION_OPTIONS = [
    { minutes: 60, label: '1 hour' },
    { minutes: 90, label: '1.5 hours' },
    { minutes: 120, label: '2 hours' },
    { minutes: 150, label: '2.5 hours' },
    { minutes: 180, label: '3 hours' },
    { minutes: 240, label: '4 hours' },
];

interface TourFormData {
    // Step 1: Basic Info
    title: string;
    description: string;
    category: string;
    duration: number;
    // Step 2: Location
    hub: string;
    meetingPoint: string;
    // Step 3: Details
    highlights: string[];
    included: string[];
    notIncluded: string[];
    maxGroupSize: number;
    // Step 4: Photos
    photos: string[];
}

const INITIAL_FORM_DATA: TourFormData = {
    title: '',
    description: '',
    category: '',
    duration: 120,
    hub: '',
    meetingPoint: '',
    highlights: [''],
    included: [''],
    notIncluded: [''],
    maxGroupSize: 10,
    photos: [],
};

const STEPS = [
    { key: 1, title: 'Basic Info', icon: 'information-circle' },
    { key: 2, title: 'Location', icon: 'location' },
    { key: 3, title: 'Details', icon: 'list' },
    { key: 4, title: 'Photos', icon: 'camera' },
    { key: 5, title: 'Review', icon: 'checkmark-circle' },
];

export function CreateTourScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const isEditMode = route.params?.mode === 'edit';
    const tourId = route.params?.tourId;

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<TourFormData>(INITIAL_FORM_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateFormData = (field: keyof TourFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.title.trim()) {
                    Alert.alert('Missing Information', 'Please enter a tour title.');
                    return false;
                }
                if (formData.title.length < 10) {
                    Alert.alert('Title Too Short', 'Tour title should be at least 10 characters.');
                    return false;
                }
                if (!formData.description.trim()) {
                    Alert.alert('Missing Information', 'Please enter a description.');
                    return false;
                }
                if (formData.description.length < 50) {
                    Alert.alert('Description Too Short', 'Description should be at least 50 characters.');
                    return false;
                }
                if (!formData.category) {
                    Alert.alert('Missing Information', 'Please select a category.');
                    return false;
                }
                return true;
            case 2:
                if (!formData.hub) {
                    Alert.alert('Missing Information', 'Please select a city/hub.');
                    return false;
                }
                if (!formData.meetingPoint.trim()) {
                    Alert.alert('Missing Information', 'Please enter a meeting point.');
                    return false;
                }
                return true;
            case 3:
                const validHighlights = formData.highlights.filter(h => h.trim());
                if (validHighlights.length < 2) {
                    Alert.alert('Missing Information', 'Please add at least 2 highlights.');
                    return false;
                }
                return true;
            case 4:
                // Photos are optional during creation
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 5));
        }
    };

    const handleBack = () => {
        if (currentStep === 1) {
            navigation.goBack();
        } else {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async (asDraft: boolean = false) => {
        setIsSubmitting(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            Alert.alert(
                asDraft ? 'Draft Saved' : 'Tour Submitted!',
                asDraft
                    ? 'Your tour has been saved as a draft.'
                    : 'Your tour has been submitted for review. We\'ll notify you once it\'s approved.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to submit tour. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addListItem = (field: 'highlights' | 'included' | 'notIncluded') => {
        updateFormData(field, [...formData[field], '']);
    };

    const updateListItem = (field: 'highlights' | 'included' | 'notIncluded', index: number, value: string) => {
        const updated = [...formData[field]];
        updated[index] = value;
        updateFormData(field, updated);
    };

    const removeListItem = (field: 'highlights' | 'included' | 'notIncluded', index: number) => {
        if (formData[field].length > 1) {
            const updated = formData[field].filter((_, i) => i !== index);
            updateFormData(field, updated);
        }
    };

    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
                {STEPS.map((step, index) => (
                    <React.Fragment key={step.key}>
                        <Pressable
                            style={[
                                styles.progressStep,
                                currentStep >= step.key && styles.progressStepActive,
                                currentStep === step.key && styles.progressStepCurrent,
                            ]}
                            onPress={() => {
                                if (step.key < currentStep) {
                                    setCurrentStep(step.key);
                                }
                            }}
                        >
                            <Ionicons
                                name={step.icon as any}
                                size={18}
                                color={currentStep >= step.key ? '#021007' : colors.textSecondary}
                            />
                        </Pressable>
                        {index < STEPS.length - 1 && (
                            <View style={[
                                styles.progressLine,
                                currentStep > step.key && styles.progressLineActive,
                            ]} />
                        )}
                    </React.Fragment>
                ))}
            </View>
            <AppText style={styles.stepLabel}>
                Step {currentStep}: {STEPS[currentStep - 1].title}
            </AppText>
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Tour Title *</AppText>
                <TextInput
                    style={styles.input}
                    value={formData.title}
                    onChangeText={v => updateFormData('title', v)}
                    placeholder="e.g., Hidden Temples of Kathmandu"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={100}
                />
                <AppText style={styles.charCount}>{formData.title.length}/100</AppText>
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Description *</AppText>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.description}
                    onChangeText={v => updateFormData('description', v)}
                    placeholder="Describe what makes your tour special..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={1000}
                />
                <AppText style={styles.charCount}>{formData.description.length}/1000</AppText>
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Category *</AppText>
                <View style={styles.categoryGrid}>
                    {CATEGORIES.map(cat => (
                        <Pressable
                            key={cat.key}
                            style={[
                                styles.categoryChip,
                                formData.category === cat.key && styles.categoryChipActive,
                            ]}
                            onPress={() => updateFormData('category', cat.key)}
                        >
                            <Ionicons
                                name={cat.icon as any}
                                size={16}
                                color={formData.category === cat.key ? '#021007' : colors.textSecondary}
                            />
                            <AppText style={[
                                styles.categoryChipText,
                                formData.category === cat.key && styles.categoryChipTextActive,
                            ]}>
                                {cat.label}
                            </AppText>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Duration *</AppText>
                <View style={styles.durationGrid}>
                    {DURATION_OPTIONS.map(opt => (
                        <Pressable
                            key={opt.minutes}
                            style={[
                                styles.durationChip,
                                formData.duration === opt.minutes && styles.durationChipActive,
                            ]}
                            onPress={() => updateFormData('duration', opt.minutes)}
                        >
                            <AppText style={[
                                styles.durationChipText,
                                formData.duration === opt.minutes && styles.durationChipTextActive,
                            ]}>
                                {opt.label}
                            </AppText>
                        </Pressable>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
                <AppText style={styles.label}>City/Hub *</AppText>
                <View style={styles.hubGrid}>
                    {HUBS.map(hub => (
                        <Pressable
                            key={hub}
                            style={[
                                styles.hubChip,
                                formData.hub === hub && styles.hubChipActive,
                            ]}
                            onPress={() => updateFormData('hub', hub)}
                        >
                            <Ionicons
                                name="location"
                                size={16}
                                color={formData.hub === hub ? '#021007' : colors.textSecondary}
                            />
                            <AppText style={[
                                styles.hubChipText,
                                formData.hub === hub && styles.hubChipTextActive,
                            ]}>
                                {hub}
                            </AppText>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Meeting Point *</AppText>
                <AppText style={styles.hint}>
                    Describe where travelers should meet you
                </AppText>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.meetingPoint}
                    onChangeText={v => updateFormData('meetingPoint', v)}
                    placeholder="e.g., In front of the main gate at Durbar Square, near the Hanuman statue"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Maximum Group Size</AppText>
                <View style={styles.groupSizeRow}>
                    <Pressable
                        style={styles.groupSizeButton}
                        onPress={() => updateFormData('maxGroupSize', Math.max(1, formData.maxGroupSize - 1))}
                    >
                        <Ionicons name="remove" size={20} color={colors.textPrimary} />
                    </Pressable>
                    <AppText style={styles.groupSizeValue}>{formData.maxGroupSize}</AppText>
                    <Pressable
                        style={styles.groupSizeButton}
                        onPress={() => updateFormData('maxGroupSize', Math.min(20, formData.maxGroupSize + 1))}
                    >
                        <Ionicons name="add" size={20} color={colors.textPrimary} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.tipCard}>
                <Ionicons name="bulb" size={20} color={colors.warning} />
                <AppText style={styles.tipText}>
                    Choose a meeting point that's easy to find and well-known. Include landmarks!
                </AppText>
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Tour Highlights * (min 2)</AppText>
                <AppText style={styles.hint}>What will travelers experience?</AppText>
                {formData.highlights.map((highlight, index) => (
                    <View key={index} style={styles.listItemRow}>
                        <TextInput
                            style={[styles.input, styles.listInput]}
                            value={highlight}
                            onChangeText={v => updateListItem('highlights', index, v)}
                            placeholder={`Highlight ${index + 1}`}
                            placeholderTextColor={colors.textSecondary}
                        />
                        {formData.highlights.length > 1 && (
                            <Pressable
                                style={styles.removeButton}
                                onPress={() => removeListItem('highlights', index)}
                            >
                                <Ionicons name="close-circle" size={22} color={colors.error} />
                            </Pressable>
                        )}
                    </View>
                ))}
                <Pressable style={styles.addButton} onPress={() => addListItem('highlights')}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                    <AppText style={styles.addButtonText}>Add Highlight</AppText>
                </Pressable>
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>What's Included</AppText>
                {formData.included.map((item, index) => (
                    <View key={index} style={styles.listItemRow}>
                        <TextInput
                            style={[styles.input, styles.listInput]}
                            value={item}
                            onChangeText={v => updateListItem('included', index, v)}
                            placeholder="e.g., Local guide, Water"
                            placeholderTextColor={colors.textSecondary}
                        />
                        {formData.included.length > 1 && (
                            <Pressable
                                style={styles.removeButton}
                                onPress={() => removeListItem('included', index)}
                            >
                                <Ionicons name="close-circle" size={22} color={colors.error} />
                            </Pressable>
                        )}
                    </View>
                ))}
                <Pressable style={styles.addButton} onPress={() => addListItem('included')}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                    <AppText style={styles.addButtonText}>Add Item</AppText>
                </Pressable>
            </View>

            <View style={styles.inputGroup}>
                <AppText style={styles.label}>What's Not Included</AppText>
                {formData.notIncluded.map((item, index) => (
                    <View key={index} style={styles.listItemRow}>
                        <TextInput
                            style={[styles.input, styles.listInput]}
                            value={item}
                            onChangeText={v => updateListItem('notIncluded', index, v)}
                            placeholder="e.g., Entry fees, Food"
                            placeholderTextColor={colors.textSecondary}
                        />
                        {formData.notIncluded.length > 1 && (
                            <Pressable
                                style={styles.removeButton}
                                onPress={() => removeListItem('notIncluded', index)}
                            >
                                <Ionicons name="close-circle" size={22} color={colors.error} />
                            </Pressable>
                        )}
                    </View>
                ))}
                <Pressable style={styles.addButton} onPress={() => addListItem('notIncluded')}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                    <AppText style={styles.addButtonText}>Add Item</AppText>
                </Pressable>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
                <AppText style={styles.label}>Tour Photos</AppText>
                <AppText style={styles.hint}>
                    Add photos to showcase your tour. You can add more later.
                </AppText>

                <View style={styles.photoGrid}>
                    {/* Demo placeholders */}
                    <Pressable style={styles.addPhotoButton}>
                        <Ionicons name="add" size={32} color={colors.textSecondary} />
                        <AppText style={styles.addPhotoText}>Add Photo</AppText>
                    </Pressable>
                    <Pressable style={styles.addPhotoButton}>
                        <Ionicons name="camera" size={32} color={colors.textSecondary} />
                        <AppText style={styles.addPhotoText}>Take Photo</AppText>
                    </Pressable>
                </View>

                <View style={styles.photoTips}>
                    <AppText style={styles.photoTipsTitle}>📸 Photo Tips:</AppText>
                    <AppText style={styles.photoTipItem}>• Show the actual locations on your tour</AppText>
                    <AppText style={styles.photoTipItem}>• Include photos of you with travelers</AppText>
                    <AppText style={styles.photoTipItem}>• Capture the best moments and highlights</AppText>
                    <AppText style={styles.photoTipItem}>• Use good lighting and clear images</AppText>
                </View>
            </View>
        </View>
    );

    const renderStep5 = () => (
        <View style={styles.stepContent}>
            <AppText style={styles.reviewTitle}>Review Your Tour</AppText>

            <View style={styles.reviewCard}>
                <AppText style={styles.reviewLabel}>Title</AppText>
                <AppText style={styles.reviewValue}>{formData.title || '—'}</AppText>
            </View>

            <View style={styles.reviewCard}>
                <AppText style={styles.reviewLabel}>Description</AppText>
                <AppText style={styles.reviewValue} numberOfLines={3}>
                    {formData.description || '—'}
                </AppText>
            </View>

            <View style={styles.reviewRow}>
                <View style={[styles.reviewCard, { flex: 1 }]}>
                    <AppText style={styles.reviewLabel}>Category</AppText>
                    <AppText style={styles.reviewValue}>
                        {CATEGORIES.find(c => c.key === formData.category)?.label || '—'}
                    </AppText>
                </View>
                <View style={[styles.reviewCard, { flex: 1, marginLeft: 12 }]}>
                    <AppText style={styles.reviewLabel}>Duration</AppText>
                    <AppText style={styles.reviewValue}>
                        {Math.floor(formData.duration / 60)}h {formData.duration % 60 > 0 ? `${formData.duration % 60}m` : ''}
                    </AppText>
                </View>
            </View>

            <View style={styles.reviewRow}>
                <View style={[styles.reviewCard, { flex: 1 }]}>
                    <AppText style={styles.reviewLabel}>Location</AppText>
                    <AppText style={styles.reviewValue}>{formData.hub || '—'}</AppText>
                </View>
                <View style={[styles.reviewCard, { flex: 1, marginLeft: 12 }]}>
                    <AppText style={styles.reviewLabel}>Group Size</AppText>
                    <AppText style={styles.reviewValue}>Max {formData.maxGroupSize}</AppText>
                </View>
            </View>

            <View style={styles.reviewCard}>
                <AppText style={styles.reviewLabel}>Meeting Point</AppText>
                <AppText style={styles.reviewValue}>{formData.meetingPoint || '—'}</AppText>
            </View>

            <View style={styles.reviewCard}>
                <AppText style={styles.reviewLabel}>Highlights ({formData.highlights.filter(h => h.trim()).length})</AppText>
                {formData.highlights.filter(h => h.trim()).map((h, i) => (
                    <AppText key={i} style={styles.reviewListItem}>• {h}</AppText>
                ))}
            </View>

            <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={colors.primary} />
                <AppText style={styles.infoText}>
                    Once submitted, your tour will be reviewed by our team within 24-48 hours.
                </AppText>
            </View>
        </View>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            default: return null;
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <AppText style={styles.headerTitle}>
                    {isEditMode ? 'Edit Tour' : 'Create Tour'}
                </AppText>
                <View style={{ width: 40 }} />
            </View>

            {renderProgressBar()}

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {renderCurrentStep()}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                {currentStep < 5 ? (
                    <Pressable style={styles.nextButton} onPress={handleNext}>
                        <AppText style={styles.nextButtonText}>Continue</AppText>
                        <Ionicons name="arrow-forward" size={20} color="#021007" />
                    </Pressable>
                ) : (
                    <View style={styles.submitRow}>
                        <Pressable
                            style={styles.draftButton}
                            onPress={() => handleSubmit(true)}
                            disabled={isSubmitting}
                        >
                            <AppText style={styles.draftButtonText}>Save Draft</AppText>
                        </Pressable>
                        <Pressable
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={() => handleSubmit(false)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#021007" />
                            ) : (
                                <>
                                    <AppText style={styles.submitButtonText}>Submit for Review</AppText>
                                    <Ionicons name="send" size={18} color="#021007" />
                                </>
                            )}
                        </Pressable>
                    </View>
                )}
            </View>
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
    progressContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.card,
    },
    progressBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressStep: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressStepActive: {
        backgroundColor: colors.accent,
    },
    progressStepCurrent: {
        borderWidth: 2,
        borderColor: '#021007',
    },
    progressLine: {
        width: 24,
        height: 2,
        backgroundColor: colors.border,
        marginHorizontal: 4,
    },
    progressLineActive: {
        backgroundColor: colors.accent,
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    stepContent: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    hint: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 14,
    },
    charCount: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'right',
        marginTop: 4,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    categoryChipText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    categoryChipTextActive: {
        color: '#021007',
        fontWeight: '600',
    },
    durationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    durationChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    durationChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    durationChipText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    durationChipTextActive: {
        color: '#021007',
        fontWeight: '600',
    },
    hubGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    hubChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    hubChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    hubChipText: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    hubChipTextActive: {
        color: '#021007',
        fontWeight: '600',
    },
    groupSizeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    groupSizeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    groupSizeValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        minWidth: 50,
        textAlign: 'center',
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: `${colors.warning}15`,
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    listItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    listInput: {
        flex: 1,
    },
    removeButton: {
        marginLeft: 8,
        padding: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    addButtonText: {
        fontSize: 14,
        color: colors.accent,
        fontWeight: '600',
    },
    photoGrid: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    addPhotoButton: {
        width: 120,
        height: 120,
        borderRadius: 12,
        backgroundColor: colors.inputBg,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    addPhotoText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    photoTips: {
        marginTop: 20,
        padding: 16,
        backgroundColor: colors.inputBg,
        borderRadius: 12,
    },
    photoTipsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    photoTipItem: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    reviewTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    reviewCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    reviewRow: {
        flexDirection: 'row',
    },
    reviewLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    reviewValue: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    reviewListItem: {
        fontSize: 14,
        color: colors.textPrimary,
        marginTop: 4,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: `${colors.primary}15`,
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    footer: {
        padding: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.accent,
        paddingVertical: 16,
        borderRadius: 12,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#021007',
    },
    submitRow: {
        flexDirection: 'row',
        gap: 12,
    },
    draftButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    draftButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    submitButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.accent,
        paddingVertical: 16,
        borderRadius: 12,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#021007',
    },
});
