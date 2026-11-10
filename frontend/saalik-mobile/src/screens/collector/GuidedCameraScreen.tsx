import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { AppText } from '@components/AppText';
import { AngleFramingOverlay } from '@components/heritage/AngleFramingOverlay';
import { VoiceNoteRecorder } from '@components/heritage/VoiceNoteRecorder';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import { useCurrentFix } from '../../hooks/useCurrentFix';
import {
  CAPTURE_ANGLES,
  CAPTURE_ANGLE_LABELS,
  LIGHTING_TAGS,
  type CaptureAngle,
  type LightingTag,
} from '../../types/heritage';

function newCaptureId(): string {
  return `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function GuidedCameraScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { repositories, notifyQueueChanged, mode } = useAppMode();
  const { fix, refresh: refreshFix, permission: locationPermission } = useCurrentFix({ watch: true });
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const monumentId: string = route.params?.monumentId ?? '';
  const initialAngle: CaptureAngle = route.params?.angle ?? 'ESTABLISHING_FRONT';

  const monument = repositories?.monuments.getById(monumentId) ?? null;
  const [angle, setAngle] = useState<CaptureAngle>(initialAngle);
  const [lighting, setLighting] = useState<LightingTag>('OVERCAST');
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAngle, setLastSavedAngle] = useState<CaptureAngle | null>(null);

  const framingNote = useMemo(() => {
    if (!monument) return undefined;
    return monument.fieldPhotoSpec.angles.find((a) => a.angle === angle)?.framingNote;
  }, [monument, angle]);

  const angleIndex = CAPTURE_ANGLES.indexOf(angle);
  const nextMissingAngle = useMemo(() => {
    if (!monument) return null;
    const remaining = CAPTURE_ANGLES.filter((a) => a !== lastSavedAngle);
    return remaining[0] ?? null;
  }, [monument, lastSavedAngle]);

  if (!repositories || !monument) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <AppText style={styles.muted}>Loading monument capture brief...</AppText>
      </View>
    );
  }

  if (!cameraPermission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={48} color={colors.accent} />
          <AppText style={styles.permissionTitle}>Camera access required</AppText>
          <AppText style={styles.muted}>
            Field Collector Mode needs the camera to capture the five required angles for {monument.names.en}.
          </AppText>
          <Pressable style={styles.primaryButton} onPress={() => void requestCameraPermission()}>
            <AppText style={styles.primaryButtonText}>Allow camera</AppText>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()}>
            <AppText style={styles.link}>Go back</AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const capture = async () => {
    if (!cameraRef.current || saving) return;
    setSaving(true);
    try {
      const currentFix = (await refreshFix()) ?? fix;
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
        exif: true,
      });
      if (!photo?.uri) {
        throw new Error('Camera returned an empty image.');
      }

      const destDir = `${FileSystem.documentDirectory}field_captures/${monument.id}/`;
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      const destUri = `${destDir}${angle}_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: photo.uri, to: destUri });

      await repositories.captures.enqueue({
        clientCaptureId: newCaptureId(),
        monumentId: monument.id,
        zoneId: monument.zoneId,
        angle,
        photoUri: destUri,
        voiceNoteUri,
        latitude: currentFix?.lat ?? null,
        longitude: currentFix?.lng ?? null,
        altitudeM: currentFix?.altitudeM ?? null,
        gpsAccuracyM: currentFix?.accuracyM ?? null,
        headingDeg: currentFix?.headingDeg ?? null,
        lightingTag: lighting,
        notes: monument.fieldPhotoSpec.occlusionNotes,
        capturedAt: new Date().toISOString(),
      });
      notifyQueueChanged();
      setLastSavedAngle(angle);
      setVoiceNoteUri(null);

      const nextIdx = (angleIndex + 1) % CAPTURE_ANGLES.length;
      const nextAngle = CAPTURE_ANGLES[nextIdx]!;
      Alert.alert(
        'Angle saved',
        `${CAPTURE_ANGLE_LABELS[angle]} queued for ${mode === 'NTB_VIP_DEMO_MODE' ? 'demo archive' : 'offline sync'}.`,
        [
          {
            text: 'Next angle',
            onPress: () => setAngle(nextAngle),
          },
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Capture failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <AngleFramingOverlay angle={angle} framingNote={framingNote} />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.topMeta}>
            <AppText style={styles.monumentName}>{monument.names.en}</AppText>
            <AppText style={styles.monumentNe}>{monument.names.ne}</AppText>
          </View>
          <View style={styles.gpsPill}>
            <Ionicons
              name={locationPermission === 'granted' && fix ? 'navigate' : 'navigate-outline'}
              size={14}
              color={colors.accent}
            />
            <AppText style={styles.gpsText}>
              {fix
                ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}${
                    fix.headingDeg != null ? ` · ${Math.round(fix.headingDeg)}°` : ''
                  }${fix.altitudeM != null ? ` · ${Math.round(fix.altitudeM)}m` : ''}`
                : 'Waiting for GPS'}
            </AppText>
          </View>
        </View>

        <View style={styles.midHint}>
          <AppText style={styles.hintTitle}>
            Angle {angleIndex + 1}/5 · {CAPTURE_ANGLE_LABELS[angle]}
          </AppText>
          <AppText style={styles.hintBody}>{monument.fieldPhotoSpec.lightingNotes}</AppText>
          <AppText style={styles.hintBody}>{monument.fieldPhotoSpec.occlusionNotes}</AppText>
        </View>

        <View style={styles.bottomPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.angleRow}>
            {CAPTURE_ANGLES.map((a) => (
              <Pressable
                key={a}
                style={[styles.angleChip, a === angle && styles.angleChipActive, a === lastSavedAngle && styles.angleChipDone]}
                onPress={() => setAngle(a)}
              >
                <AppText style={[styles.angleChipText, a === angle && styles.angleChipTextActive]}>
                  {CAPTURE_ANGLE_LABELS[a]}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.angleRow}>
            {LIGHTING_TAGS.map((tag) => (
              <Pressable
                key={tag.key}
                style={[styles.lightChip, lighting === tag.key && styles.lightChipActive]}
                onPress={() => setLighting(tag.key)}
              >
                <AppText style={[styles.lightChipText, lighting === tag.key && styles.lightChipTextActive]}>
                  {tag.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>

          <VoiceNoteRecorder recordedUri={voiceNoteUri} onRecorded={setVoiceNoteUri} />

          <View style={styles.shutterRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() =>
                navigation.navigate('MonumentStory', { monumentId: monument.id })
              }
            >
              <Ionicons name="book-outline" size={18} color={colors.textSecondary} />
            </Pressable>
            <Pressable style={[styles.shutter, saving && styles.shutterDisabled]} onPress={() => void capture()} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.background} /> : <View style={styles.shutterInner} />}
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => nextMissingAngle && setAngle(nextMissingAngle)}
            >
              <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  muted: { color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMeta: { marginTop: 4 },
  monumentName: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  monumentNe: { color: colors.textSecondary, fontSize: 14 },
  gpsPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsText: { color: colors.textSecondary, fontSize: 11 },
  midHint: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(2, 18, 8, 0.72)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  hintTitle: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  hintBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  bottomPanel: {
    backgroundColor: 'rgba(2, 18, 8, 0.92)',
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  angleRow: { paddingHorizontal: 12, gap: 8 },
  angleChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  angleChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(21,255,117,0.15)' },
  angleChipDone: { borderColor: colors.successLight },
  angleChipText: { color: colors.textSecondary, fontSize: 12 },
  angleChipTextActive: { color: colors.accent, fontWeight: '700' },
  lightChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lightChipActive: { borderColor: colors.warning, backgroundColor: 'rgba(251,191,36,0.12)' },
  lightChipText: { color: colors.textMuted, fontSize: 11 },
  lightChipTextActive: { color: colors.warning, fontWeight: '600' },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 8,
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(21,255,117,0.12)',
  },
  shutterDisabled: { opacity: 0.6 },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
  },
  permissionTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  primaryButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: { color: colors.background, fontWeight: '700' },
  link: { color: colors.textSecondary, marginTop: 8 },
});
