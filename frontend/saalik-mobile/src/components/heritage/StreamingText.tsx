import React, { useEffect, useState } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { AppText } from '../AppText';
import { colors } from '@theme/colors';
import { streamWords } from '../../services/rag/ragStream';

/** Renders text token by token, the way a streamed RAG answer arrives. */
export function StreamingText({ text, style, onDone }: { text: string; style?: TextStyle; onDone?: () => void }) {
  const [visible, setVisible] = useState('');

  useEffect(() => {
    const signal = { aborted: false };
    setVisible('');
    void streamWords(text, setVisible, { signal }).then(() => {
      if (!signal.aborted) onDone?.();
    });
    return () => {
      signal.aborted = true;
    };
    // onDone is a completion callback; restarting the stream when it changes identity would replay the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <AppText style={[styles.text, style]}>{visible}</AppText>;
}

const styles = StyleSheet.create({
  text: { color: colors.textPrimary, fontSize: 15, lineHeight: 23 },
});
