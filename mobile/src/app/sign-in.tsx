import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Btn } from '@/components/controls';
import { CardChip, ContactlessMark, LockIcon, LogoMark } from '@/components/FinanceIcons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { FINANCIAL_QUOTES, getDailyQuote } from '@shared/quotes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One of AuthWeb's fixed-palette form fields (the auth card is always white). */
const AuthField: React.FC<TextInputProps & { label: string; error?: string }> = ({ label, error, ...rest }) => {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        {...rest}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { borderColor: error ? '#ef4444' : focused ? palette.primary : '#e2e8f0' }]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

/**
 * Port of Auth/AuthWeb — the desktop sign-in: brand-gradient ground with two
 * soft orbs, and one white card split into a branding panel (card mockup,
 * logo, PRATIQ wordmark, tagline, quote) and the form. On a phone it uses
 * the web's own narrow-window layout: the panels stack and the feature list
 * is hidden.
 */
export default function SignInScreen() {
  const { palette } = useTheme();
  const toast = useToast();
  const { login, signup, resetPassword } = useAuth();
  const [quote] = useState(() => getDailyQuote(FINANCIAL_QUOTES));

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!email || !EMAIL_RE.test(email.trim())) next.email = 'Please enter a valid email address';
    if (!password || password.length < 6) next.password = 'Password must be at least 6 characters';
    if (!isLogin && password !== confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
        toast.success('Welcome back!');
      } else {
        await signup(email.trim(), password);
        toast.success('Account created successfully!');
      }
    } catch (err) {
      const e = err as { code?: string; message?: string };
      toast.error(
        e.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : e.code === 'auth/email-already-in-use'
            ? 'An account with this email already exists'
            : e.code === 'auth/network-request-failed'
              ? 'No internet connection. Check your network and try again.'
              : (e.message ?? 'An unexpected error occurred')
      );
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: 'Enter your email above, then tap Forgot password' });
      return;
    }
    try {
      await resetPassword(email.trim());
      toast.success(`Password reset link sent to ${email.trim()}`, { duration: 4000 });
    } catch {
      toast.error('Could not send the reset email. Please try again.');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setPassword('');
    setConfirm('');
  };

  return (
    <LinearGradient
      colors={[palette.primary, palette.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              {/* Branding panel */}
              <LinearGradient
                colors={palette.primaryGradient as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.brand}
              >
                <View style={styles.mockCard} pointerEvents="none">
                  <View style={styles.mockTop}>
                    <CardChip width={26} />
                    <ContactlessMark size={16} />
                  </View>
                  <Text style={styles.mockNumber}>•••• •••• 2026</Text>
                </View>

                <View style={styles.logoTile}>
                  <LogoMark size={38} color="#ffffff" />
                </View>
                <View style={styles.brandRow}>
                  <Text style={styles.brandName}>PRATIQ</Text>
                  <View style={[styles.proPill, { backgroundColor: `${palette.success}40`, borderColor: `${palette.success}80` }]}>
                    <Text style={styles.proPillText}>PRO EXPENSE TRACKER</Text>
                  </View>
                </View>
                <Text style={styles.headline}>Track Every Rupee</Text>
                <Text style={styles.tagline}>
                  Take control of your finances with smart expense tracking, detailed analytics, and beautiful
                  insights.
                </Text>
                <View style={styles.quoteBlock}>
                  <Text style={styles.quote}>“{quote.text}”</Text>
                  <Text style={styles.quoteAuthor}>— {quote.author}</Text>
                </View>
              </LinearGradient>

              {/* Form panel */}
              <View style={styles.form}>
                <Text style={styles.title}>{isLogin ? 'Welcome back' : 'Create account'}</Text>
                <Text style={styles.subtitle}>
                  {isLogin ? 'Sign in to continue to your dashboard' : 'Start tracking your expenses today'}
                </Text>

                <AuthField
                  label="Email Address"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  error={errors.email}
                />
                <AuthField
                  label="Password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                  secureTextEntry
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  returnKeyType={isLogin ? 'go' : 'next'}
                  onSubmitEditing={isLogin ? submit : undefined}
                  error={errors.password}
                />
                {!isLogin ? (
                  <AuthField
                    label="Confirm Password"
                    value={confirm}
                    onChangeText={(t) => {
                      setConfirm(t);
                      if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
                    }}
                    placeholder="Re-enter your password"
                    secureTextEntry
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    error={errors.confirm}
                  />
                ) : null}

                <Btn
                  size="lg"
                  label={loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                  onPress={submit}
                  disabled={loading}
                  style={styles.submit}
                  textStyle={styles.submitText}
                />

                {isLogin ? (
                  <Pressable onPress={forgotPassword} hitSlop={8} style={styles.forgot}>
                    <Text style={[styles.forgotText, { color: palette.primary }]}>Forgot password?</Text>
                  </Pressable>
                ) : null}

                <Text style={styles.switchText}>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={[styles.switchLink, { color: palette.primary }]} onPress={toggleMode}>
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </Text>
                </Text>

                <View style={styles.footer}>
                  <LockIcon size={13} color="#94a3b8" />
                  <Text style={styles.footerText}>Your data is encrypted in transit and at rest</Text>
                </View>
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
  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: { width: 500, height: 500, top: -100, left: -100, backgroundColor: 'rgba(255,255,255,0.1)' },
  orbBottom: { width: 400, height: 400, bottom: -100, right: -100, backgroundColor: 'rgba(255,255,255,0.08)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 24 },
    elevation: 16,
  },
  // .auth-split > div:first-child at <=1000px: padding 32px 36px.
  brand: { paddingVertical: 32, paddingHorizontal: 28 },
  mockCard: {
    position: 'absolute',
    top: 22,
    right: 22,
    width: 120,
    height: 74,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    opacity: 0.85,
    transform: [{ rotate: '6deg' }],
    justifyContent: 'space-between',
  },
  mockTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mockNumber: { fontSize: 9, letterSpacing: 1.6, color: 'rgba(255,255,255,0.85)' },
  logoTile: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  brandRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 },
  brandName: { fontSize: 32, fontWeight: '800', color: '#ffffff', letterSpacing: 0.6 },
  proPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  proPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: '#ffffff' },
  headline: { fontSize: 22, fontWeight: '700', color: '#ffffff', opacity: 0.95, marginBottom: 16 },
  tagline: { fontSize: 16, color: '#ffffff', opacity: 0.9, lineHeight: 25 },
  quoteBlock: { marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  quote: { fontSize: 14, fontStyle: 'italic', lineHeight: 22, color: '#ffffff', opacity: 0.92 },
  quoteAuthor: { fontSize: 12, fontWeight: '600', color: '#ffffff', opacity: 0.7, marginTop: 8 },
  form: { paddingVertical: 40, paddingHorizontal: 28 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 32 },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 8, letterSpacing: 0.6 },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  error: { fontSize: 12, color: '#ef4444', marginTop: 6 },
  submit: { marginTop: 4 },
  submitText: { fontSize: 15, fontWeight: '700' },
  forgot: { alignItems: 'center', marginTop: 16 },
  forgotText: { fontSize: 14, fontWeight: '600' },
  switchText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 24 },
  switchLink: { fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
});
