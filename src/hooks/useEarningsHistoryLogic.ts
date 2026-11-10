import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useEarnings } from '../context/EarningsContext';
import { useIncome } from '../context/IncomeContext';
import { deriveMonthlyEarnings, type DerivedEarnings } from '../utils/earningsDerivation';

/**
 * Owns all EarningsHistoryPage business logic (36-month list, inline edit,
 * bulk select/save/status) so the Web and Mobile pages share one source of
 * truth and only differ in layout.
 */
export function useEarningsHistoryLogic() {
  const { getEarningsForMonth, setEarningsForMonth, earnings: defaultEarnings } = useEarnings();
  const { getIncomeForMonth } = useIncome();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Months whose earnings come from an imported statement (see
  // EarningsModal/useDashboardData) can't be manually edited here — editing
  // the old single-number record would silently have no visible effect,
  // which is exactly the "bulk update doesn't work" confusion this avoids.
  const getImportDerived = useCallback(
    (year: number, month: number): DerivedEarnings | null => {
      const { entries } = getIncomeForMonth(year, month);
      return deriveMonthlyEarnings(entries);
    },
    [getIncomeForMonth]
  );

  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Last 36 months (3 years), newest first.
  const months = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 35; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return list.reverse();
  }, []);

  // Quick year filter so the 36-month list isn't one long scroll — 'All' keeps
  // the full history, any other value narrows it to just that year.
  const availableYears = useMemo(
    () => Array.from(new Set(months.map((m) => m.year))).sort((a, b) => b - a),
    [months]
  );
  const [yearFilter, setYearFilter] = useState<number | 'All'>('All');
  const visibleMonths = useMemo(
    () => (yearFilter === 'All' ? months : months.filter((m) => m.year === yearFilter)),
    [months, yearFilter]
  );

  const handleEditClick = (year: number, month: number, currentAmount: number) => {
    if (getImportDerived(year, month)) return; // not editable — see getImportDerived
    setEditingKey(`${year}-${month}`);
    setEditValue(currentAmount.toString());
  };

  const handleSave = async (year: number, month: number) => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await setEarningsForMonth(year, month, num, 'confirmed');
      setEditingKey(null);
    } catch {
      // error toast handled in context
    }
  };

  // Only months without imported income can be selected for manual bulk edits.
  const editableMonths = useMemo(
    () => visibleMonths.filter((m) => !getImportDerived(m.year, m.month)),
    [visibleMonths, getImportDerived]
  );

  const toggleSelection = (key: string) => {
    const [yearStr, monthStr] = key.split('-');
    if (getImportDerived(parseInt(yearStr), parseInt(monthStr))) return;
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMonths.size === editableMonths.length) {
      setSelectedMonths(new Set());
    } else {
      setSelectedMonths(new Set(editableMonths.map((m) => `${m.year}-${m.month}`)));
    }
  };

  const handleBulkSaveAmount = async () => {
    const num = parseFloat(bulkAmount);
    if (isNaN(num) || num < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (selectedMonths.size === 0) {
      toast.error('Select at least one month');
      return;
    }

    setBulkSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const key of Array.from(selectedMonths)) {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr);
      const monthNum = parseInt(monthStr);
      if (getImportDerived(year, monthNum)) continue; // defensive — shouldn't be selectable at all
      try {
        await setEarningsForMonth(year, monthNum, num, 'confirmed');
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkSaving(false);
    setSelectedMonths(new Set());
    setBulkAmount('');

    if (failCount === 0) {
      toast.success(`${successCount} months updated to ₹${num.toLocaleString('en-IN')}`);
    } else {
      toast.error(`Updated ${successCount}, failed ${failCount}`);
    }
  };

  const handleBulkStatus = async (newStatus: 'confirmed' | 'estimated') => {
    if (selectedMonths.size === 0) {
      toast.error('Select at least one month');
      return;
    }

    setBulkSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const key of Array.from(selectedMonths)) {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      if (getImportDerived(year, month)) continue; // defensive — shouldn't be selectable at all
      const record = getEarningsForMonth(year, month);
      const currentAmount = record ? record.amount : defaultEarnings;

      try {
        await setEarningsForMonth(year, month, currentAmount, newStatus);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkSaving(false);
    setSelectedMonths(new Set());

    const label = newStatus === 'confirmed' ? 'Confirmed' : 'Estimated';
    if (failCount === 0) {
      toast.success(`${successCount} months marked as ${label}`);
    } else {
      toast.error(`Updated ${successCount}, failed ${failCount}`);
    }
  };

  const allSelected = selectedMonths.size === editableMonths.length && editableMonths.length > 0;
  const someSelected = selectedMonths.size > 0 && !allSelected;

  return {
    getEarningsForMonth,
    getImportDerived,
    defaultEarnings,
    months: visibleMonths,
    availableYears,
    yearFilter,
    setYearFilter,
    editingKey,
    setEditingKey,
    editValue,
    setEditValue,
    handleEditClick,
    handleSave,

    selectedMonths,
    toggleSelection,
    toggleSelectAll,
    allSelected,
    someSelected,

    bulkAmount,
    setBulkAmount,
    bulkSaving,
    handleBulkSaveAmount,
    handleBulkStatus,
    clearSelection: () => {
      setSelectedMonths(new Set());
      setBulkAmount('');
    },
  };
}
