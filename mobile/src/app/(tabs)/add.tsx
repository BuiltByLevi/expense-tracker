import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { useExpenses } from '@/context/ExpensesContext';
import { useIncome } from '@/context/IncomeContext';
import { useTheme } from '@/context/ThemeContext';
import { RupeeIcon } from '@/components/FinanceIcons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type IncomeCategory } from '@shared/types';
import { parseLocalDateInput } from '@shared/dateInput';
import { fontSize, radius, spacing } from '@/theme';

type Kind = 'expense' | 'income';

export default function AddTransactionScreen() {
  const { palette } = useTheme();
  const { addExpense } = useExpenses();
  const { addIncome } = useIncome();

  const [kind, setKind] = useState<Kind>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [dateText, setDateText] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const categories: readonly string[] =
    kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const switchKind = (next: Kind) => {
    setKind(next);
    setCategory(next === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
    setError(null);
    setSuccess(null);
  };

  const submit = async () => {
    setError(null);
    setSuccess(null);

    const parsedAmount = Number(amount);
    if (!amount.trim() || Number.isNaN(parsedAmount)) {
      return setError('Enter a valid amount.');
    }
    if (parsedAmount <= 0) {
      return setError('Amount must be greater than zero.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      return setError('Enter the date as YYYY-MM-DD.');
    }
    // parseLocalDateInput builds the Date from y/m/d parts rather than via
    // `new Date('yyyy-MM-dd')`, which would be parsed as UTC midnight and roll
    // back a day in any timezone behind UTC. Shared with the web app.
    const date = parseLocalDateInput(dateText);
    if (Number.isNaN(date.getTime())) {
      return setError('That date is not valid.');
    }

    setBusy(true);
    try {
      if (kind === 'expense') {
        await addExpense({
          amount: parsedAmount,
          category,
          description: description.trim(),
          date,
          source: 'manual',
        });
      } else {
        await addIncome({
          amount: parsedAmount,
          category: category as IncomeCategory,
          description: description.trim(),
          date,
          source: 'manual',
        });
      }
      setSuccess(`${kind === 'expense' ? 'Expense' : 'Income'} added.`);
      setAmount('');
      setDescription('');
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.screenBg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <RupeeIcon size={18} color={palette.primary} />
            <Text style={[styles.title, { color: palette.textPrimary }]}>Quick Transaction</Text>
          </View>

          <Card style={styles.card}>
            {/* Expense / Income toggle */}
            <View style={[styles.toggle, { backgroundColor: palette.screenBg, borderColor: palette.cardBorder }]}>
              {(['expense', 'income'] as Kind[]).map((k) => {
                const active = kind === k;
                return (
                  <Pressable key={k} onPress={() => switchKind(k)} style={styles.toggleBtn}>
                    {active ? (
                      <LinearGradient
                        colors={palette.primaryGradient as unknown as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.toggleFill}
                      >
                        <Text style={styles.toggleTextActive}>
                          {k === 'expense' ? 'Expense' : 'Income'}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.toggleFill}>
                        <Text style={[styles.toggleText, { color: palette.textSecondary }]}>
                          {k === 'expense' ? 'Expense' : 'Income'}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: palette.textSecondary }]}>AMOUNT</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0.00"
              placeholderTextColor={palette.textTertiary}
              style={[styles.input, { color: palette.textPrimary, borderColor: palette.cardBorder, backgroundColor: palette.screenBg }]}
            />

            <Text style={[styles.label, { color: palette.textSecondary }]}>CATEGORY</Text>
            <View style={styles.catWrap}>
              {categories.map((c) => {
                const active = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? palette.primary : palette.screenBg,
                        borderColor: active ? palette.primary : palette.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? '#fff' : palette.textSecondary,
                        fontSize: fontSize.sm,
                        fontWeight: '600',
                      }}
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: palette.textSecondary }]}>DATE</Text>
            <TextInput
              value={dateText}
              onChangeText={setDateText}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.textTertiary}
              autoCapitalize="none"
              style={[styles.input, { color: palette.textPrimary, borderColor: palette.cardBorder, backgroundColor: palette.screenBg }]}
            />

            <Text style={[styles.label, { color: palette.textSecondary }]}>DESCRIPTION</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What was it for?"
              placeholderTextColor={palette.textTertiary}
              style={[styles.input, { color: palette.textPrimary, borderColor: palette.cardBorder, backgroundColor: palette.screenBg }]}
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            {error ? (
              <View style={[styles.banner, { backgroundColor: palette.dangerLight }]}>
                <Text style={{ color: palette.danger, fontWeight: '600' }}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={[styles.banner, { backgroundColor: palette.successLight }]}>
                <Text style={{ color: palette.success, fontWeight: '600' }}>{success}</Text>
              </View>
            ) : null}

            <Pressable onPress={submit} disabled={busy} style={styles.submitWrap}>
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
                    + Add {kind === 'expense' ? 'Expense' : 'Income'}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  card: { gap: spacing.xs },
  toggle: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    marginBottom: spacing.md,
  },
  toggleBtn: { flex: 1 },
  toggleFill: { height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: fontSize.md, fontWeight: '600' },
  toggleTextActive: { fontSize: fontSize.md, fontWeight: '700', color: '#fff' },
  label: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.6, marginTop: spacing.sm },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.lg,
    marginTop: spacing.xs,
  },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  banner: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  submitWrap: { borderRadius: radius.md, overflow: 'hidden', marginTop: spacing.lg },
  submit: { height: 52, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
});
