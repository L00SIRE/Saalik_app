import { useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AppText } from '@components/AppText';
import { AppTextInput } from '@components/AppTextInput';
import { LinearGradient } from 'expo-linear-gradient';
import Checkbox from 'expo-checkbox';
import { colors } from '@theme/colors';
import { useAuth } from '../context/AuthContext';

const background = require('../../assets/bgsaalik.jpg');

export function LoginScreen() {
  const { login, register, isLoading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLocalError('');
    if (!email || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }
    if (!isLoginMode && !name) {
      setLocalError('Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (e: any) {
      // Parse error message if possible
      const msg = e.response?.data?.error || 'Authentication failed. Please check your connection or credentials.';
      setLocalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
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
            <AppText style={styles.loginTitle}>
              {isLoginMode ? 'Welcome Back' : 'Begin Journey'}
            </AppText>

            {!isLoginMode && (
              <View>
                <AppText style={styles.label}>Name</AppText>
                <AppTextInput
                  style={styles.input}
                  placeholder="Your Name"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

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

            {isLoginMode && (
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
            )}

            {localError ? <AppText style={styles.errorText}>{localError}</AppText> : null}

            <Pressable
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#021007" />
              ) : (
                <AppText style={styles.primaryButtonText}>
                  {isLoginMode ? 'Log In' : 'Sign Up'}
                </AppText>
              )}
            </Pressable>

            <View style={styles.footerContainer}>
              <AppText style={styles.footerText}>
                {isLoginMode ? "Don't have an account?" : "Already have an account?"}
              </AppText>
              <Pressable onPress={() => {
                setIsLoginMode(!isLoginMode);
                setLocalError('');
              }}>
                <AppText style={[styles.link, { marginLeft: 6 }]}>
                  {isLoginMode ? 'Sign Up' : 'Log In'}
                </AppText>
              </Pressable>
            </View>
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
    marginBottom: 8,
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
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#021007',
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  footerText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
  },
});
