import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { AppText } from '../AppText';
import { colors } from '@theme/colors';

export const MAX_VOICE_NOTE_SECONDS = 30;

interface VoiceNoteRecorderProps {
  recordedUri: string | null;
  onRecorded: (uri: string | null) => void;
}

/** 30-second folklore voice note recorder for Field Collector Mode. */
export function VoiceNoteRecorder({ recordedUri, onRecorded }: VoiceNoteRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [starting, setStarting] = useState(false);
  const elapsedSeconds = Math.floor((state.durationMillis ?? 0) / 1000);

  const stop = async () => {
    await recorder.stop();
    onRecorded(recorder.uri ?? null);
  };

  useEffect(() => {
    if (state.isRecording && elapsedSeconds >= MAX_VOICE_NOTE_SECONDS) {
      void stop();
    }
    // stop is stable for the lifetime of the recorder instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isRecording, elapsedSeconds]);

  const start = async () => {
    setStarting(true);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone needed', 'Allow microphone access to record folklore voice notes.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      Alert.alert('Recording failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, state.isRecording && styles.recording]}
        onPress={() => void (state.isRecording ? stop() : start())}
        disabled={starting}
      >
        <Ionicons name={state.isRecording ? 'stop' : 'mic'} size={18} color={state.isRecording ? '#fff' : colors.accent} />
        <AppText style={[styles.label, state.isRecording && styles.labelRecording]}>
          {state.isRecording
            ? `Recording ${elapsedSeconds}s / ${MAX_VOICE_NOTE_SECONDS}s`
            : recordedUri
              ? 'Re-record folklore note'
              : 'Record 30s folklore note'}
        </AppText>
      </Pressable>
      {recordedUri && !state.isRecording && (
        <Pressable onPress={() => onRecorded(null)} hitSlop={8}>
          <AppText style={styles.discard}>Discard</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  recording: { backgroundColor: colors.error, borderColor: colors.error },
  label: { color: colors.accent, fontSize: 13 },
  labelRecording: { color: '#fff' },
  discard: { color: colors.textSecondary, fontSize: 13 },
});
