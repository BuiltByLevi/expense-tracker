# PRATIQ Mobile (Expo / React Native)

Android app for the PRATIQ expense tracker. Shares the web app's Firebase
project and its financial logic — see [`../shared`](../shared).

## Setup

```bash
cd mobile
npm install
cp .env.example .env    # fill in with the same values as the web app's .env
npm start               # then press 'a' for Android, or scan the QR in Expo Go
```

`.env` holds the Firebase client config as `EXPO_PUBLIC_FIREBASE_*` — the same
values the web app reads as `VITE_FIREBASE_*`. It is gitignored.

## What is shared with the web app

`../shared` is the single source of truth for everything platform-independent:
financial calculations, earnings derivation, cash-flow lookup, transaction
classification, duplicate detection, date handling, and statement parsing.
The web app's `src/utils/*` files are thin re-export shims pointing at it, so
both apps always compile the same rules. Its tests run from the repo root
(`npm test`) and cover both apps.

Metro resolves `@shared/*` through `tsconfig.json` paths plus a `watchFolders`
entry in `metro.config.js` (the shared code lives outside this app's root).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` | Dev server, opens on Android |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run bundle:android` | Full Metro production bundle (catches resolution errors) |
| `npm run test:shared` | Runs the shared logic test suite from the repo root |

## Firebase notes

Auth is imported from the **scoped** `@firebase/auth` package, not the
`firebase/auth` umbrella. Only the scoped package declares a `react-native`
export condition; the umbrella resolves to the browser build, which lacks
`getReactNativePersistence` and would leave the session in memory only
(signed out on every cold start). See `src/services/firebase.ts`.

Unlike the web app — which uses `browserSessionPersistence` and deliberately
drops the session when the tab closes — mobile persists the session via
AsyncStorage, since a phone app that signs you out on every launch is unusable.

## Statement import

CSV and XLS/XLSX are supported and run the same parser as the web app, with
bytes read via `expo-file-system` instead of the browser `File` API.

**PDF is not supported on mobile.** The web PDF parser depends on `pdfjs-dist`,
which needs a browser engine and a worker. The import screen says so explicitly
and points the user to CSV/Excel or the web app.

## Android release

`eas.json` defines `development`, `preview` and `production` profiles;
`production` builds an AAB for Play. Before the first build:

1. Set the real Android package id in `app.json` (`android.package`).
2. `eas init` to populate `extra.eas.projectId`.
3. Upload the Firebase env vars to EAS (`eas env:create`) — `.env` is
   gitignored and is **not** uploaded to cloud builds, so without this the
   production build ships without Firebase config and fails at startup.
