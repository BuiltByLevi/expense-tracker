import { describe, expect, it } from 'vitest';
import { authErrorKey } from './authErrors';
import { translate } from '../i18n';

describe('authErrorKey', () => {
  it('maps every wrong-credential variant to one message', () => {
    for (const code of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials']) {
      expect(authErrorKey(code)).toBe('auth.error.invalidCredential');
    }
  });

  it('maps the other known codes', () => {
    expect(authErrorKey('auth/invalid-email')).toBe('auth.error.invalidEmail');
    expect(authErrorKey('auth/weak-password')).toBe('auth.error.shortPassword');
    expect(authErrorKey('auth/email-already-in-use')).toBe('auth.error.emailInUse');
    expect(authErrorKey('auth/too-many-requests')).toBe('auth.error.tooManyRequests');
    expect(authErrorKey('auth/network-request-failed')).toBe('auth.error.networkFailed');
  });

  // Regression: staging showed "Firebase: Error (auth/configuration-not-found)."
  // in the toast because unknown codes fell back to Firebase's raw message.
  it('never surfaces raw Firebase text for unknown or missing codes', () => {
    for (const code of ['auth/configuration-not-found', 'auth/internal-error', undefined]) {
      const key = authErrorKey(code);
      expect(key).toBe('auth.error.unexpected');
      for (const lang of ['en', 'hi', 'mr'] as const) {
        const text = translate(lang, key);
        expect(text).not.toMatch(/Firebase|auth\//);
        expect(text).not.toBe(key);
      }
    }
  });
});
