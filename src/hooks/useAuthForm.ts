import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

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
  const { login, signup } = useAuth();

  const clearFieldError = (field: keyof AuthFormErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: AuthFormErrors = {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!isLogin && password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
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
        toast.success('Welcome back!');
      } else {
        await signup(email, password);
        toast.success('Account created successfully!');
      }
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string };
      const message = authError.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : authError.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists'
        : authError.message ?? 'An unexpected error occurred';
      toast.error(message);
    } finally {
      setLoading(false);
    }
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
  };
}
