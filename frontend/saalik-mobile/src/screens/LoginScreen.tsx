import { useState } from 'react';
import { ImageBackground, StyleSheet, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@components/AppText';
import { Button } from '@components/Button';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';
import { useAuth } from '../context/AuthContext';
import type { DemoPersona } from '@app-types/auth';

const background = require('../../assets/bgsaalik.jpg');

// Three quick selling points shown under the logo — keeps the splash on-message
// for a pitch without any forms to fill in.
const VALUE_PROPS: { icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; text: string }[] = [
  { icon: 'walk', text: 'Free walking tours led by passionate locals' },
  { icon: 'heart', text: 'Pay what the experience is worth — tip the guide' },
  { icon: 'scan', text: 'Scan any landmark to instantly learn its story' },
];

export function LoginScreen() {
  const { loginAsDemo } = useAuth();
  const [loading, setLoading] = useState<DemoPersona | null>(null);
  const [error, setError] = useState('');

  const enter = async (persona: DemoPersona) => {
    setError('');
    setLoading(persona);
    try {
      await loginAsDemo(persona);
    } catch (e: any) {
      setError(e?.message ?? 'Could not open Saalik. Please try again.');
      setLoading(null);
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={background} style={StyleSheet.absoluteFill} resizeMode="cover">
        <LinearGradient
          colors={['rgba(2,18,8,0.45)', 'rgba(2,18,8,0.85)', 'rgba(2,18,8,0.98)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Ionicons name="leaf" size={24} color={colors.accent} />
            </View>
            <AppText variant="display" tone="primary" style={styles.logoText}>
              SAALIK
            </AppText>
            <AppText variant="bodyLg" tone="secondary" align="center" style={styles.tagline}>
              Discover Nepal on foot, with the people who call it home.
            </AppText>
          </View>

          {/* Value props */}
          <View style={styles.props}>
            {VALUE_PROPS.map((p) => (
              <View key={p.text} style={styles.propRow}>
                <View style={styles.propIcon}>
                  <Ionicons name={p.icon} size={16} color={colors.accent} />
                </View>
                <AppText variant="bodySm" tone="primary" style={styles.propText}>
                  {p.text}
                </AppText>
              </View>
            ))}
          </View>

          {/* Entry */}
          <View style={styles.cta}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <AppText variant="bodySm" tone="error" style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            ) : null}

            <Button
              label="Explore Saalik"
              onPress={() => enter('traveler-aanya')}
              loading={loading === 'traveler-aanya'}
              disabled={loading !== null}
              size="lg"
              fullWidth
              rightIcon={loading ? undefined : 'arrow-forward'}
            />

            <Pressable
              onPress={() => enter('guide-bishnu')}
              disabled={loading !== null}
              hitSlop={8}
              style={({ pressed }) => [styles.guideLink, pressed && styles.guideLinkPressed]}
            >
              <Ionicons name="briefcase-outline" size={15} color={colors.textSecondary} />
              <AppText variant="label" tone="secondary">
                {loading === 'guide-bishnu' ? 'Opening guide view…' : "I'm a guide — preview my dashboard"}
              </AppText>
            </Pressable>

            <AppText variant="caption" tone="muted" align="center" style={styles.legal}>
              A guided preview of Saalik. No signup, no setup.
            </AppText>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.huge,
    paddingBottom: space.xl,
    justifyContent: 'space-between',
  },

  // Brand
  brand: { alignItems: 'center', gap: space.sm },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(21, 255, 117, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(21, 255, 117, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  logoText: { letterSpacing: 9, fontSize: 38 },
  tagline: { maxWidth: 300, marginTop: space.sm },

  // Value props
  props: {
    gap: space.md,
    backgroundColor: 'rgba(2, 18, 8, 0.55)',
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: 'rgba(21, 255, 117, 0.16)',
    padding: space.xl,
  },
  propRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  propIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(21, 255, 117, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propText: { flex: 1, lineHeight: 19 },

  // CTA
  cta: { gap: space.lg },
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  guideLinkPressed: { opacity: 0.6 },
  legal: { marginTop: -space.sm },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    backgroundColor: 'rgba(255, 107, 107, 0.10)',
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: { flex: 1 },
});
