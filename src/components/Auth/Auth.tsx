import React, { useState } from 'react';
import { useAuthForm } from '../../hooks/useAuthForm';
import LogoMark from '../common/LogoMark';
import RotatingQuote from '../common/RotatingQuote';
import { LockIcon, ShieldCheckIcon, ChartLineIcon, WalletIcon, UploadIcon } from '../common/FinanceIcons';

/**
 * Sign in / create account. One responsive page: on phones a gradient
 * brand header with the form card below; on wider screens a brand panel on
 * the left (features + rotating quote) and the form on the right.
 */

const FEATURES = [
  { icon: <WalletIcon size={16} color="currentColor" />, text: 'Budgets per category with alerts' },
  { icon: <ChartLineIcon size={16} color="currentColor" />, text: 'Stock-style trends of your money' },
  { icon: <UploadIcon size={16} color="currentColor" />, text: 'Import bank statements in seconds' },
];

const EyeIcon: React.FC<{ off?: boolean }> = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const Auth: React.FC = () => {
  const {
    isLogin, email, setEmail, password, setPassword,
    confirmPassword, setConfirmPassword, loading, errors, clearFieldError,
    handleSubmit, toggleMode, handleForgotPassword, resetting,
  } = useAuthForm();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="au-page">
      <aside className="au-brand">
        <div className="au-logo-row">
          <span className="au-logo"><LogoMark size={30} color="white" /></span>
          <span className="au-name">PRATIQ</span>
        </div>
        <h1 className="au-headline">Track every rupee.<br />Grow every month.</h1>
        <p className="au-sub">Your spending, earnings and budgets in one secure place.</p>
        <ul className="au-features">
          {FEATURES.map((f) => (
            <li key={f.text}><span>{f.icon}</span>{f.text}</li>
          ))}
        </ul>
        <div className="au-quote"><RotatingQuote variant="inline" /></div>
      </aside>

      <main className="au-card-wrap">
        <div className="au-card">
          <div className="au-tabs" role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={isLogin} className={isLogin ? 'on' : ''} onClick={() => !isLogin && toggleMode()}>Sign in</button>
            <button type="button" role="tab" aria-selected={!isLogin} className={!isLogin ? 'on' : ''} onClick={() => isLogin && toggleMode()}>Create account</button>
          </div>

          <h2 className="au-title">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
          <p className="au-hint">{isLogin ? 'Sign in to see your dashboard.' : 'It takes less than a minute.'}</p>

          <form onSubmit={handleSubmit} noValidate className="au-form">
            <label className={`au-field ${errors.email ? 'err' : ''}`}>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
              />
              {errors.email && <small role="alert">{errors.email}</small>}
            </label>

            <label className={`au-field ${errors.password ? 'err' : ''}`}>
              <span className="au-label-row">
                Password
                {isLogin && (
                  <button type="button" className="au-forgot" onClick={handleForgotPassword} disabled={resetting}>
                    {resetting ? 'Sending…' : 'Forgot password?'}
                  </button>
                )}
              </span>
              <span className="au-pass">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                  placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
                  aria-invalid={!!errors.password}
                />
                <button type="button" className="au-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <EyeIcon off={showPassword} />
                </button>
              </span>
              {errors.password && <small role="alert">{errors.password}</small>}
            </label>

            {!isLogin && (
              <label className={`au-field ${errors.confirm ? 'err' : ''}`}>
                <span>Confirm password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirm'); }}
                  placeholder="Type it again"
                  aria-invalid={!!errors.confirm}
                />
                {errors.confirm && <small role="alert">{errors.confirm}</small>}
              </label>
            )}

            <button type="submit" className="au-submit" disabled={loading}>
              {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="au-switch">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={toggleMode}>{isLogin ? 'Create one' : 'Sign in'}</button>
          </p>

          <div className="au-trust">
            <span><LockIcon size={12} color="currentColor" /> Encrypted connection</span>
            <span><ShieldCheckIcon size={12} color="currentColor" /> Only you can see your data</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
