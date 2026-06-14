import React, { useState, useRef } from 'react';
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
import { useAiAssistant } from '@logic/ai/useAiAssistant';
import type { ChatMessage } from '@logic/ai/useAiAssistant';
import type { AiSuggestion } from '@integration/contracts/ai';

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 · Rendering / UI — AI chat screen (DUMB component)
//
// This screen now knows nothing about where AI replies come from. It renders
// the state produced by the Logic-layer hook `useAiAssistant` (Layer 3), which
// in turn calls the Integration layer (Layer 4) → mock today, live post-funding.
// All conversation logic, intent classification, and canned content have moved
// out of this file.
// ─────────────────────────────────────────────────────────────────────────────

export function AIChatScreen() {
    const navigation = useNavigation<any>();
    const { messages, suggestions, isThinking, send, clear } = useAiAssistant();
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const handleSend = (text: string = inputText) => {
        if (!text.trim() || isThinking) return;
        setInputText('');
        void send(text);
    };

    const handleSuggestion = (suggestion: AiSuggestion) => {
        handleSend(suggestion.message);
    };

    const clearChat = () => {
        Alert.alert(
            'New Conversation',
            'Start a fresh conversation?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', onPress: () => clear() },
            ]
        );
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
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
                        isThinking ? (
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
                        onSubmitEditing={() => handleSend()}
                    />
                    <Pressable
                        style={[styles.sendButton, (!inputText.trim() || isThinking) && styles.sendButtonDisabled]}
                        onPress={() => handleSend()}
                        disabled={!inputText.trim() || isThinking}
                    >
                        <Ionicons
                            name="send"
                            size={20}
                            color={inputText.trim() && !isThinking ? '#fff' : colors.textMuted}
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
