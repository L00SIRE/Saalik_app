import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '@components/AppText';
import { ConfidenceBadge } from '@components/heritage/ConfidenceBadge';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import { useCurrentFix } from '../../hooks/useCurrentFix';
import { recordScanTelemetry, runScan } from '../../services/scanner/scanService';
import {
  SAMPLE_MONUMENT_FRAMES,
  sampleFrameToBase64,
  type SampleMonumentFrame,
} from '../../services/scanner/sampleFrames';
import {
  APP_MODE_LABELS,
  CAPTURE_ANGLES,
  CAPTURE_ANGLE_LABELS,
  type CaptureAngle,
  type HeritageMonument,
  type ScanResult,
} from '../../types/heritage';

function cuePhrase(monument: HeritageMonument): string {
  const roof = monument.visualCues.roofTiers > 0 ? `a ${monument.visualCues.roofTiers}-tiered roof` : 'no tiered pagoda roof';
  const feature = monument.visualCues.distinguishingFeatures[0];
  return feature ? `${roof}, ${feature}` : roof;
}

/** Scores closer than this are a coin toss, so the visitor is asked what they can see. */
const TIE_MARGIN = 0.05;

function tieQuestion(matches: ScanResult['matches']): string | null {
  const [first, second] = matches;
  if (!first || !second || first.score <= 0) return null;
  if (first.score - second.score > TIE_MARGIN) return null;
  return `Do you see ${cuePhrase(first.monument)}, or ${cuePhrase(second.monument)}?`;
}

function formatDistance(distanceM: number | null): string {
  if (distanceM === null) return 'distance unknown';
  return distanceM < 1000 ? `${Math.round(distanceM)} m away` : `${(distanceM / 1000).toFixed(1)} km away`;
}

const isSimulator = Platform.OS === 'ios' && !Constants.isDevice;

export function ScannerScreen() {
  const navigation = useNavigation<any>();
  const { mode, connectivity, repositories } = useAppMode();
  const { fix, refresh: refreshFix } = useCurrentFix();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [demoZone, setDemoZone] = useState<string | null>(null);
  const [demoTarget, setDemoTarget] = useState<HeritageMonument | null>(null);
  const [demoAngle, setDemoAngle] = useState<CaptureAngle>('ESTABLISHING_FRONT');
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);

  const isDemo = mode === 'NTB_VIP_DEMO_MODE';
  const zones = repositories?.monuments.getZones() ?? [];
  const zoneMonuments = useMemo(
    () => (repositories && demoZone ? repositories.monuments.getByZone(demoZone) : []),
    [repositories, demoZone],
  );
  const showLivePhotoBar = !isDemo;

  if (!repositories) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const executeScan = async (photoBase64: string | null) => {
    setScanning(true);
    try {
      const currentFix = isDemo ? fix : (await refreshFix()) ?? fix;
      const scan = await runScan({
        mode,
        connectivity,
        repositories,
        fix: currentFix,
        photoBase64,
        demoTarget,
        demoAngle,
      });
      setResult(scan);
      void recordScanTelemetry(mode, scan, currentFix, connectivity);
    } finally {
      setScanning(false);
      setActiveSampleId(null);
    }
  };

  const captureAndScan = async () => {
    if (!cameraRef.current) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: mode === 'LIVE_CLOUD' && connectivity.isConnected,
      });
      await executeScan(photo?.base64 ?? null);
    } catch (error) {
      setScanning(false);
      setResult({
        source: 'gps_only',
        searchRadiusM: null,
        matches: [],
        notice: error instanceof Error ? `Camera error: ${error.message}` : 'Camera error.',
      });
    }
  };

  const pickPhotoAndScan = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setResult({
        source: 'gps_only',
        searchRadiusM: null,
        matches: [],
        notice: 'Photo library permission is required to pick a monument frame.',
      });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (picked.canceled || !picked.assets[0]?.base64) return;
    await executeScan(picked.assets[0].base64);
  };

  const scanSampleFrame = async (frame: SampleMonumentFrame) => {
    setActiveSampleId(frame.id);
    try {
      const base64 = await sampleFrameToBase64(frame.source);
      await executeScan(base64);
    } catch (error) {
      setActiveSampleId(null);
      setResult({
        source: 'gps_only',
        searchRadiusM: null,
        matches: [],
        notice: error instanceof Error ? `Sample frame error: ${error.message}` : 'Sample frame error.',
      });
    }
  };

  const openMonument = (monumentId: string, score?: number) => {
    // On a near-tie the story screen offers a one-tap switch to the other candidate.
    const tied = result && tieQuestion(result.matches) ? result.matches.slice(0, 2).map((m) => m.monument.id) : [];
    const alternateId = tied.includes(monumentId) ? tied.find((id) => id !== monumentId) : undefined;
    navigation.navigate('MonumentStory', { monumentId, matchScore: score, alternateId });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <AppText style={styles.topTitle}>AI Monument Scanner</AppText>
        <View style={styles.modePill}>
          <AppText style={styles.modePillText}>{APP_MODE_LABELS[mode].title}</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isDemo ? (
          <View style={styles.demoPanel}>
            <AppText style={styles.sectionTitle}>Demo photo library</AppText>
            <AppText style={styles.helper}>
              Pick a monument and a camera angle. The scan runs entirely on this device, so it works in Airplane Mode.
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {zones.map((zone) => (
                <Pressable
                  key={zone.zoneId}
                  style={[styles.chip, demoZone === zone.zoneId && styles.chipActive]}
                  onPress={() => {
                    setDemoZone(zone.zoneId);
                    setDemoTarget(null);
                  }}
                >
                  <AppText style={[styles.chipText, demoZone === zone.zoneId && styles.chipTextActive]}>{zone.names.en}</AppText>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.grid}>
              {zoneMonuments.map((monument) => (
                <Pressable
                  key={monument.id}
                  style={[styles.tile, demoTarget?.id === monument.id && styles.tileActive]}
                  onPress={() => setDemoTarget(monument)}
                >
                  <AppText style={styles.tileTitle} numberOfLines={2}>
                    {monument.names.en}
                  </AppText>
                  <AppText style={styles.tileNe} numberOfLines={1}>
                    {monument.names.ne}
                  </AppText>
                </Pressable>
              ))}
            </View>
            {demoTarget && (
              <>
                <AppText style={styles.helper}>Simulated camera angle</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {CAPTURE_ANGLES.map((angle) => (
                    <Pressable key={angle} style={[styles.chip, demoAngle === angle && styles.chipActive]} onPress={() => setDemoAngle(angle)}>
                      <AppText style={[styles.chipText, demoAngle === angle && styles.chipTextActive]}>{CAPTURE_ANGLE_LABELS[angle]}</AppText>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            <Pressable
              style={[styles.scanButton, (!demoTarget || scanning) && styles.disabled]}
              disabled={!demoTarget || scanning}
              onPress={() => void executeScan(null)}
            >
              {scanning ? <ActivityIndicator color="#021007" /> : <AppText style={styles.scanButtonText}>Run on-device scan</AppText>}
            </Pressable>
          </View>
        ) : !permission?.granted && !isSimulator ? (
          <View style={styles.permission}>
            <Ionicons name="camera-outline" size={40} color={colors.accent} />
            <AppText style={styles.helper}>Saalik needs the camera to identify monuments.</AppText>
            <Pressable style={styles.scanButton} onPress={() => void requestPermission()}>
              <AppText style={styles.scanButtonText}>Allow camera</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            {permission?.granted ? (
              <>
                <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                <Pressable style={[styles.shutter, scanning && styles.disabled]} onPress={() => void captureAndScan()} disabled={scanning}>
                  {scanning ? <ActivityIndicator color="#021007" /> : <Ionicons name="scan" size={30} color="#021007" />}
                </Pressable>
              </>
            ) : (
              <View style={styles.simulatorPlaceholder}>
                <Ionicons name="phone-portrait-outline" size={36} color={colors.accent} />
                <AppText style={styles.helper}>
                  Camera is unavailable on the Simulator. Use Pick Photo or a sample monument frame below to hit the live CLIP worker.
                </AppText>
              </View>
            )}
          </View>
        )}

        {showLivePhotoBar && (
          <View style={styles.liveBar}>
            <AppText style={styles.sectionTitle}>Pick Photo / Sample Monument Frame</AppText>
            <AppText style={styles.helper}>
              {isSimulator
                ? 'iOS Simulator has no physical camera. Pick a photo or tap a bundled frame to POST /api/heritage/scan-image through the Apple MPS CLIP worker on port 8099.'
                : 'Conference-room fallback: pick any photo or tap a bundled monument frame to demonstrate the live CLIP path.'}
            </AppText>
            <Pressable
              style={[styles.scanButton, scanning && styles.disabled]}
              disabled={scanning}
              onPress={() => void pickPhotoAndScan()}
            >
              {scanning && !activeSampleId ? (
                <ActivityIndicator color="#021007" />
              ) : (
                <View style={styles.pickRow}>
                  <Ionicons name="images-outline" size={18} color="#021007" />
                  <AppText style={styles.scanButtonText}>Pick Photo</AppText>
                </View>
              )}
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sampleRow}>
              {SAMPLE_MONUMENT_FRAMES.map((frame) => {
                const active = activeSampleId === frame.id;
                return (
                  <Pressable
                    key={frame.id}
                    style={[styles.sampleCard, active && styles.sampleCardActive, scanning && styles.disabled]}
                    disabled={scanning}
                    onPress={() => void scanSampleFrame(frame)}
                  >
                    <Image source={frame.source} style={styles.sampleThumb} />
                    {active ? (
                      <ActivityIndicator color={colors.accent} style={styles.sampleSpinner} />
                    ) : (
                      <AppText style={styles.sampleLabel} numberOfLines={2}>
                        {frame.label}
                      </AppText>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {result?.notice && (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
            <AppText style={styles.noticeText}>{result.notice}</AppText>
          </View>
        )}

        {result && result.matches.length > 1 && tieQuestion(result.matches) && (
          <View style={styles.tieCard}>
            <AppText style={styles.sectionTitle}>Which one are you facing?</AppText>
            <AppText style={styles.helper}>{tieQuestion(result.matches)}</AppText>
            <View style={styles.tieActions}>
              {result.matches.slice(0, 2).map((match) => (
                <Pressable key={match.monument.id} style={styles.tieButton} onPress={() => openMonument(match.monument.id, match.score)}>
                  <AppText style={styles.tieButtonText}>{match.monument.names.en}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {result && result.matches.length > 0 && (
          <View style={styles.results}>
            <AppText style={styles.sectionTitle}>Top matches</AppText>
            {result.searchRadiusM !== null && (
              <AppText style={styles.helper}>Searched within {(result.searchRadiusM / 1000).toFixed(result.searchRadiusM < 1000 ? 2 : 0)} km of your position.</AppText>
            )}
            {result.matches.map((match, index) => (
              <Pressable key={match.monument.id} style={styles.match} onPress={() => openMonument(match.monument.id, match.score)}>
                <AppText style={styles.rank}>{index + 1}</AppText>
                <View style={styles.matchBody}>
                  <AppText style={styles.matchName}>{match.monument.names.en}</AppText>
                  <AppText style={styles.matchNe}>{match.monument.names.ne}</AppText>
                  <ConfidenceBadge confidence={match.confidence} score={match.score} />
                  <AppText style={styles.matchMeta}>
                    {formatDistance(match.distanceM)}
                    {match.bestAngle ? ` - best match: ${CAPTURE_ANGLE_LABELS[match.bestAngle]}` : ''}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  topTitle: { color: colors.textPrimary, fontSize: 18, flex: 1 },
  modePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  modePillText: { color: colors.textSecondary, fontSize: 11 },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  sectionTitle: { color: colors.textPrimary, fontSize: 17 },
  helper: { color: colors.textSecondary, fontSize: 13 },
  tieCard: { gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.warning, backgroundColor: 'rgba(251, 191, 36, 0.08)' },
  tieActions: { flexDirection: 'row', gap: 8 },
  tieButton: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tieButtonText: { color: colors.textPrimary, fontSize: 12, textAlign: 'center' },
  demoPanel: { gap: 12 },
  chips: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  chipTextActive: { color: '#021007' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '48%',
    minHeight: 64,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  tileActive: { borderColor: colors.accent, backgroundColor: 'rgba(21, 255, 117, 0.08)' },
  tileTitle: { color: colors.textPrimary, fontSize: 13 },
  tileNe: { color: colors.textMuted, fontSize: 12 },
  scanButton: { backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  scanButtonText: { color: '#021007', fontSize: 15 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabled: { opacity: 0.5 },
  permission: { alignItems: 'center', gap: 12, padding: 24 },
  cameraWrap: { height: 380, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1 },
  shutter: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulatorPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: colors.card,
  },
  liveBar: { gap: 12 },
  sampleRow: { gap: 10, paddingVertical: 4 },
  sampleCard: {
    width: 112,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sampleCardActive: { borderColor: colors.accent },
  sampleThumb: { width: 112, height: 84, backgroundColor: '#111' },
  sampleLabel: { color: colors.textPrimary, fontSize: 11, paddingHorizontal: 8, paddingVertical: 8 },
  sampleSpinner: { marginVertical: 10 },
  notice: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  noticeText: { color: colors.textPrimary, fontSize: 13, flex: 1 },
  results: { gap: 10 },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rank: { color: colors.accent, fontSize: 22, width: 24, textAlign: 'center' },
  matchBody: { flex: 1, gap: 4 },
  matchName: { color: colors.textPrimary, fontSize: 15 },
  matchNe: { color: colors.textSecondary, fontSize: 13 },
  matchMeta: { color: colors.textMuted, fontSize: 12 },
});
