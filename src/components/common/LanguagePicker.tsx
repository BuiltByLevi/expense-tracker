import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { APP_LANGUAGES, LANGUAGE_NAMES } from '../../../shared/i18n/types';

interface Props {
  /** 'onDark' = translucent-white pills for a gradient/brand background (e.g. the sign-in page). */
  variant?: 'default' | 'onDark';
}

/** Compact 3-way language switcher. Each language's name is always shown in
 *  its own script, never translated, so it stays legible to someone who
 *  can't yet read the current UI language. */
const LanguagePicker: React.FC<Props> = ({ variant = 'default' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`lang-picker${variant === 'onDark' ? ' lang-picker-dark' : ''}`} role="group" aria-label="Language">
      {APP_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          className={`lang-picker-btn${language === lng ? ' on' : ''}`}
          aria-pressed={language === lng}
          onClick={() => setLanguage(lng)}
        >
          {LANGUAGE_NAMES[lng]}
        </button>
      ))}
    </div>
  );
};

export default LanguagePicker;
