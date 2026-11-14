import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { AppModal, ModalHeader } from '@/components/AppModal';
import { Btn, Input, Label, Select } from '@/components/controls';
import { DateField } from '@/components/DateField';
import { useExpenses } from '@/context/ExpensesContext';
import { useToast } from '@/context/ToastContext';
import { parseLocalDateInput } from '@shared/dateInput';
import { EXPENSE_CATEGORIES, type Expense } from '@shared/types';

/** Port of ExpenseList/EditExpenseModal. */
export const EditExpenseModal: React.FC<{ expense: Expense | null; onClose: () => void }> = ({ expense, onClose }) => {
  if (!expense) return null;
  return <EditBody key={expense.id} expense={expense} onClose={onClose} />;
};

const EditBody: React.FC<{ expense: Expense; onClose: () => void }> = ({ expense, onClose }) => {
  const { updateExpense } = useExpenses();
  const toast = useToast();
  const [amount, setAmount] = useState(expense.amount.toString());
  const [category, setCategory] = useState<string>(expense.category);
  const [description, setDescription] = useState(expense.description);
  // format() reads local date parts — see the web modal for why not toISOString().
  const [date, setDate] = useState(format(new Date(expense.date), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parseLocalDateInput(date).getTime())) {
      toast.error('Enter the date as YYYY-MM-DD');
      return;
    }
    setSubmitting(true);
    try {
      await updateExpense(expense.id, {
        amount: parseFloat(amount),
        category,
        description: description || 'No description',
        date: parseLocalDateInput(date),
      });
      toast.success('Expense updated!');
      onClose();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal visible onClose={onClose}>
      <ModalHeader title="Edit Expense" subtitle="Update the expense details" onClose={onClose} />
      <View style={styles.fields}>
        <View>
          <Label>Amount (₹)</Label>
          <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        </View>
        <View>
          <Label>Category</Label>
          <Select value={category} options={EXPENSE_CATEGORIES} onChange={setCategory} title="Category" />
        </View>
        <View>
          <Label>Date</Label>
          <DateField value={date} onChange={setDate} />
        </View>
        <View>
          <Label>Description</Label>
          <Input value={description} onChangeText={setDescription} />
        </View>
      </View>
      <View style={styles.actions}>
        <Btn variant="ghost" size="lg" label="Cancel" onPress={onClose} style={styles.flex} />
        <Btn
          size="lg"
          label={submitting ? 'Updating...' : 'Update'}
          onPress={submit}
          disabled={submitting}
          style={styles.flex}
        />
      </View>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fields: { gap: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
