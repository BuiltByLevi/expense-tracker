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
  const { getEarningsForMonth, setEarningsForMonth, revertEarningsOverride, earnings: defaultEarnings } = useEarnings();
  const { getIncomeForMonth } = useIncome();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Months whose earnings come from an imported statement. Editing one of
  // these saves an OVERRIDE record (record.override), which takes precedence
  // over the imported sum everywhere — see shared/earningsResolution.ts.
  // Saving a plain record would have no visible effect, because imported
  // income otherwise wins.
  const getImportDerived = useCallback(
    (year: number, month: number): DerivedEarnings | null => {
      const { entries } = getIncomeForMonth(year, month);
      return deriveMonthlyEarnings(entries);
    },
    [getIncomeForMonth]
  );

  const isOverridden = useCallback(
    (year: number, month: number) =>
      !!getEarningsForMonth(year, month)?.override && !!getImportDerived(year, month),
    [getEarningsForMonth, getImportDerived]
  );

  /** What the table shows for a month — override > imported > record > default. */
  const getDisplay = useCallback(
    (year: number, month: number) => {
      const imported = getImportDerived(year, month);
      const record = getEarningsForMonth(year, month);
      if (imported && record?.override) {
        return { amount: record.amount, status: record.status, imported, overridden: true };
      }
      if (imported) return { amount: imported.amount, status: 'confirmed' as const, imported, overridden: false };
      if (record) return { amount: record.amount, status: record.status, imported: null, overridden: false };
      return { amount: defaultEarnings, status: 'missing' as const, imported: null, overridden: false };
    },
    [getImportDerived, getEarningsForMonth, defaultEarnings]
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
      await setEarningsForMonth(year, month, num, 'confirmed', {
        override: !!getImportDerived(year, month),
      });
      setEditingKey(null);
    } catch {
      // error toast handled in context
    }
  };

  // Every month can be selected: imported months are updated as overrides.
  const editableMonths = visibleMonths;

  const parseKey = (key: string) => {
    const [yearStr, monthStr] = key.split('-');
    return { year: parseInt(yearStr), month: parseInt(monthStr) };
  };

  const toggleSelection = (key: string) => {
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
      const { year, month: monthNum } = parseKey(key);
      try {
        await setEarningsForMonth(year, monthNum, num, 'confirmed', {
          override: !!getImportDerived(year, monthNum),
          silent: true,
        });
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
    let skipped = 0;

    for (const key of Array.from(selectedMonths)) {
      const { year, month } = parseKey(key);
      const imported = getImportDerived(year, month);
      const record = getEarningsForMonth(year, month);
      // An imported month's status is always "confirmed" by definition; only
      // its override (if any) carries a status that can be changed.
      if (imported && !record?.override) {
        skipped++;
        continue;
      }
      const currentAmount = record ? record.amount : defaultEarnings;

      try {
        await setEarningsForMonth(year, month, currentAmount, newStatus, {
          override: !!imported,
          silent: true,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkSaving(false);
    setSelectedMonths(new Set());

    const label = newStatus === 'confirmed' ? 'Confirmed' : 'Estimated';
    const skippedNote = skipped > 0 ? ` (${skipped} imported ${skipped === 1 ? 'month' : 'months'} skipped — always confirmed)` : '';
    if (failCount === 0) {
      toast.success(`${successCount} months marked as ${label}${skippedNote}`);
    } else {
      toast.error(`Updated ${successCount}, failed ${failCount}`);
    }
  };

  const handleRevert = async (year: number, month: number) => {
    try {
      await revertEarningsOverride(year, month);
      if (editingKey === `${year}-${month}`) setEditingKey(null);
    } catch {
      // error toast handled in context
    }
  };

  const selectedOverriddenKeys = Array.from(selectedMonths).filter((key) => {
    const { year, month } = parseKey(key);
    return isOverridden(year, month);
  });

  const handleBulkRevert = async () => {
    if (selectedOverriddenKeys.length === 0) return;
    setBulkSaving(true);
    let successCount = 0;
    let failCount = 0;
    for (const key of selectedOverriddenKeys) {
      const { year, month } = parseKey(key);
      try {
        await revertEarningsOverride(year, month, { silent: true });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBulkSaving(false);
    setSelectedMonths(new Set());
    if (failCount === 0) toast.success(`${successCount} months reverted to their imported totals`);
    else toast.error(`Reverted ${successCount}, failed ${failCount}`);
  };

  const allSelected = selectedMonths.size === editableMonths.length && editableMonths.length > 0;
  const someSelected = selectedMonths.size > 0 && !allSelected;

  return {
    getEarningsForMonth,
    getImportDerived,
    isOverridden,
    getDisplay,
    handleRevert,
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
    handleBulkRevert,
    selectedOverriddenCount: selectedOverriddenKeys.length,
    clearSelection: () => {
      setSelectedMonths(new Set());
      setBulkAmount('');
    },
  };
}
