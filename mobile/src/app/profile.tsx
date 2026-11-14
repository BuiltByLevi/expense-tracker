import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ConfirmDialog } from '@/components/AppModal';
import { Card, GlassPage, PageHeader } from '@/components/Card';
import { Btn, Input, Label } from '@/components/controls';
import {
  CalendarIcon,
  ChartLineIcon,
  CheckIcon,
  GearIcon,
  LockIcon,
  MoonIcon,
  SavingsIcon,
  ShieldCheckIcon,
  SunIcon,
  UserIcon,
  WalletIcon,
} from '@/components/FinanceIcons';
import { useAuth } from '@/context/AuthContext';
import { useEarnings } from '@/context/EarningsContext';
import { useExpenses } from '@/context/ExpensesContext';
import { useIncome } from '@/context/IncomeContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { makeCashFlowLookup } from '@shared/cashFlowLookup';
import { computeFinanceTotals } from '@shared/finance';
import type { ColorTheme } from '@/theme';

const THEME_OPTIONS: { id: ColorTheme; label: string; swatch: [string, string] }[] = [
  { id: 'midnight', label: 'Midnight Teal', swatch: ['#1e3a8a', '#14b8a6'] },
  { id: 'original', label: 'Original Indigo', swatch: ['#6366f1', '#8b5cf6'] },
];

/** Port of Dashboard/ProfilePageWeb + hooks/useProfileLogic. */
export default function ProfileScreen() {
  const { palette, mode, colorTheme, setColorTheme, setModePreference } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user, logout, resetPassword, updateUserProfile } = useAuth();
  const { expenses } = useExpenses();
  const { getIncomeForMonth } = useIncome();
  const { earnings: defaultEarnings, getEarningsForMonth } = useEarnings();

  const [displayName, setDisplayName] = useState(user?.displayName || user?.email?.split('@')[0] || 'User');
  const [savingName, setSavingName] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const stats = useMemo(() => {
    const months = new Set(expenses.map((e) => `${e.date.getFullYear()}-${e.date.getMonth()}`));
    return {
      totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      transactionCount: expenses.length,
      monthsTracked: months.size,
      memberSince: user?.metadata?.creationTime
        ? format(new Date(user.metadata.creationTime), 'MMMM yyyy')
        : 'Recently',
      lastSignIn: user?.metadata?.lastSignInTime
        ? format(new Date(user.metadata.lastSignInTime), 'dd MMM yyyy, hh:mm a')
        : 'Just now',
    };
  }, [expenses, user]);

  // Same lookup + walk as the dashboard, so this can't disagree with it.
  const lookup = useMemo(() => makeCashFlowLookup(getIncomeForMonth, getEarningsForMonth), [getIncomeForMonth, getEarningsForMonth]);
  const totalSavings = useMemo(() => {
    const t = new Date();
    return computeFinanceTotals(expenses, defaultEarnings, lookup, t.getFullYear(), t.getMonth()).cumulativeNetCashFlow;
  }, [expenses, defaultEarnings, lookup]);

  const initials = useMemo(() => {
    const name = displayName || user?.email?.split('@')[0] || 'U';
    const parts = name.split(/[\s._-]/);
    return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.substring(0, 2)).toUpperCase();
  }, [displayName, user]);

  const saveName = async () => {
    if (!displayName.trim()) return toast.error('Display name cannot be empty');
    setSavingName(true);
    try {
      await updateUserProfile({ displayName });
      toast.success('Display name updated');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const sendReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      toast.success('Password reset email sent to ' + user.email, { duration: 4000 });
    } catch {
      toast.error('Could not send the reset email. Please try again.');
    }
  };

  const statTile = (icon: React.ReactNode, label: string, value: string, color: string) => (
    <Card style={styles.statTile}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );

  const row = (title: string, sub: string, right: React.ReactNode, last = false) => (
    <View style={[styles.prefRow, !last && { borderBottomWidth: 1, borderBottomColor: `${palette.textTertiary}33` }]}>
      <View style={styles.prefText}>
        <Text style={[styles.prefTitle, { color: palette.textPrimary }]}>{title}</Text>
        <Text style={[styles.prefSub, { color: palette.textSecondary }]}>{sub}</Text>
      </View>
      {right}
    </View>
  );

  const nameUnchanged = displayName === (user?.displayName || user?.email?.split('@')[0]);

  return (
    <GlassPage>
      <PageHeader title="My Profile" subtitle="Manage your account and preferences" onBack={() => router.back()} />

      {/* Hero */}
      <Card style={[styles.hero, { borderColor: `${palette.primary}33`, backgroundColor: `${palette.primary}14` }]}>
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={palette.primaryGradient as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.avatar, { shadowColor: palette.primary }]}
          >
            <Text style={styles.initials}>{initials}</Text>
          </LinearGradient>
        )}
        <View style={styles.heroText}>
          <Text style={[styles.heroName, { color: palette.textPrimary }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.heroEmail, { color: palette.textSecondary }]} numberOfLines={1}>
            {user?.email}
          </Text>
          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: `${palette.success}1A` }]}>
              <ShieldCheckIcon size={11} color={palette.success} />
              <Text style={[styles.chipText, { color: palette.success }]}>Verified Account</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: `${palette.primary}1A` }]}>
              <CalendarIcon size={11} color={palette.primary} />
              <Text style={[styles.chipText, { color: palette.primary }]}>Member since {stats.memberSince}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Stats — auto-fit grid at minmax(180px) falls to 2 columns on a phone */}
      <View style={styles.statRow}>
        {statTile(<WalletIcon size={26} color={palette.primary} />, 'TOTAL TRACKED', `₹${stats.totalExpenses.toLocaleString('en-IN')}`, palette.primary)}
        {statTile(<ChartLineIcon size={26} color={palette.primary} />, 'TRANSACTIONS', String(stats.transactionCount), palette.textPrimary)}
      </View>
      <View style={styles.statRow}>
        {statTile(<CalendarIcon size={26} color={palette.primary} />, 'MONTHS TRACKED', String(stats.monthsTracked), palette.textPrimary)}
        {statTile(<SavingsIcon size={26} color={palette.success} />, 'TOTAL SAVINGS', `₹${totalSavings.toLocaleString('en-IN')}`, palette.success)}
      </View>

      {/* Personal Information */}
      <Card style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <UserIcon size={16} color={palette.primary} />
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Personal Information</Text>
        </View>
        <View style={styles.field}>
          <Label>Display Name</Label>
          <View style={styles.nameRow}>
            <Input
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              containerStyle={styles.flex}
            />
            <Btn label={savingName ? 'Saving...' : 'Save'} onPress={saveName} disabled={savingName || nameUnchanged} />
          </View>
        </View>
        <View>
          <Label>Email Address</Label>
          <Input value={user?.email || ''} editable={false} />
          <Text style={[styles.hint, { color: palette.textTertiary }]}>
            Email cannot be changed. Contact support if needed.
          </Text>
        </View>
      </Card>

      {/* Preferences */}
      <Card style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <GearIcon size={16} color={palette.primary} />
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Preferences</Text>
        </View>
        {row(
          'Theme',
          colorTheme === 'original' ? 'Original Indigo & Violet' : 'Midnight Blue & Teal',
          <View style={styles.themeBtns}>
            {THEME_OPTIONS.map((opt) => {
              const on = colorTheme === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setColorTheme(opt.id)}
                  style={[
                    styles.themeBtn,
                    { backgroundColor: palette.glassBg, borderColor: on ? palette.primary : 'transparent' },
                  ]}
                >
                  <LinearGradient colors={opt.swatch} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch} />
                  <Text style={[styles.themeText, { color: palette.textPrimary, fontWeight: on ? '700' : '500' }]}>
                    {opt.label}
                  </Text>
                  {on ? <CheckIcon size={11} color={palette.primary} strokeWidth={2.5} /> : null}
                </Pressable>
              );
            })}
          </View>
        )}
        {row(
          'Appearance',
          `Currently using ${mode} mode`,
          <Btn
            variant="ghost"
            size="sm"
            label={mode === 'light' ? 'Switch to Dark' : 'Switch to Light'}
            icon={mode === 'light' ? <MoonIcon size={13} color={palette.textPrimary} /> : <SunIcon size={13} color={palette.textPrimary} />}
            onPress={() => setModePreference(mode === 'light' ? 'dark' : 'light')}
          />
        )}
        {row(
          'Default Monthly Earnings',
          `₹${defaultEarnings.toLocaleString('en-IN')} (used for new months)`,
          <Pressable onPress={() => router.push('/earnings')}>
            <Text style={[styles.link, { color: palette.textTertiary }]}>Change in Earnings History →</Text>
          </Pressable>
        )}
        {row('Last Sign In', stats.lastSignIn, null, true)}
      </Card>

      {/* Security */}
      <Card style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <LockIcon size={16} color={palette.primary} />
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Security</Text>
        </View>
        {row(
          'Change Password',
          'Send a password reset link to your email',
          <Btn variant="ghost" size="sm" label="Send Reset Link" onPress={sendReset} />
        )}
        {row(
          'Sign Out',
          'Sign out from your current session',
          <Btn variant="ghost" size="sm" label="Sign Out" onPress={() => setConfirmLogout(true)} />,
          true
        )}
      </Card>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        message="This will sign you out from all devices. Continue?"
        confirmLabel="Sign Out"
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </GlassPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 24, flexWrap: 'wrap' },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  initials: { color: '#ffffff', fontSize: 36, fontWeight: '700' },
  heroText: { flex: 1, minWidth: 180 },
  heroName: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  heroEmail: { fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  chipText: { fontSize: 11, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 16 },
  statTile: { flex: 1, padding: 20, alignItems: 'center', minWidth: 0 },
  statIcon: { marginBottom: 10 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.55 },
  statValue: { fontSize: 22, fontWeight: '700', marginTop: 6 },
  section: { padding: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  field: { marginBottom: 16 },
  nameRow: { flexDirection: 'row', gap: 8 },
  hint: { fontSize: 11, marginTop: 6 },
  prefRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  prefText: { flexShrink: 1, minWidth: 140 },
  prefTitle: { fontSize: 14, fontWeight: '600' },
  prefSub: { fontSize: 12, marginTop: 2 },
  themeBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  themeText: { fontSize: 13 },
  link: { fontSize: 12 },
});
