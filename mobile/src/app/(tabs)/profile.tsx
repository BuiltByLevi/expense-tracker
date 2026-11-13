import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useTheme } from '@/context/ThemeContext';
import { UserIcon } from '@/components/FinanceIcons';
import type { ColorMode, ColorTheme } from '@/theme';
import { fontSize, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

export default function ProfileScreen() {
  const { palette, colorTheme, setColorTheme, modePreference, setModePreference } = useTheme();
  const { user, logout, resetPassword } = useAuth();
  const d = useDashboardData();
  const [busy, setBusy] = useState(false);

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to view your data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await logout();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const sendReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      Alert.alert('Check your email', `A password reset link was sent to ${user.email}.`);
    } catch {
      Alert.alert('Could not send', 'Please check your connection and try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.screenBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <UserIcon size={18} color={palette.primary} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>Profile</Text>
        </View>

        {/* Account — real values only, never placeholder identity */}
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
              <Text style={styles.avatarText}>
                {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.flexShrink}>
              <Text style={[styles.name, { color: palette.textPrimary }]} numberOfLines={1}>
                {user?.displayName || user?.email?.split('@')[0] || 'Signed in'}
              </Text>
              <Text style={[styles.email, { color: palette.textSecondary }]} numberOfLines={1}>
                {user?.email ?? '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Lifetime stats */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Your Numbers</Text>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Total spending</Text>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>
              {formatCurrency(d.totalAllTime)}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Transactions</Text>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>
              {d.expenses.length + d.income.length}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Net balance</Text>
            <Text style={[styles.statValue, { color: palette.success }]}>
              {formatCurrency(d.financeTotals.cumulativeNetCashFlow)}
            </Text>
          </View>
        </Card>

        {/* Appearance */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Appearance</Text>

          <Text style={[styles.subLabel, { color: palette.textSecondary }]}>COLOR THEME</Text>
          <View style={styles.optionRow}>
            {(
              [
                ['midnight', 'Midnight'],
                ['original', 'Original'],
              ] as [ColorTheme, string][]
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setColorTheme(value)}
                style={[
                  styles.option,
                  {
                    backgroundColor: colorTheme === value ? palette.primary : palette.screenBg,
                    borderColor: colorTheme === value ? palette.primary : palette.cardBorder,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colorTheme === value ? '#fff' : palette.textSecondary,
                    fontWeight: '600',
                    fontSize: fontSize.sm,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.subLabel, { color: palette.textSecondary }]}>MODE</Text>
          <View style={styles.optionRow}>
            {(
              [
                ['system', 'System'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ] as ['system' | ColorMode, string][]
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setModePreference(value)}
                style={[
                  styles.option,
                  {
                    backgroundColor: modePreference === value ? palette.primary : palette.screenBg,
                    borderColor: modePreference === value ? palette.primary : palette.cardBorder,
                  },
                ]}
              >
                <Text
                  style={{
                    color: modePreference === value ? '#fff' : palette.textSecondary,
                    fontWeight: '600',
                    fontSize: fontSize.sm,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Account actions */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Account</Text>
          <Pressable onPress={sendReset} style={[styles.action, { borderColor: palette.cardBorder }]}>
            <Text style={{ color: palette.primary, fontWeight: '600', fontSize: fontSize.md }}>
              Send password reset email
            </Text>
          </Pressable>
          <Pressable
            onPress={confirmSignOut}
            disabled={busy}
            style={[styles.action, { borderColor: palette.danger, opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={{ color: palette.danger, fontWeight: '700', fontSize: fontSize.md }}>
              Sign out
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  card: { gap: spacing.sm },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: fontSize.xl, fontWeight: '700' },
  name: { fontSize: fontSize.lg, fontWeight: '700' },
  email: { fontSize: fontSize.sm, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.xs },
  subLabel: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.6, marginTop: spacing.sm },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  statLabel: { fontSize: fontSize.md },
  statValue: { fontSize: fontSize.md, fontWeight: '700' },
  optionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  action: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
});
