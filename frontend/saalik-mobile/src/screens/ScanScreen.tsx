import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@components/AppText';
import { AppTextInput } from '@components/AppTextInput';
import { Button } from '@components/Button';
import { Chip } from '@components/Chip';
import { colors } from '@theme/colors';
import { radii, shadows, space } from '@theme';
import { useScanner } from '@logic/discovery/useScanner';

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 · Rendering / UI — Scan & Discover screen (DUMB component)
//
// Identification logic, timing, and the heritage dataset now live behind the
// `useScanner` Logic hook (Layer 3) → Discovery service (Layer 4). This screen
// only owns the input value + the scan-line animation, which it drives off the
// hook's `status`.
// ─────────────────────────────────────────────────────────────────────────────

const SCAN_STAGE_HEIGHT = 220;

export function ScanScreen() {
  const { status, result, mode, suggestions, scan, reset } = useScanner();
  const [query, setQuery] = useState('');

  // Animation drivers (pure presentation).
  const scanLine = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startScanAnimation = () => {
    scanLine.setValue(0);
    const line = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loopRef.current = Animated.parallel([line, glow]);
    loopRef.current.start();
  };

  const stopScanAnimation = () => {
    loopRef.current?.stop();
    loopRef.current = null;
  };

  // Run the scan-line animation exactly while the hook reports a scan in flight.
  useEffect(() => {
    if (status === 'scanning') {
      startScanAnimation();
    } else {
      stopScanAnimation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => () => loopRef.current?.stop(), []);

  const analyzeText = () => scan(query, 'text');
  const analyzePhoto = () => scan(query, 'photo');

  const onSuggestion = (label: string) => {
    setQuery(label);
    scan(label, 'text');
  };

  const handleReset = () => {
    reset();
    setQuery('');
  };

  const translateY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [12, SCAN_STAGE_HEIGHT - 24],
  });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SafeAreaView edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <AppText variant="overline" tone="accent">
              Scan &amp; Discover
            </AppText>
            <AppText variant="h1" tone="primary" style={styles.title}>
              Point at a landmark.{'\n'}Know its story.
            </AppText>
            <AppText variant="body" tone="secondary" style={styles.subtitle}>
              Snap or name any temple, stupa or peak in Nepal and Saalik tells you what you&apos;re
              looking at — history, meaning and the little details guidebooks skip.
            </AppText>
          </View>
        </SafeAreaView>

        {/* Scan stage */}
        <View style={styles.stageWrap}>
          <View style={styles.stage}>
            {status === 'result' && result ? (
              <Image source={{ uri: result.image }} style={StyleSheet.absoluteFillObject} />
            ) : (
              <LinearGradient
                colors={['#063d20', '#021d0f']}
                style={StyleSheet.absoluteFillObject}
              />
            )}

            {/* Corner brackets — camera framing */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {status === 'scanning' && (
              <>
                <Animated.View
                  style={[styles.scanLine, { transform: [{ translateY }], opacity: glowOpacity }]}
                />
                <View style={styles.stageCenter}>
                  <Ionicons name="scan" size={30} color={colors.accent} />
                  <AppText variant="label" tone="accent" style={styles.stageLabel}>
                    {mode === 'photo' ? 'Reading image…' : 'Identifying landmark…'}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    Matching against Nepal heritage index
                  </AppText>
                </View>
              </>
            )}

            {status === 'idle' && (
              <View style={styles.stageCenter}>
                <Ionicons name="camera-outline" size={34} color={colors.textSecondary} />
                <AppText variant="bodySm" tone="secondary" style={styles.stageHint}>
                  Type a place name or upload a photo to begin
                </AppText>
              </View>
            )}

            {status === 'miss' && (
              <View style={styles.stageCenter}>
                <Ionicons name="help-circle-outline" size={34} color={colors.warning} />
                <AppText variant="bodySm" tone="secondary" style={styles.stageHint}>
                  Couldn&apos;t place that one. Try a famous Nepal landmark.
                </AppText>
              </View>
            )}

            {status === 'result' && result && (
              <LinearGradient
                colors={['transparent', 'rgba(2,18,8,0.5)']}
                style={StyleSheet.absoluteFillObject}
              />
            )}
          </View>
        </View>

        {/* Input + actions (hidden while a result is shown) */}
        {status !== 'result' && (
          <View style={styles.controls}>
            <AppTextInput
              placeholder="e.g. Pashupatinath, Boudhanath, Everest"
              value={query}
              onChangeText={setQuery}
              leftIcon="search-outline"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={analyzeText}
              editable={status !== 'scanning'}
            />

            <Button
              label={status === 'scanning' ? 'Scanning…' : 'Scan & identify'}
              onPress={analyzeText}
              loading={status === 'scanning' && mode === 'text'}
              disabled={status === 'scanning' || query.trim().length === 0}
              size="lg"
              fullWidth
              leftIcon={status === 'scanning' ? undefined : 'sparkles'}
            />

            <Pressable
              onPress={analyzePhoto}
              disabled={status === 'scanning' || query.trim().length === 0}
              style={({ pressed }) => [
                styles.uploadBtn,
                pressed && styles.uploadPressed,
                (status === 'scanning' || query.trim().length === 0) && styles.uploadDisabled,
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={colors.accent} />
              <AppText variant="button" tone="accent">
                Upload a photo
              </AppText>
            </Pressable>

            {/* Suggestions */}
            <View style={styles.suggestWrap}>
              <AppText variant="caption" tone="muted" style={styles.suggestLabel}>
                TRY ONE OF THESE
              </AppText>
              <View style={styles.suggestRow}>
                {suggestions.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    selected={false}
                    onPress={() => onSuggestion(s)}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Result card */}
        {status === 'result' && result && (
          <View style={styles.result}>
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleBlock}>
                <AppText variant="h2" tone="primary">
                  {result.name}
                </AppText>
                <AppText variant="bodySm" tone="accent">
                  {result.kicker}
                </AppText>
              </View>
              {result.unesco && (
                <View style={styles.unescoBadge}>
                  <Ionicons name="ribbon" size={13} color="#021007" />
                  <AppText variant="caption" tone="inverse" style={styles.unescoText}>
                    UNESCO
                  </AppText>
                </View>
              )}
            </View>

            <View style={styles.metaRows}>
              <MetaRow icon="location-outline" label={result.location} />
              <MetaRow icon="time-outline" label={result.built} />
            </View>

            <AppText variant="body" tone="secondary" style={styles.summary}>
              {result.summary}
            </AppText>

            <View style={styles.factsBlock}>
              <AppText variant="overline" tone="accent">
                Key facts
              </AppText>
              {result.facts.map((f, i) => (
                <View key={i} style={styles.factRow}>
                  <View style={styles.factDot} />
                  <AppText variant="bodySm" tone="primary" style={styles.factText}>
                    {f}
                  </AppText>
                </View>
              ))}
            </View>

            <View style={styles.funFact}>
              <Ionicons name="bulb" size={16} color={colors.warning} />
              <AppText variant="bodySm" tone="primary" style={styles.funFactText}>
                {result.funFact}
              </AppText>
            </View>

            <Button
              label="Scan another"
              onPress={handleReset}
              variant="secondary"
              size="lg"
              fullWidth
              leftIcon="scan-outline"
              style={styles.again}
            />
          </View>
        )}

        <View style={{ height: space.huge }} />
      </ScrollView>
    </View>
  );
}

function MetaRow({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <AppText variant="bodySm" tone="secondary" style={styles.metaText}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: space.xxxl },

  // Header
  header: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    gap: space.sm,
  },
  title: { marginTop: space.xs },
  subtitle: { marginTop: space.xs },

  // Stage
  stageWrap: {
    paddingHorizontal: space.xl,
    marginTop: space.xl,
  },
  stage: {
    height: SCAN_STAGE_HEIGHT,
    borderRadius: radii.xxl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(21, 255, 117, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#021d0f',
  },
  stageCenter: {
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.xl,
  },
  stageLabel: { marginTop: space.sm },
  stageHint: { marginTop: space.sm, textAlign: 'center', maxWidth: 240 },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: colors.accent,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 },
  cornerTR: { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 },

  // Controls
  controls: {
    paddingHorizontal: space.xl,
    marginTop: space.xl,
    gap: space.md,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(21, 255, 117, 0.3)',
    backgroundColor: 'rgba(21, 255, 117, 0.06)',
  },
  uploadPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  uploadDisabled: { opacity: 0.45 },

  suggestWrap: { marginTop: space.sm, gap: space.sm },
  suggestLabel: { letterSpacing: 1.2 },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },

  // Result
  result: {
    paddingHorizontal: space.xl,
    marginTop: space.xl,
    gap: space.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  resultTitleBlock: { flex: 1, gap: space.xxs },
  unescoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  unescoText: { fontWeight: '700', fontSize: 10, letterSpacing: 0.5 },
  metaRows: { gap: space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  metaText: { flex: 1 },
  summary: { lineHeight: 22 },
  factsBlock: {
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: 'rgba(21, 255, 117, 0.14)',
  },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  factDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  factText: { flex: 1, lineHeight: 20 },
  funFact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  funFactText: { flex: 1, lineHeight: 20 },
  again: { marginTop: space.xs },
});
