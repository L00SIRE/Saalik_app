import { useState } from 'react';
import {
    ImageBackground,
    StyleSheet,
    View,
    Pressable,
    ScrollView,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { AppText } from '@components/AppText';
import { AppTextInput } from '@components/AppTextInput';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@theme/colors';
import type { ExperiencePlan, ChatTurn } from '../types/api';
import { sendChat } from '../services/api';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const background = require('../../assets/bgsaalik.jpg');

const getDemoChatResponse = (message: string, history: ChatTurn[]): string => {
    const lower = message.toLowerCase();
    let response = '';

    if (lower.includes('religious') || lower.includes('temple') || lower.includes('spiritual')) {
        response = 'I sense you are leaning toward a religious immersion. Imagine sattvic calm with guided rituals and sacred geometry walks — I can line up sunrise darshan, mantra immersion, prasad tasting. Want me to lock dates or weave in a chatbot concierge?';
    } else if (lower.includes('scenic') || lower.includes('mountain') || lower.includes('nature')) {
        response = 'I sense you are leaning toward a scenic immersion. Imagine slow-travel panoramas with misty trail highlights — I can line up golden-hour ridge picnic, canoe drift, tea estate brunch. Want me to lock dates or weave in a chatbot concierge?';
    } else if (lower.includes('culture') || lower.includes('art') || lower.includes('food')) {
        response = 'I sense you are leaning toward a culture immersion. Imagine studio-to-street storytellers with culinary residencies — I can line up atelier residency, night bazaar tasting menu, spoken-word soiree. Want me to lock dates or weave in a chatbot concierge?';
    } else if (lower.includes('adventure') || lower.includes('trek') || lower.includes('thrill')) {
        response = 'I sense you are leaning toward an adventure immersion. Imagine pulse-forward trek circuits with recovery pods — I can line up skybridge ascent, hidden waterfall rappel, midnight dune ride. Want me to lock dates or weave in a chatbot concierge?';
    } else if (lower.includes('wellness') || lower.includes('healing') || lower.includes('retreat')) {
        response = 'I sense you are leaning toward a wellness immersion. Imagine ayurvedic micro-retreat with bio-rhythm coaching — I can line up dosha consult, therapeutic cooking, floating meditation. Want me to lock dates or weave in a chatbot concierge?';
    } else {
        response = 'Welcome to Saalik! I\'m here to help you craft a personalized journey. Tell me what kind of experience you\'re seeking — religious, scenic, cultural, adventure, or wellness?';
    }

    return response;
};

export function PlanScreen() {
    const route = useRoute<any>();
    const plan = route.params?.plan as ExperiencePlan;
    const { savePlan } = useAuth();

    const [chatVisible, setChatVisible] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        const userMessage = chatInput.trim();
        setChatLoading(true);

        // Add user message immediately
        const historyForApi: ChatTurn[] = [...chatHistory, { role: 'user', message: userMessage }];
        setChatHistory(historyForApi);
        setChatInput('');

        try {
            const response = await sendChat(chatHistory, userMessage);
            setChatHistory(prev => [...prev, response.reply]);
        } catch (e) {
            setChatHistory(prev => [...prev, { role: 'guide', message: 'I am having trouble connecting to the spirit realm (API Error).' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleSave = () => {
        savePlan(plan);
        Alert.alert('Journey Saved', 'This plan has been added to your profile.');
    };

    if (!plan) {
        return (
            <View style={styles.container}>
                <AppText>No plan data found.</AppText>
            </View>
        );
    }

    return (
        <ImageBackground source={background} style={styles.background} resizeMode="cover">
            <LinearGradient colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.2)"]} style={styles.overlay}>
                <ScrollView contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}>

                    <View style={styles.planCard}>
                        <AppText style={styles.planTitle}>{plan.headline}</AppText>
                        <AppText style={styles.planSummary}>{plan.summary}</AppText>
                        <AppText style={styles.planSoundtrack}>Soundtrack • {plan.soundtrack}</AppText>
                        <View style={styles.sectionDivider} />
                        <AppText style={styles.sectionTitle}>Highlights</AppText>
                        {plan.highlights.map((highlight) => (
                            <View key={highlight.title} style={styles.highlight}>
                                <AppText style={styles.highlightTitle}>{highlight.title}</AppText>
                                <AppText style={styles.highlightText}>{highlight.description}</AppText>
                            </View>
                        ))}
                        <AppText style={styles.sectionTitle}>Day Flow</AppText>
                        {plan.dayPlan.map((day) => (
                            <View key={day.day} style={styles.dayBlock}>
                                <AppText style={styles.dayTitle}>{day.day}</AppText>
                                <AppText style={styles.dayFocus}>{day.focus}</AppText>
                                {day.details.map((detail) => (
                                    <AppText key={detail} style={styles.dayDetail}>• {detail}</AppText>
                                ))}
                            </View>
                        ))}
                    </View>

                    <Pressable style={styles.saveButton} onPress={handleSave}>
                        <AppText style={styles.saveButtonText}>Save Journey</AppText>
                    </Pressable>

                    <Pressable style={styles.chatButton} onPress={() => setChatVisible(true)}>
                        <AppText style={styles.chatButtonText}>Chat with Saalik Guide</AppText>
                    </Pressable>
                </ScrollView>

                <Modal visible={chatVisible} animationType="slide" transparent>
                    <View style={styles.chatModalBackdrop}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.chatModal}
                        >
                            <View style={styles.chatHeader}>
                                <AppText style={styles.chatTitle}>Saalik Concierge</AppText>
                                <Pressable onPress={() => setChatVisible(false)}>
                                    <AppText style={styles.link}>Close</AppText>
                                </Pressable>
                            </View>
                            <ScrollView style={styles.chatHistory} contentContainerStyle={{ gap: 12 }}>
                                {chatHistory.length === 0 && (
                                    <AppText style={styles.chatPlaceholder}>
                                        Ask anything — “Can you blend religious rituals with scenic drives?”
                                    </AppText>
                                )}
                                {chatHistory.map((turn, index) => (
                                    <View key={`${turn.role}-${index}`} style={[styles.chatBubble, turn.role === 'guide' ? styles.chatGuide : styles.chatUser]}>
                                        <AppText style={styles.chatBubbleText}>{turn.message}</AppText>
                                    </View>
                                ))}
                            </ScrollView>
                            <View style={styles.chatInputRow}>
                                <AppTextInput
                                    value={chatInput}
                                    onChangeText={setChatInput}
                                    placeholder="Type your question"
                                    placeholderTextColor={colors.textSecondary}
                                    style={[styles.input, styles.chatInput]}
                                />
                                <Pressable style={[styles.primaryButton, styles.chatSendButton, chatLoading && styles.disabledButton]} onPress={handleSendChat} disabled={chatLoading}>
                                    <AppText style={styles.primaryButtonText}>{chatLoading ? '...' : 'Send'}</AppText>
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>
            </LinearGradient>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    background: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    scroll: {
        paddingBottom: 48,
        paddingHorizontal: 24,
        paddingTop: 40,
        gap: 20,
    },
    planCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    planTitle: {
        color: colors.accent,
        fontSize: 20,
    },
    planSummary: {
        color: colors.textPrimary,
    },
    planSoundtrack: {
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 12,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontSize: 16,
    },
    highlight: {
        marginTop: 8,
        gap: 4,
    },
    highlightTitle: {
        color: colors.accent,
    },
    highlightText: {
        color: colors.textSecondary,
    },
    dayBlock: {
        marginTop: 8,
    },
    dayTitle: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    dayFocus: {
        color: colors.textSecondary,
    },
    dayDetail: {
        color: colors.textSecondary,
        marginLeft: 8,
    },
    saveButton: {
        backgroundColor: colors.accent,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    saveButtonText: {
        color: '#021007',
        fontWeight: '700',
        letterSpacing: 1,
    },
    chatButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.accent,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: colors.card,
    },
    chatButtonText: {
        color: colors.accent,
    },
    chatModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    chatModal: {
        backgroundColor: colors.card,
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        gap: 12,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    chatTitle: {
        color: colors.accent,
        fontSize: 18,
    },
    link: {
        color: colors.accent,
    },
    chatHistory: {
        maxHeight: 400,
    },
    chatPlaceholder: {
        color: colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
    },
    chatBubble: {
        padding: 12,
        borderRadius: 12,
        maxWidth: '85%',
    },
    chatGuide: {
        backgroundColor: 'rgba(21, 255, 117, 0.1)',
        alignSelf: 'flex-start',
        borderTopLeftRadius: 0,
    },
    chatUser: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignSelf: 'flex-end',
        borderTopRightRadius: 0,
    },
    chatBubbleText: {
        color: colors.textPrimary,
    },
    chatInputRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    input: {
        backgroundColor: colors.inputBg,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chatInput: {
        flex: 1,
    },
    primaryButton: {
        backgroundColor: colors.accent,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    chatSendButton: {
        paddingHorizontal: 24,
    },
    primaryButtonText: {
        color: '#021007',
        fontWeight: '700',
        letterSpacing: 1,
    },
    disabledButton: {
        opacity: 0.7,
    },
});
