import { en, type TranslationKey } from './en';
import { hi } from './hi';
import { mr } from './mr';
import type { AppLanguage } from '../../shared/i18n/types';

export type { AppLanguage } from '../../shared/i18n/types';
export { APP_LANGUAGES, LANGUAGE_NAMES, isAppLanguage } from '../../shared/i18n/types';
export type { TranslationKey } from './en';

const dictionaries: Record<AppLanguage, Record<TranslationKey, string>> = { en, hi, mr };

/** `{{var}}` interpolation — no pluralization engine; keep plural branches
 *  as inline conditionals at the call site (matches existing codebase style). */
export function translate(
  lang: AppLanguage,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const raw = dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ''));
}
