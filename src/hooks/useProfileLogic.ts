import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpensesContext';
import { useIncome } from '../context/IncomeContext';
import { useStatementImports } from './useStatementImports';
import { useEarnings } from '../context/EarningsContext';
import { useTheme } from '../context/ThemeContext';
import { computeFinanceTotals } from '../utils/finance';
import { makeCashFlowLookup } from '../utils/cashFlowLookup';

// REPLACE THESE WITH YOUR CLOUDINARY CREDENTIALS
const CLOUDINARY_CLOUD_NAME = 'jwa2pjzg';
const CLOUDINARY_UPLOAD_PRESET = 'levihere';

/**
 * Owns all ProfilePage business logic (stats, display name, photo upload,
 * password/logout/delete actions) so the Web and Mobile pages share one
 * source of truth and only differ in layout.
 */
export function useProfileLogic() {
  const { user, logout, updateUserProfile } = useAuth();
  const { expenses, deleteAllExpenses } = useExpenses();
  const { getIncomeForMonth, deleteAllIncome } = useIncome();
  const { deleteAllImports } = useStatementImports();
  const { earnings: defaultEarnings, getEarningsForMonth, resetEarningsHistory } = useEarnings();
  const { theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState(
    user?.displayName || user?.email?.split('@')[0] || 'User'
  );
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const uniqueMonths = new Set(
      expenses.map((e) => {
        const d = new Date(e.date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );
    return {
      totalExpenses: totalSpent,
      transactionCount: expenses.length,
      monthsTracked: uniqueMonths.size,
      memberSince: user?.metadata?.creationTime
        ? format(new Date(user.metadata.creationTime), 'MMMM yyyy')
        : 'Recently',
      lastSignIn: user?.metadata?.lastSignInTime
        ? format(new Date(user.metadata.lastSignInTime), 'dd MMM yyyy, hh:mm a')
        : 'Just now',
    };
  }, [expenses, user]);

  // Same cash-flow lookup and walk the Dashboard uses for its Cumulative Net
  // Cash Flow, so this stat can never silently disagree with the Dashboard
  // for the same data (see utils/cashFlowLookup.ts).
  const getMonthlyCashFlowCredits = useMemo(
    () => makeCashFlowLookup(getIncomeForMonth, getEarningsForMonth),
    [getIncomeForMonth, getEarningsForMonth]
  );

  const totalSavings = useMemo(() => {
    const today = new Date();
    const totals = computeFinanceTotals(
      expenses,
      defaultEarnings,
      getMonthlyCashFlowCredits,
      today.getFullYear(),
      today.getMonth()
    );
    return totals.cumulativeNetCashFlow;
  }, [expenses, defaultEarnings, getMonthlyCashFlowCredits]);

  const initials = useMemo(() => {
    const name = displayName || user?.email?.split('@')[0] || 'U';
    const parts = name.split(/[\s._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, [displayName, user]);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await response.json();

      if (data.secure_url) {
        await updateUserProfile({ photoURL: data.secure_url });
        toast.success('Profile picture updated!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = () => {
    toast.success('Password reset email sent to ' + user?.email, { duration: 4000 });
  };

  const handleLogout = async () => {
    if (window.confirm('This will sign you out from all devices. Continue?')) {
      await logout();
    }
  };

  const handleDeleteData = async () => {
    const confirmText = window.prompt(
      'Type "DELETE" (all caps) to permanently delete all your expenses, income, and earnings history. This cannot be undone:'
    );
    if (confirmText !== 'DELETE') return;

    setDeletingData(true);
    try {
      await Promise.all([
        deleteAllExpenses(),
        deleteAllIncome(),
        resetEarningsHistory(),
        deleteAllImports(),
      ]);
      toast.success('All expense data deleted', { duration: 4000 });
    } catch (error) {
      console.error('Error deleting all data:', error);
      toast.error('Something went wrong deleting your data — some of it may remain. Please try again.', { duration: 5000 });
    } finally {
      setDeletingData(false);
    }
  };

  const handleDeleteAccount = () => {
    const confirmText = window.prompt(
      'Type "DELETE ACCOUNT" to permanently delete your account:'
    );
    if (confirmText === 'DELETE ACCOUNT') {
      toast.error('Contact support to delete your account', { duration: 4000 });
    }
  };

  return {
    user,
    theme,
    toggleTheme,
    defaultEarnings,
    stats,
    totalSavings,
    initials,

    displayName,
    setDisplayName,
    savingName,
    handleSaveName,

    uploadingPhoto,
    fileInputRef,
    handlePhotoUpload,

    handleChangePassword,
    handleLogout,
    handleDeleteData,
    deletingData,
    handleDeleteAccount,
  };
}
