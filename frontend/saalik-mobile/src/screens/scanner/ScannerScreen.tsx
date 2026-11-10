import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '@components/AppText';
import { ConfidenceBadge } from '@components/heritage/ConfidenceBadge';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import { useCurrentFix } from '../../hooks/useCurrentFix';
import { recordScanTelemetry, runScan } from '../../services/scanner/scanService';
import {
  APP_MODE_LABELS,
  CAPTURE_ANGLES,
  CAPTURE_ANGLE_LABELS,
  type CaptureAngle,
  type HeritageMonument,
  type ScanResult,
} from '../../types/heritage';

function formatDistance(distanceM: number | null): string {
  if (distanceM === null) return 'distance unknown';
  return distanceM < 1000 ? `${Math.round(distanceM)} m away` : `${(distanceM / 1000).toFixed(1)} km away`;
}

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

  const isDemo = mode === 'NTB_VIP_DEMO_MODE';
  const zones = repositories?.monuments.getZones() ?? [];
  const zoneMonuments = useMemo(
    () => (repositories && demoZone ? repositories.monuments.getByZone(demoZone) : []),
    [repositories, demoZone],
  );

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

  const openMonument = (monumentId: string, score?: number) =>
    navigation.navigate('MonumentStory', { monumentId, matchScore: score });

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
        ) : !permission?.granted ? (
          <View style={styles.permission}>
            <Ionicons name="camera-outline" size={40} color={colors.accent} />
            <AppText style={styles.helper}>Saalik needs the camera to identify monuments.</AppText>
            <Pressable style={styles.scanButton} onPress={() => void requestPermission()}>
              <AppText style={styles.scanButtonText}>Allow camera</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <Pressable style={[styles.shutter, scanning && styles.disabled]} onPress={() => void captureAndScan()} disabled={scanning}>
              {scanning ? <ActivityIndicator color="#021007" /> : <Ionicons name="scan" size={30} color="#021007" />}
            </Pressable>
          </View>
        )}

        {result?.notice && (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
            <AppText style={styles.noticeText}>{result.notice}</AppText>
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
