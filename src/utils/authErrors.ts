import type { TranslationKey } from '../i18n';

/**
 * Maps a Firebase Auth error code to the translated message shown in the
 * sign-in / sign-up toast. Unknown codes fall back to a generic message:
 * Firebase's own `error.message` (e.g. "Firebase: Error (auth/...)") is raw,
 * English-only and not meant for users, so it is never shown.
 */
export function authErrorKey(code: string | undefined): TranslationKey {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'auth.error.invalidCredential';
    case 'auth/invalid-email':
      return 'auth.error.invalidEmail';
    case 'auth/weak-password':
      return 'auth.error.shortPassword';
    case 'auth/email-already-in-use':
      return 'auth.error.emailInUse';
    case 'auth/too-many-requests':
      return 'auth.error.tooManyRequests';
    case 'auth/network-request-failed':
      return 'auth.error.networkFailed';
    default:
      return 'auth.error.unexpected';
  }
}
