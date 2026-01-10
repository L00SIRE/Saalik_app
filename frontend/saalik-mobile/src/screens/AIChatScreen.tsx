import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Pressable,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface Suggestion {
    text: string;
    icon: string;
    message: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Demo mode for when backend is not running
const USE_DEMO = true;

const DEMO_RESPONSES: Record<string, string> = {
    default: "Namaste! 🙏 I'm Saalik AI, your personal guide to Nepal. I can help you plan trips, recommend tours, find food spots, and share cultural insights. What would you like to explore today?",

    trip: "For a 5-day Nepal trip, here's my recommendation:\n\n**Day 1-2: Kathmandu Valley**\n🏛️ Durbar Square & Kumari Temple\n📿 Boudhanath Stupa (sunset)\n🍜 Street Food Safari tour\n\n**Day 3: Bhaktapur**\n🏺 Potter's Square\n🏛️ The Living Museum tour\n🧈 Famous Juju Dhau (King Curd)\n\n**Day 4-5: Pokhara**\n🌅 Lakeside Sunrise walk\n🏔️ World Peace Pagoda trek\n🚣 Phewa Lake boating\n\nWould you like me to suggest specific tours for any of these days?",

    food: "Great choice! Here are the best food experiences:\n\n**Kathmandu:**\n🍜 Momos at Bhat-Bhateni area\n🥘 Dal Bhat at Thakali Kitchen\n🌯 Our 'Street Food Safari' tour covers 6+ spots!\n\n**Bhaktapur:**\n🧈 Juju Dhau (King Curd) - must try!\n🥟 Yomari (sweet dumplings)\n\nI recommend booking our **Bhaktapur Food Trail** - it includes 6+ tastings including the famous King Curd. Interested?",

    temple: "Great question! Here's what to know for temple visits:\n\n**Dress Code:**\n👔 Cover shoulders and knees\n👟 Remove shoes at entrance\n🎒 No leather items in Hindu temples\n\n**Etiquette:**\n🙏 Walk clockwise around stupas\n📵 Ask before photographing rituals\n💰 Small donations welcome\n\n**Top Temples:**\n• Pashupatinath - Hindu, most sacred\n• Boudhanath - Buddhist, great sunset\n• Swayambhunath - Both, city views\n\nOur 'Boudhanath Mindful Walk' includes all etiquette guidance. Would you like to book?",

    tours: "Here are today's available Saalik tours:\n\n**Kathmandu:**\n🏛️ Durbar Square Secrets (9AM) - 3hrs\n📿 Boudhanath Mindful Walk (4PM) - 2hrs\n🍜 Thamel After Dark (6PM) - 2hrs\n\n**Bhaktapur:**\n🏺 Potter's Square (10AM) - 3hrs\n🍜 Food Trail (11AM) - 2.5hrs\n\n**Pokhara:**\n🌅 Lakeside Sunrise (5:30AM) - 2.5hrs\n🏔️ Peace Pagoda Trek (7AM) - 4hrs\n\nAll tours are FREE - you just tip your guide! Which interests you?",

    nepali: "Let me teach you some Nepali! 🇳🇵\n\n**Essential Greetings:**\n• नमस्ते (Namaste) - Hello/Goodbye\n• धन्यवाद (Dhanyabad) - Thank you\n• माफ गर्नुहोस् (Maaf garnuhos) - Sorry/Excuse me\n\n**Useful Phrases:**\n• कति हो? (Kati ho?) - How much?\n• मिठो छ (Mitho chha) - It's delicious!\n• राम्रो छ (Ramro chha) - It's beautiful!\n\n**Numbers:**\n• एक (ek) - 1\n• दुई (dui) - 2\n• तीन (tin) - 3\n\nPractice 'Dhanyabad' - locals love when visitors try! 😊",
};

export function AIChatScreen() {
    const navigation = useNavigation<any>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([
        { text: "Plan my trip", icon: "map-outline", message: "Help me plan a 5-day trip to Nepal" },
        { text: "Today's tours", icon: "calendar-outline", message: "What tours are available today?" },
        { text: "Food spots", icon: "restaurant-outline", message: "Best local food recommendations?" },
        { text: "Temple tips", icon: "home-outline", message: "What should I know before visiting temples?" },
        { text: "Learn Nepali", icon: "language-outline", message: "Teach me basic Nepali greetings" },
    ]);
    const flatListRef = useRef<FlatList>(null);

    // Send initial greeting
    useEffect(() => {
        const greeting: Message = {
            id: 'greeting',
            role: 'assistant',
            content: "Namaste! 🙏 I'm Saalik AI, your personal guide to Nepal.\n\nI can help you:\n• Plan your perfect Nepal trip\n• Recommend walking tours\n• Find amazing food spots\n• Share cultural insights\n• Teach you Nepali phrases\n\nWhat would you like to explore?",
            timestamp: new Date(),
        };
        setMessages([greeting]);
    }, []);

    const getDemoResponse = (userMessage: string): string => {
        const msg = userMessage.toLowerCase();
        if (msg.includes('trip') || msg.includes('plan') || msg.includes('day')) {
            return DEMO_RESPONSES.trip;
        } else if (msg.includes('food') || msg.includes('eat') || msg.includes('restaurant')) {
            return DEMO_RESPONSES.food;
        } else if (msg.includes('temple') || msg.includes('etiquette') || msg.includes('dress')) {
            return DEMO_RESPONSES.temple;
        } else if (msg.includes('tour') || msg.includes('today') || msg.includes('available')) {
            return DEMO_RESPONSES.tours;
        } else if (msg.includes('nepali') || msg.includes('language') || msg.includes('phrase') || msg.includes('greeting')) {
            return DEMO_RESPONSES.nepali;
        }
        return DEMO_RESPONSES.default;
    };

    const sendMessage = async (text: string = inputText) => {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            let responseText: string;

            if (USE_DEMO) {
                // Demo mode - use local responses
                await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
                responseText = getDemoResponse(text);
            } else {
                // Real API call
                const response = await fetch(`${API_URL}/api/ai/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text }),
                });

                if (!response.ok) {
                    throw new Error('Failed to get response');
                }

                const data = await response.json();
                responseText = data.message;
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('AI Error:', error);
            Alert.alert('Connection Error', 'Could not reach AI. Using offline mode.');

            // Fallback to demo response
            const fallbackMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: getDemoResponse(text),
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, fallbackMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestion = (suggestion: Suggestion) => {
        sendMessage(suggestion.message);
    };

    const clearChat = () => {
        Alert.alert(
            'New Conversation',
            'Start a fresh conversation?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    onPress: () => {
                        setMessages([{
                            id: 'greeting',
                            role: 'assistant',
                            content: "Namaste! 🙏 Fresh start! How can I help you explore Nepal today?",
                            timestamp: new Date(),
                        }]);
                    }
                },
            ]
        );
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';

        return (
            <View style={[
                styles.messageContainer,
                isUser ? styles.userMessageContainer : styles.assistantMessageContainer
            ]}>
                {!isUser && (
                    <View style={styles.avatarContainer}>
                        <Ionicons name="sparkles" size={16} color={colors.accent} />
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.assistantBubble
                ]}>
                    <AppText style={[
                        styles.messageText,
                        isUser ? styles.userMessageText : styles.assistantMessageText
                    ]}>
                        {item.content}
                    </AppText>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </Pressable>
                <View style={styles.headerCenter}>
                    <View style={styles.aiIcon}>
                        <Ionicons name="sparkles" size={18} color={colors.accent} />
                    </View>
                    <View>
                        <AppText style={styles.headerTitle}>Saalik AI</AppText>
                        <AppText style={styles.headerSubtitle}>Your Nepal Guide</AppText>
                    </View>
                </View>
                <Pressable style={styles.clearButton} onPress={clearChat}>
                    <Ionicons name="refresh-outline" size={22} color={colors.textSecondary} />
                </Pressable>
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    ListFooterComponent={
                        isLoading ? (
                            <View style={styles.loadingContainer}>
                                <View style={styles.avatarContainer}>
                                    <Ionicons name="sparkles" size={16} color={colors.accent} />
                                </View>
                                <View style={styles.typingIndicator}>
                                    <ActivityIndicator size="small" color={colors.accent} />
                                    <AppText style={styles.typingText}>Thinking...</AppText>
                                </View>
                            </View>
                        ) : null
                    }
                />

                {/* Suggestions (show only when few messages) */}
                {messages.length <= 2 && (
                    <View style={styles.suggestionsContainer}>
                        <FlatList
                            horizontal
                            data={suggestions}
                            keyExtractor={(item) => item.text}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.suggestionsList}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.suggestionChip}
                                    onPress={() => handleSuggestion(item)}
                                >
                                    <Ionicons name={item.icon as any} size={16} color={colors.accent} />
                                    <AppText style={styles.suggestionText}>{item.text}</AppText>
                                </Pressable>
                            )}
                        />
                    </View>
                )}

                {/* Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask me anything about Nepal..."
                        placeholderTextColor={colors.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={2000}
                        onSubmitEditing={() => sendMessage()}
                    />
                    <Pressable
                        style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                        onPress={() => sendMessage()}
                        disabled={!inputText.trim() || isLoading}
                    >
                        <Ionicons
                            name="send"
                            size={20}
                            color={inputText.trim() && !isLoading ? '#fff' : colors.textMuted}
                        />
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
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    aiIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${colors.accent}20`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    clearButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 8,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end',
    },
    userMessageContainer: {
        justifyContent: 'flex-end',
    },
    assistantMessageContainer: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: `${colors.accent}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    userBubble: {
        backgroundColor: colors.accent,
        borderBottomRightRadius: 4,
        marginLeft: 'auto',
    },
    assistantBubble: {
        backgroundColor: colors.card,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userMessageText: {
        color: '#021007',
    },
    assistantMessageText: {
        color: colors.textPrimary,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    typingText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    suggestionsContainer: {
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.card,
    },
    suggestionsList: {
        paddingHorizontal: 16,
        gap: 8,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: `${colors.accent}10`,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: `${colors.accent}30`,
        marginRight: 8,
    },
    suggestionText: {
        fontSize: 13,
        color: colors.accent,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: colors.inputBg,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.textPrimary,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.inputBg,
    },
});
