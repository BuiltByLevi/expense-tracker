import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AuthWeb: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const { login, signup } = useAuth();

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

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

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: 'absolute', width: '500px', height: '500px',
        background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%',
        top: '-100px', left: '-100px',
        animation: 'float 20s infinite ease-in-out',
      }} />
      <div style={{
        position: 'absolute', width: '400px', height: '400px',
        background: 'rgba(255, 255, 255, 0.08)', borderRadius: '50%',
        bottom: '-100px', right: '-100px',
        animation: 'float 15s infinite ease-in-out reverse',
      }} />

      {/* Main Card */}
      <div style={{
        width: '100%',
        maxWidth: '1100px',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Left Side - Branding */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: '30px', right: '30px',
            fontSize: '48px', opacity: 0.2,
          }}>💰</div>
          
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px', marginBottom: '32px',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>💰</div>

          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 16px 0', lineHeight: 1.2 }}>
            Track Every Rupee
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9, margin: '0 0 40px 0', lineHeight: 1.6 }}>
            Take control of your finances with smart expense tracking, detailed analytics, and beautiful insights.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FeatureItem icon="📊" text="Category-wise analytics" />
            <FeatureItem icon="📈" text="Monthly & yearly reports" />
            <FeatureItem icon="💰" text="Track earnings & savings" />
            <FeatureItem icon="🔒" text="Secure cloud sync" />
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{ padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              {isLogin ? 'Sign in to continue to your dashboard' : 'Start tracking your expenses today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '14px 16px',
                  border: `2px solid ${errors.email ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '12px', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => { if (!errors.email) e.currentTarget.style.borderColor = '#6366f1'; }}
                onBlur={(e) => { if (!errors.email) e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
              {errors.email && <p style={{ fontSize: '12px', color: '#ef4444', margin: '6px 0 0 0' }}>{errors.email}</p>}
            </div>

            <div style={{ marginBottom: isLogin ? '24px' : '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                style={{
                  width: '100%', padding: '14px 16px',
                  border: `2px solid ${errors.password ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '12px', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => { if (!errors.password) e.currentTarget.style.borderColor = '#6366f1'; }}
                onBlur={(e) => { if (!errors.password) e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
              {errors.password && <p style={{ fontSize: '12px', color: '#ef4444', margin: '6px 0 0 0' }}>{errors.password}</p>}
            </div>

            {!isLogin && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirm) setErrors({ ...errors, confirm: undefined }); }}
                  placeholder="Re-enter your password"
                  style={{
                    width: '100%', padding: '14px 16px',
                    border: `2px solid ${errors.confirm ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '12px', fontSize: '15px',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => { if (!errors.confirm) e.currentTarget.style.borderColor = '#6366f1'; }}
                  onBlur={(e) => { if (!errors.confirm) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                />
                {errors.confirm && <p style={{ fontSize: '12px', color: '#ef4444', margin: '6px 0 0 0' }}>{errors.confirm}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={toggleMode}
                style={{
                  background: 'none', border: 'none', color: '#6366f1',
                  fontWeight: 700, cursor: 'pointer', fontSize: '14px', padding: 0,
                }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 30px); }
        }
      `}</style>
    </div>
  );
};

const FeatureItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{
      width: '40px', height: '40px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.15)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '18px',
    }}>{icon}</div>
    <span style={{ fontSize: '15px', fontWeight: 500 }}>{text}</span>
  </div>
);

export default AuthWeb;