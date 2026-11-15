// Single source of truth for the app language union, shared by the web app's
// and the mobile app's otherwise-separate i18n setups (each has its own UI
// dictionary, since their screens differ — see src/i18n and mobile/src/i18n).

export type AppLanguage = 'en' | 'hi' | 'mr';

export const APP_LANGUAGES: readonly AppLanguage[] = ['en', 'hi', 'mr'];

/** Each language's own name, in its own script — shown the same way
 *  regardless of the currently active language (never run through t()). */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
};

export function isAppLanguage(value: string): value is AppLanguage {
  return (APP_LANGUAGES as readonly string[]).includes(value);
}
