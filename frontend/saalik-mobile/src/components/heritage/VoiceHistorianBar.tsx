import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { AppText } from '../AppText';
import { colors } from '@theme/colors';

export type HistorianLanguage = 'en' | 'ne';

/**
 * Narration through the device's own text-to-speech engine, so it works with no signal.
 * One passage plays at a time; `speaking` is the id of the passage being read, or null.
 */
export function useHistorianVoice() {
  const [speaking, setSpeaking] = useState<string | null>(null);

  const stop = useCallback(() => {
    void Speech.stop();
    setSpeaking(null);
  }, []);

  const speak = useCallback((id: string, text: string, language: HistorianLanguage = 'en') => {
    void Speech.stop();
    setSpeaking(id);
    // A newer passage may already be playing when this one's callback arrives.
    const finished = () => setSpeaking((current) => (current === id ? null : current));
    Speech.speak(text.slice(0, Speech.maxSpeechInputLength), {
      language: language === 'ne' ? 'ne-NP' : 'en-US',
      rate: 0.95,
      onDone: finished,
      onStopped: finished,
      onError: finished,
    });
  }, []);

  useEffect(
    () => () => {
      void Speech.stop();
    },
    [],
  );

  return { speaking, speak, stop };
}

interface VoiceHistorianBarProps {
  /** What is being read, shown beside the play button. */
  label: string;
  english: string;
  nepali: string;
}

export function VoiceHistorianBar({ label, english, nepali }: VoiceHistorianBarProps) {
  const { speaking, speak, stop } = useHistorianVoice();

  // A different story tab is a different passage: stop reading the old one.
  useEffect(() => stop, [english, stop]);

  const toggle = (language: HistorianLanguage) =>
    speaking === language ? stop() : speak(language, language === 'ne' ? nepali : english, language);

  return (
    <View style={styles.bar}>
      <Pressable style={styles.play} onPress={() => (speaking ? stop() : toggle('en'))} hitSlop={8}>
        <Ionicons name={speaking ? 'stop' : 'play'} size={20} color="#021007" />
      </Pressable>
      <View style={styles.body}>
        <AppText style={styles.title}>Voice Historian</AppText>
        <AppText style={styles.subtitle} numberOfLines={1}>
          {speaking ? `Reading ${label}` : `${label} · works offline`}
        </AppText>
      </View>
      {(['en', 'ne'] as const).map((language) => (
        <Pressable
          key={language}
          style={[styles.chip, speaking === language && styles.chipActive]}
          onPress={() => toggle(language)}
        >
          <AppText style={[styles.chipText, speaking === language && styles.chipTextActive]}>
            {language === 'en' ? 'English' : 'नेपाली'}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { color: colors.textPrimary, fontSize: 14 },
  subtitle: { color: colors.textMuted, fontSize: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  chipTextActive: { color: '#021007' },
});
