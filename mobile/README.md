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

Application id: **`com.pratiq.expensetracker`** (Android package and iOS
bundle id). This is permanent once published to Play — changing it later
means a new listing.

`eas.json` defines `development`, `preview` and `production` profiles;
`production` builds an AAB for Play and pulls its variables from the EAS
`production` environment.

### First-time setup

These need an Expo account, so they must be run by a human:

```bash
cd mobile
npx eas-cli login          # interactive — cannot be scripted
npx eas-cli init           # creates the EAS project, fills extra.eas.projectId
npm run eas:push-env       # copies .env into all three EAS environments
```

`npm run eas:push-env` matters: `.env` is gitignored, so it never reaches a
cloud build. Without it the build compiles with an empty Firebase config and
the app throws at startup. The script prints variable names only, never
values.

### Building

```bash
npm run build:android:preview      # installable APK for testing on a device
npm run build:android:production   # AAB for Play
```

Version codes come from EAS (`appVersionSource: "remote"` with
`autoIncrement` on production), so `app.json` deliberately has no
`versionCode` — setting one there would conflict.

### Why there is no `.easignore`

EAS archives the **git repository root**, not just `mobile/`, which is what
lets `shared/` reach the build. Adding a `.easignore` would be tempting to
trim the upload, but it **replaces every `.gitignore` rule** rather than
adding to them — which would start copying `.env` and `dist/` into the build
context. The default behaviour already excludes those correctly.
