import type { Persistence, ReactNativeAsyncStorage } from '@firebase/auth';

/**
 * Type-only shim for a packaging quirk in @firebase/auth.
 *
 * Its package.json `exports["."]` lists a top-level `"types"` key BEFORE the
 * `"react-native"` condition. TypeScript matches `"types"` first and so loads
 * the browser declarations, which omit the React-Native-only
 * `getReactNativePersistence`. Metro does not use a `types` condition, so at
 * RUNTIME it correctly resolves `"react-native"` → dist/rn/index.js, where the
 * function genuinely exists.
 *
 * So the function is real and callable; only its declaration is missing. This
 * augments it back rather than casting to `any` at the call site, which would
 * hide a future signature change.
 */
declare module '@firebase/auth' {
  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): Persistence;
}
