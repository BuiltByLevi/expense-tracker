import React, { useState } from 'react';
import { useAuthForm } from '../../hooks/useAuthForm';
import { useLanguage } from '../../context/useLanguage';
import LogoMark from '../common/LogoMark';
import RotatingQuote from '../common/RotatingQuote';
import { LockIcon, ShieldCheckIcon, ChartLineIcon, WalletIcon, UploadIcon, InboxIcon } from '../common/FinanceIcons';

/**
 * Sign in / create account. One responsive page: on phones a gradient
 * brand header with the form card below; on wider screens a brand panel on
 * the left (features + rotating quote) and the form on the right.
 */

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
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const FEATURES = [
    { icon: <WalletIcon size={18} color="currentColor" />, text: t('auth.feature.budgets'), sub: t('auth.feature.budgets.sub'), badge: t('auth.feature.budgets.badge'), badgeLive: true },
    { icon: <ChartLineIcon size={18} color="currentColor" />, text: t('auth.feature.trends'), sub: t('auth.feature.trends.sub'), badge: null, badgeLive: false },
    { icon: <UploadIcon size={18} color="currentColor" />, text: t('auth.feature.import'), sub: t('auth.feature.import.sub'), badge: t('auth.feature.import.badge'), badgeLive: false },
  ];

  return (
    <div className="au-page">
      <aside className="au-brand">
        <div className="au-logo-row animate-in">
          <span className="au-logo"><LogoMark size={30} color="white" /></span>
          <span className="au-name">PRATIQ</span>
        </div>
        <span className="au-eyebrow animate-in"><i /> {t('auth.brand.eyebrow')}</span>
        <h1 className="au-headline animate-in animate-in-delay-1">
          {t('auth.brand.headline1')}<br />
          <span className="au-headline-accent">{t('auth.brand.headline2')}</span>
        </h1>
        <p className="au-sub animate-in animate-in-delay-1">{t('auth.brand.sub')}</p>
        <ul className="au-features">
          {FEATURES.map((f, i) => (
            <li key={f.text} className={`au-feature-card animate-in animate-in-delay-${i + 2}`}>
              <span className="au-feature-ico">{f.icon}</span>
              <span className="au-feature-text">
                <strong>{f.text}</strong>
                <small>{f.sub}</small>
              </span>
              {f.badge && <span className={`au-feature-badge ${f.badgeLive ? 'au-badge-live' : ''}`}>{f.badge}</span>}
            </li>
          ))}
        </ul>
        <div className="au-quote animate-in animate-in-delay-5"><RotatingQuote variant="slide" /></div>
      </aside>

      <main className="au-card-wrap">
        <div className="au-float-chip au-float-chip-1" aria-hidden="true">
          <span className="au-float-ico"><ShieldCheckIcon size={15} /></span>
          <span className="au-float-text">
            <strong>{t('auth.chip.encryption.title')}</strong>
            <small>{t('auth.chip.encryption.sub')}</small>
          </span>
        </div>
        <div className="au-float-chip au-float-chip-2" aria-hidden="true">
          <span className="au-float-ico"><ChartLineIcon size={15} /></span>
          <span className="au-float-text">
            <strong>{t('auth.chip.insights.title')}</strong>
            <small>{t('auth.chip.insights.sub')}</small>
          </span>
        </div>
        <div className="au-float-chip au-float-chip-3" aria-hidden="true">
          <span className="au-float-ico"><WalletIcon size={15} /></span>
          <span className="au-float-text">
            <strong>{t('auth.chip.trends.title')}</strong>
            <small>{t('auth.chip.trends.sub')}</small>
          </span>
        </div>
        <div className="au-card glass-card animate-in">
          <div className="au-tabs tab-container animate-in animate-in-delay-1" role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={isLogin} className={`tab ${isLogin ? 'active' : ''}`} onClick={() => !isLogin && toggleMode()}>{t('auth.tab.signIn')}</button>
            <button type="button" role="tab" aria-selected={!isLogin} className={`tab ${!isLogin ? 'active' : ''}`} onClick={() => isLogin && toggleMode()}>{t('auth.tab.createAccount')}</button>
          </div>

          <h2 className="au-title animate-in animate-in-delay-2">{isLogin ? t('auth.title.welcomeBack') : t('auth.title.createAccount')}</h2>
          <p className="au-hint animate-in animate-in-delay-2">{isLogin ? t('auth.hint.signIn') : t('auth.hint.createAccount')}</p>

          <form onSubmit={handleSubmit} noValidate className="au-form">
            <label className={`au-field animate-in animate-in-delay-3 ${errors.email ? 'err' : ''}`}>
              <span>{t('auth.field.email')}</span>
              <span className="au-input-wrap">
                <span className="au-input-ico" aria-hidden="true"><InboxIcon size={16} /></span>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                  placeholder={t('auth.email.placeholder')}
                  aria-invalid={!!errors.email}
                />
                {emailLooksValid && !errors.email && <span className="au-input-ok" aria-hidden="true" />}
              </span>
              {errors.email && <small role="alert">{errors.email}</small>}
            </label>

            <label className={`au-field animate-in animate-in-delay-4 ${errors.password ? 'err' : ''}`}>
              <span className="au-label-row">
                {t('auth.field.password')}
                {isLogin && (
                  <button type="button" className="au-forgot" onClick={handleForgotPassword} disabled={resetting}>
                    {resetting ? t('auth.forgotPassword.sending') : t('auth.forgotPassword')}
                  </button>
                )}
              </span>
              <span className="au-pass">
                <span className="au-input-ico" aria-hidden="true"><LockIcon size={16} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                  placeholder={isLogin ? t('auth.password.placeholder.signIn') : t('auth.password.placeholder.createAccount')}
                  aria-invalid={!!errors.password}
                />
                <button type="button" className="au-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? t('auth.password.hide') : t('auth.password.show')}>
                  <EyeIcon off={showPassword} />
                </button>
              </span>
              {errors.password && <small role="alert">{errors.password}</small>}
            </label>

            {!isLogin && (
              <label className={`au-field animate-in animate-in-delay-5 ${errors.confirm ? 'err' : ''}`}>
                <span>{t('auth.field.confirmPassword')}</span>
                <span className="au-input-wrap">
                  <span className="au-input-ico" aria-hidden="true"><LockIcon size={16} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirm'); }}
                    placeholder={t('auth.password.placeholder.confirm')}
                    aria-invalid={!!errors.confirm}
                  />
                </span>
                {errors.confirm && <small role="alert">{errors.confirm}</small>}
              </label>
            )}

            <button type="submit" className="au-submit btn-primary animate-in animate-in-delay-6" disabled={loading}>
              {loading ? t('auth.submit.wait') : isLogin ? t('auth.submit.signIn') : t('auth.submit.createAccount')}
              {!loading && <span className="au-submit-arrow" aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="au-switch animate-in animate-in-delay-7">
            {isLogin ? t('auth.switch.noAccount') : t('auth.switch.haveAccount')}
            <button type="button" onClick={toggleMode}>{isLogin ? t('auth.switch.createOne') : t('auth.switch.signIn')}</button>
          </p>

          <div className="au-trust animate-in animate-in-delay-7">
            <span><LockIcon size={12} color="currentColor" /> {t('auth.trust.encrypted')}</span>
            <span><ShieldCheckIcon size={12} color="currentColor" /> {t('auth.trust.private')}</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
