import { useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { AppText } from '@components/AppText';
import { AppTextInput } from '@components/AppTextInput';
import { LinearGradient } from 'expo-linear-gradient';
import Checkbox from 'expo-checkbox';
import { colors } from '@theme/colors';
import { useAuth } from '../context/AuthContext';

const background = require('../../assets/bgsaalik.jpg');

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    // Simple mock login
    if (email && password) {
      login();
    } else {
      // Allow empty for demo convenience, or enforce?
      // Let's enforce non-empty for "realism"
      if (!email || !password) {
        setError('Please enter credentials.');
        return;
      }
      login();
    }
    setError('');
  };

  return (
    <ImageBackground source={background} style={styles.background} resizeMode="cover">
      <LinearGradient colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.2)"]} style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <AppText style={styles.logo}>SAALIK</AppText>
            <AppText style={styles.tagline}>Curated journeys for soul-first tourism</AppText>
          </View>

          <View style={styles.loginCard}>
            <AppText style={styles.loginTitle}>Welcome Back</AppText>

            <View>
              <AppText style={styles.label}>Email</AppText>
              <AppTextInput
                style={styles.input}
                placeholder="explorer@saalik.ai"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View>
              <AppText style={styles.label}>Password</AppText>
              <AppTextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.rowBetween}>
              <View style={styles.rememberRow}>
                <Checkbox
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  color={rememberMe ? colors.accent : undefined}
                />
                <AppText style={styles.rememberText}>Remember me</AppText>
              </View>
              <AppText style={styles.link}>Forgot Password?</AppText>
            </View>

            {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

            <Pressable style={styles.primaryButton} onPress={handleLogin}>
              <AppText style={styles.primaryButtonText}>Log In</AppText>
            </Pressable>

            <AppText style={styles.footerText}>
              Don't have an account? <AppText style={styles.link}>Sign Up</AppText>
            </AppText>
          </View>
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scroll: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 80,
    gap: 20,
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    color: colors.accent,
    letterSpacing: 4,
  },
  tagline: {
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  loginCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  loginTitle: {
    color: colors.accent,
    fontSize: 26,
    letterSpacing: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.inputBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    color: colors.textPrimary,
  },
  link: {
    color: colors.accent,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#021007',
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
});
