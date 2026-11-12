import React, { useState } from 'react';
import { useAuthForm } from '../../hooks/useAuthForm';
import { theme } from '../../styles/theme';
import LogoMark from '../common/LogoMark';
import { PieIcon, ChartLineIcon, SavingsIcon, ShieldCheckIcon, LockIcon, CardChip, ContactlessMark } from '../common/FinanceIcons';
import { FINANCIAL_QUOTES, getDailyQuote } from '../../utils/quotes';

const AuthWeb: React.FC = () => {
  const {
    isLogin, email, setEmail, password, setPassword,
    confirmPassword, setConfirmPassword, loading, errors, clearFieldError,
    handleSubmit, toggleMode,
  } = useAuthForm();
  const [quote] = useState(() => getDailyQuote(FINANCIAL_QUOTES));

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.tealDark} 100%)`,
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
      <div className="auth-split" style={{
        width: '100%',
        maxWidth: '1100px',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Left Side - Branding */}
        <div style={{
          background: theme.colors.primaryGradient,
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
        }}>
          {/* Miniature debit-card mockup as the brand watermark */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: '28px', right: '28px',
            width: '150px', height: '92px', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)',
            border: '1px solid rgba(255,255,255,0.25)',
            padding: '12px 14px', opacity: 0.85,
            transform: 'rotate(6deg)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <CardChip width={26} />
              <ContactlessMark size={16} />
            </div>
            <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>
              •••• •••• 2026
            </div>
          </div>

          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '24px',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            <LogoMark size={38} color="white" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, lineHeight: 1.2, letterSpacing: '0.02em' }}>
              PRATIQ
            </h1>
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: '999px',
              background: `rgba(${theme.colors.successRgb}, 0.25)`, border: `1px solid rgba(${theme.colors.successRgb}, 0.5)`,
            }}>Pro Expense Tracker</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px 0', lineHeight: 1.3, opacity: 0.95 }}>
            Track Every Rupee
          </h2>
          <p style={{ fontSize: '16px', opacity: 0.9, margin: '0 0 40px 0', lineHeight: 1.6 }}>
            Take control of your finances with smart expense tracking, detailed analytics, and beautiful insights.
          </p>

          <div className="auth-features" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FeatureItem icon={<PieIcon size={19} color="white" />} text="Category-wise analytics" />
            <FeatureItem icon={<ChartLineIcon size={19} color="white" />} text="Monthly & yearly reports" />
            <FeatureItem icon={<SavingsIcon size={19} color="white" />} text="Track earnings & savings" />
            <FeatureItem icon={<ShieldCheckIcon size={19} color="white" />} text="Secure cloud sync" />
          </div>

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <p style={{ fontSize: '14px', fontStyle: 'italic', lineHeight: 1.6, opacity: 0.92, margin: 0 }}>
              “{quote.text}”
            </p>
            <p style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, margin: '8px 0 0 0' }}>
              — {quote.author}
            </p>
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
                onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '14px 16px',
                  border: `2px solid ${errors.email ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '12px', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => { if (!errors.email) e.currentTarget.style.borderColor = theme.colors.primary; }}
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
                onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                style={{
                  width: '100%', padding: '14px 16px',
                  border: `2px solid ${errors.password ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '12px', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => { if (!errors.password) e.currentTarget.style.borderColor = theme.colors.primary; }}
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
                  onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirm'); }}
                  placeholder="Re-enter your password"
                  style={{
                    width: '100%', padding: '14px 16px',
                    border: `2px solid ${errors.confirm ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '12px', fontSize: '15px',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => { if (!errors.confirm) e.currentTarget.style.borderColor = theme.colors.primary; }}
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
                background: theme.colors.primaryGradient,
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease',
                boxShadow: `0 4px 16px rgba(${theme.colors.primaryRgb}, 0.3)`,
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
                  background: 'none', border: 'none', color: theme.colors.primary,
                  fontWeight: 700, cursor: 'pointer', fontSize: '14px', padding: 0,
                }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          <div style={{
            marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <LockIcon size={13} color="#94a3b8" />
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              Your data is encrypted in transit and at rest
            </span>
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

const FeatureItem: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
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