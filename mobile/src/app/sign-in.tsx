import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { LockIcon, LogoMark } from '@/components/FinanceIcons';
import { FINANCIAL_QUOTES, getDailyQuote } from '@shared/quotes';
import { fontSize, radius, spacing } from '@/theme';

type Mode = 'signin' | 'signup';

/** Maps Firebase auth error codes to messages a person can act on. */
function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account with that email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'No internet connection. Check your network and try again.';
    default:
      return 'Something went wrong signing you in. Please try again.';
  }
}

export default function SignInScreen() {
  const { palette } = useTheme();
  const { login, signup, resetPassword } = useAuth();

  const [quote] = useState(() => getDailyQuote(FINANCIAL_QUOTES));
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim()) return setError('Enter your email address.');
    if (!password) return setError('Enter your password.');
    if (mode === 'signup' && password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setBusy(true);
    try {
      if (mode === 'signin') await login(email, password);
      else await signup(email, password);
      // Navigation is handled by AuthGate reacting to auth state.
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address first, then tap Forgot password.');
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert('Check your email', `A password reset link was sent to ${email.trim()}.`);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    // Brand gradient ground with a white form card on top — the web auth
    // screen's treatment, not the app's usual light page background.
    <LinearGradient
      colors={palette.primaryGradient as unknown as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Branding header — mirrors AuthMobile on the web: frosted logo
                tile, wordmark + Pro pill, tagline, and the day's quote. */}
            <View style={styles.brandBlock}>
              <View style={styles.logoTile}>
                <LogoMark size={38} color="#ffffff" />
              </View>
              <View style={styles.brandRow}>
                <Text style={styles.brand}>PRATIQ</Text>
                <View style={styles.proPill}>
                  <Text style={styles.proPillText}>PRO EXPENSE TRACKER</Text>
                </View>
              </View>
              <Text style={styles.tagline}>Track every rupee, save more</Text>
              <Text style={styles.quote}>
                “{quote.text}” <Text style={styles.quoteAuthor}>— {quote.author}</Text>
              </Text>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
              ]}
            >
              <Text style={[styles.title, { color: palette.textPrimary }]}>
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
                {mode === 'signin'
                  ? 'Sign in to continue to your dashboard'
                  : 'Start tracking your spending in minutes'}
              </Text>

              <Text style={[styles.label, { color: palette.textSecondary }]}>EMAIL ADDRESS</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                inputMode="email"
                returnKeyType="next"
                placeholder="you@example.com"
                placeholderTextColor={palette.textTertiary}
                style={[
                  styles.input,
                  { color: palette.textPrimary, backgroundColor: palette.pastelBlue, borderColor: palette.cardBorder },
                ]}
              />

              <Text style={[styles.label, { color: palette.textSecondary }]}>PASSWORD</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                returnKeyType="go"
                onSubmitEditing={submit}
                placeholder="••••••••"
                placeholderTextColor={palette.textTertiary}
                style={[
                  styles.input,
                  { color: palette.textPrimary, backgroundColor: palette.pastelBlue, borderColor: palette.cardBorder },
                ]}
              />

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: palette.dangerLight }]}>
                  <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={submit}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.submitWrap, pressed && styles.pressed]}
              >
                <LinearGradient
                  colors={palette.primaryGradient as unknown as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.submit, busy && { opacity: 0.7 }]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {mode === 'signin' ? (
                <Pressable onPress={forgotPassword} hitSlop={8} style={styles.linkRow}>
                  <Text style={[styles.link, { color: palette.primary }]}>Forgot password?</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                hitSlop={8}
                style={styles.linkRow}
              >
                <Text style={[styles.muted, { color: palette.textSecondary }]}>
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={{ color: palette.primary, fontWeight: '700' }}>
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </Text>
                </Text>
              </Pressable>

              <View style={styles.footnoteRow}>
                <LockIcon size={12} color={palette.textTertiary} />
                <Text style={[styles.footnote, { color: palette.textTertiary }]}>
                  Your data is encrypted in transit and at rest
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  brandBlock: { alignItems: 'center', marginBottom: spacing.xxl },
  logoTile: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brand: { fontSize: 26, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  proPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.5)',
  },
  proPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.55, color: '#ffffff' },
  tagline: { fontSize: fontSize.md, color: 'rgba(255,255,255,0.85)', marginTop: spacing.sm },
  quote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  quoteAuthor: { fontStyle: 'normal', fontWeight: '600' },
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: fontSize.md, marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.6, marginBottom: spacing.xs },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.lg,
    marginBottom: spacing.lg,
  },
  errorBox: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { fontSize: fontSize.md, fontWeight: '600' },
  submitWrap: { borderRadius: radius.md, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
  submit: { height: 54, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: spacing.lg },
  link: { fontSize: fontSize.md, fontWeight: '600' },
  muted: { fontSize: fontSize.md },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  footnote: { fontSize: fontSize.xs },
});
