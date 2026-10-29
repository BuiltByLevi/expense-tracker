import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AuthMobile: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const { login, signup } = useAuth();

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Enter a valid email';
    if (!password || password.length < 6) newErrors.password = 'Min 6 characters';
    if (!isLogin && password !== confirmPassword) newErrors.confirm = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) { await login(email, password); toast.success('Welcome back!'); }
      else { await signup(email, password); toast.success('Account created!'); }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      const message = firebaseError.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : firebaseError.code === 'auth/email-already-in-use'
        ? 'Email already in use'
        : firebaseError.message || 'An unexpected error occurred';
      toast.error(message);
    } finally { setLoading(false); }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Orbs */}
      <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', top: '-50px', right: '-50px' }} />
      <div style={{ position: 'absolute', width: '250px', height: '250px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', bottom: '-80px', left: '-50px' }} />

      {/* Branding Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '36px', margin: '0 auto 16px auto',
          border: '1px solid rgba(255,255,255,0.3)',
        }}>💰</div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'white', margin: '0 0 8px 0' }}>
          Expense Tracker
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
          Track every rupee, save more
        </p>
      </div>

      {/* Form Card */}
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '32px 24px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        position: 'relative',
        zIndex: 1,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            {isLogin ? 'Sign in to continue' : 'Start tracking today'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
              placeholder="you@example.com"
              style={{
                width: '100%', padding: '14px 16px',
                border: `2px solid ${errors.email ? '#ef4444' : '#e2e8f0'}`,
                borderRadius: '12px', fontSize: '16px',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => { if (!errors.email) e.currentTarget.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { if (!errors.email) e.currentTarget.style.borderColor = '#e2e8f0'; }}
            />
            {errors.email && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{errors.email}</p>}
          </div>

          <div style={{ marginBottom: isLogin ? '20px' : '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
              placeholder="Min 6 characters"
              style={{
                width: '100%', padding: '14px 16px',
                border: `2px solid ${errors.password ? '#ef4444' : '#e2e8f0'}`,
                borderRadius: '12px', fontSize: '16px',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => { if (!errors.password) e.currentTarget.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { if (!errors.password) e.currentTarget.style.borderColor = '#e2e8f0'; }}
            />
            {errors.password && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{errors.password}</p>}
          </div>

          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirm) setErrors({ ...errors, confirm: undefined }); }}
                placeholder="Re-enter password"
                style={{
                  width: '100%', padding: '14px 16px',
                  border: `2px solid ${errors.confirm ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '12px', fontSize: '16px',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { if (!errors.confirm) e.currentTarget.style.borderColor = '#6366f1'; }}
                onBlur={(e) => { if (!errors.confirm) e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
              {errors.confirm && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>{errors.confirm}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
            }}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={toggleMode}
              style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: '13px', padding: 0 }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthMobile;