import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { Btn, FieldError, Input, Label, Select, TabGroup } from '@/components/controls';
import { DateField } from '@/components/DateField';
import { useExpenses } from '@/context/ExpensesContext';
import { useIncome } from '@/context/IncomeContext';
import { useToast } from '@/context/ToastContext';
import { parseLocalDateInput } from '@shared/dateInput';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type ExpenseCategory,
  type IncomeCategory,
} from '@shared/types';

type Kind = 'expense' | 'income';

const oneYearAhead = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
};
const KIND_TABS = [
  ['expense', 'Expense'],
  ['income', 'Income'],
] as const;

/**
 * Port of ExpenseForm/ExpenseForm — the desktop "Quick Transaction" form:
 * Expense/Income tabs, a 2-column grid of Amount / Category / Date /
 * Description, and the full-width "+ Add" button. Validation rules and
 * messages are copied verbatim from the web form.
 */
export const ExpenseForm: React.FC = () => {
  const { addExpense } = useExpenses();
  const { addIncome } = useIncome();
  const toast = useToast();

  const [kind, setKind] = useState<Kind>('expense');
  const [amount, setAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>(INCOME_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  // format(), not toISOString(), so the default is today in local time.
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; description?: string; date?: string }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    const num = parseFloat(amount);
    if (!amount || isNaN(num)) next.amount = 'Enter a valid amount';
    else if (num <= 0) next.amount = 'Amount must be greater than 0';
    else if (num > 100000000) next.amount = 'Amount seems too large (max ₹10 crore)';

    const trimmed = description.trim();
    if (trimmed.length > 0 && trimmed.length < 2) next.description = 'Description must be at least 2 characters';
    else if (trimmed.length > 100) next.description = 'Description must be under 100 characters';

    if (!date) next.date = 'Please select a date';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parseLocalDateInput(date).getTime())) {
      next.date = 'Enter the date as YYYY-MM-DD';
    } else {
      const limit = new Date();
      limit.setFullYear(limit.getFullYear() + 1);
      if (parseLocalDateInput(date) > limit) next.date = 'Date cannot be more than 1 year in the future';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast.error('Please fix the errors');
      return;
    }
    setSubmitting(true);
    try {
      const base = {
        amount: parseFloat(amount),
        description: description.trim() || 'No description',
        date: parseLocalDateInput(date),
        source: 'manual' as const,
      };
      if (kind === 'income') {
        await addIncome({ ...base, category: incomeCategory });
        toast.success('Income added!');
      } else {
        await addExpense({ ...base, category: expenseCategory });
        toast.success('Expense added!');
      }
      setAmount('');
      setDescription('');
      setErrors({});
    } catch {
      toast.error(kind === 'income' ? 'Failed to add income' : 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const isIncome = kind === 'income';

  return (
    <View>
      <TabGroup options={KIND_TABS} value={kind} onChange={setKind} style={styles.tabs} />

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Label>Amount</Label>
          <Input
            prefix="₹"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              if (errors.amount) setErrors((p) => ({ ...p, amount: undefined }));
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={!!errors.amount}
          />
          <FieldError message={errors.amount} />
        </View>

        <View style={styles.cell}>
          <Label>Category</Label>
          {isIncome ? (
            <Select value={incomeCategory} options={INCOME_CATEGORIES} onChange={setIncomeCategory} title="Category" />
          ) : (
            <Select value={expenseCategory} options={EXPENSE_CATEGORIES} onChange={setExpenseCategory} title="Category" />
          )}
        </View>

        <View style={styles.cell}>
          <Label>Date</Label>
          <DateField
            value={date}
            onChange={(v) => {
              setDate(v);
              if (errors.date) setErrors((p) => ({ ...p, date: undefined }));
            }}
            // Same ceiling the validator enforces: at most 1 year ahead.
            maximumDate={oneYearAhead()}
            error={!!errors.date}
          />
          <FieldError message={errors.date} />
        </View>

        <View style={styles.cell}>
          <Label>Description</Label>
          <Input
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
            }}
            placeholder="What was it for?"
            maxLength={100}
            error={!!errors.description}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <FieldError message={errors.description} />
        </View>
      </View>

      <Btn
        size="lg"
        label={submitting ? 'Adding...' : isIncome ? '+ Add Income' : '+ Add Expense'}
        onPress={submit}
        disabled={submitting}
        style={styles.submit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabs: { marginBottom: 16 },
  // .form-grid: two equal columns, 14px gap.
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7, rowGap: 14 },
  cell: { width: '50%', paddingHorizontal: 7 },
  submit: { marginTop: 20 },
});
