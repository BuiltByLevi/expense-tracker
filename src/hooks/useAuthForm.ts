import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export interface AuthFormErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

/**
 * Owns all Auth form logic (state, validation, submit, mode toggle) so
 * AuthWeb and AuthMobile share one source of truth and only differ in layout.
 */
export function useAuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [resetting, setResetting] = useState(false);
  const { login, signup, resetPassword } = useAuth();
  const { t } = useLanguage();

  const clearFieldError = (field: keyof AuthFormErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: AuthFormErrors = {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('auth.error.invalidEmail');
    }
    if (!password || password.length < 6) {
      newErrors.password = t('auth.error.shortPassword');
    }
    if (!isLogin && password !== confirmPassword) {
      newErrors.confirm = t('auth.error.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success(t('auth.success.welcomeBack'));
      } else {
        await signup(email, password);
        toast.success(t('auth.success.accountCreated'));
      }
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string };
      const message = authError.code === 'auth/invalid-credential'
        ? t('auth.error.invalidCredential')
        : authError.code === 'auth/email-already-in-use'
        ? t('auth.error.emailInUse')
        : authError.code === 'auth/too-many-requests'
        ? t('auth.error.tooManyRequests')
        : authError.code === 'auth/network-request-failed'
        ? t('auth.error.networkFailed')
        : authError.message ?? t('auth.error.unexpected');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /** Emails a reset link to the address typed in the Email field. */
  const handleForgotPassword = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: t('auth.error.enterEmailForReset') });
      return;
    }
    setResetting(true);
    try {
      await resetPassword(email);
    } catch {
      // Don't reveal whether an account exists; the message below covers both.
    } finally {
      setResetting(false);
    }
    toast.success(t('auth.success.resetSent', { email }), { duration: 6000 });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  return {
    isLogin,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    errors,
    clearFieldError,
    handleSubmit,
    toggleMode,
    handleForgotPassword,
    resetting,
  };
}
