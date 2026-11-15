import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { useHistorianVoice } from './VoiceHistorianBar';
import { colors } from '@theme/colors';
import { answerFollowUp, FOLLOW_UP_SUGGESTIONS, type RagContext } from '../../services/rag/ragStream';
import type { HeritageMonument, HeritageSource } from '../../types/heritage';

interface AskSaalikDrawerProps {
  visible: boolean;
  onClose: () => void;
  monument: HeritageMonument;
  sources: HeritageSource[];
}

/** Bottom sheet for follow-up questions, answered offline from the monument's sourced lore. */
export function AskSaalikDrawer({ visible, onClose, monument, sources }: AskSaalikDrawerProps) {
  const [thread, setThread] = useState<{ question: string; answer: RagContext }[]>([]);
  const [draft, setDraft] = useState('');
  const { speaking, speak, stop } = useHistorianVoice();

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setThread((current) => [{ question: trimmed, answer: answerFollowUp(monument, trimmed, sources) }, ...current]);
    setDraft('');
  };

  const close = () => {
    stop();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.dismiss} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <AppText style={styles.title}>Ask Saalik about {monument.names.en}</AppText>
            <Pressable onPress={close} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <AppText style={styles.hint}>Answers come from this monument&apos;s sourced notes, so they work offline.</AppText>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
            {FOLLOW_UP_SUGGESTIONS.map((suggestion) => (
              <Pressable key={suggestion} style={styles.suggestion} onPress={() => ask(suggestion)}>
                <AppText style={styles.suggestionText}>{suggestion}</AppText>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={styles.thread} contentContainerStyle={styles.threadContent} keyboardShouldPersistTaps="handled">
            {thread.map((entry, index) => {
              const id = `${thread.length - index}`;
              return (
                <View key={id} style={styles.entry}>
                  <AppText style={styles.question}>{entry.question}</AppText>
                  <AppText style={styles.answer}>{entry.answer.text}</AppText>
                  {entry.answer.citations.map((citation) => (
                    <AppText key={citation} style={styles.citation}>
                      Source: {citation}
                    </AppText>
                  ))}
                  <Pressable
                    style={styles.listen}
                    onPress={() => (speaking === id ? stop() : speak(id, entry.answer.text))}
                  >
                    <Ionicons name={speaking === id ? 'stop' : 'volume-high'} size={16} color={colors.accent} />
                    <AppText style={styles.listenText}>{speaking === id ? 'Stop' : 'Listen'}</AppText>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a question"
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              onSubmitEditing={() => ask(draft)}
            />
            <Pressable style={styles.send} onPress={() => ask(draft)}>
              <Ionicons name="arrow-up" size={20} color="#021007" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  dismiss: { flex: 1 },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: colors.accent, fontSize: 17, flex: 1 },
  hint: { color: colors.textMuted, fontSize: 12 },
  suggestions: { gap: 8 },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  suggestionText: { color: colors.textSecondary, fontSize: 12 },
  thread: { flexGrow: 0 },
  threadContent: { gap: 10 },
  entry: { backgroundColor: colors.card, borderRadius: 14, padding: 12, gap: 6 },
  question: { color: colors.textPrimary, fontSize: 14 },
  answer: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  citation: { color: colors.textMuted, fontSize: 11 },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  listenText: { color: colors.accent, fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    color: colors.textPrimary,
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
