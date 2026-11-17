# Development Workflow

This document describes how changes move from local development to production.
It contains no secrets. Keep credentials in `.env` files (gitignored) and in the Firebase console, never here.

## Environments at a glance

| Stage        | Where it lives                                  | Git branch | Firebase target                              | Status                          |
|--------------|-------------------------------------------------|------------|----------------------------------------------|---------------------------------|
| Local        | `localhost` via `npm run dev`                   | `dev`      | Whatever `.env` points at (see Safety)       | Ready                           |
| Staging      | Firebase Hosting preview channel / staging site | `dev`      | **Not yet created** (needs approval)         | Pending approval                |
| Production   | https://expense-tracker-b56b6.web.app/          | `main`     | Project `expense-tracker-b56b6`, `live` channel | Live, do not touch without approval |

Flow:

```
LOCAL DEVELOPMENT -> dev -> STAGING / PREVIEW TESTING -> FINAL APPROVAL -> main -> PRODUCTION
```

## Branch structure

- `main`: stable, last reviewed code. Mirrors what is deployed to production.
- `dev`: all new development and fixes. Created from `main` at `b466729`.
- `mobile/desktop-layout`: existing feature branch with its own worktree at `../expense-tracker-mobile`. Not part of this workflow; leave it alone.

Rules:
- All new work and fixes happen on `dev`.
- Staging receives builds from `dev` only.
- Nothing merges into `main` automatically. Nothing deploys to production automatically.

## Switching between main and dev

```bash
git switch dev     # daily work
git switch main    # read-only reference or hotfix investigation
```

Uncommitted changes carry across `git switch` when there are no conflicts. If Git refuses to switch, commit or stash first. Do not use `git reset --hard` or `git checkout -- .` to clear the way; those discard work.

## Local development commands

```bash
npm install          # install web dependencies
npm run dev          # Vite dev server (local only)
npm run build        # tsc -b && vite build -> dist/ (gitignored)
npm run preview      # serve the built dist/ locally
```

Mobile (Expo) lives in `mobile/`:

```bash
cd mobile
npm install
npx tsc --noEmit     # TypeScript check
```

## How to run tests

```bash
npm test                 # vitest run (unit and integration tests, no network)
npm run test:watch       # watch mode while developing
npm run test:emulator    # Firestore/Auth emulator tests (needs firebase-tools; no production access)
npx tsc -b               # web TypeScript check
(cd mobile && npx tsc --noEmit)   # mobile TypeScript check
npm run lint             # eslint . (see Known issues)
```

Last recorded run on `dev` (see the release report): vitest 766 passed / 7 skipped; web and mobile `tsc` exit 0; `vite build` exit 0; eslint reports 18 existing errors.

## How to build

```bash
npm run build
```

Output goes to `dist/`. The folder is gitignored. Running a build does not deploy anything.

## How to deploy to staging (once approved)

Staging is not set up yet. Two options are being considered; neither has been created:

1. **Preview channel on the existing project** (fastest, but shares Firestore and Auth with production; see Safety).
2. **Separate Firebase project** `expense-tracker-staging` (recommended, fully isolated).

Once a separate project is approved and created, the expected commands are:

```bash
git switch dev
npm run build
firebase deploy --only hosting --project expense-tracker-staging
```

Do not run `firebase deploy` without `--project` while on `dev`, because `.firebaserc` defaults to the production project.

For a preview-channel test (only after confirming Safety below), use:

```bash
firebase hosting:channel:deploy staging --expires 7d --project expense-tracker-b56b6
```

This must **not** be run without explicit approval, because the channel would point at production Firestore and Auth. The `live` channel must never be targeted.

## How to access the staging URL

Not available yet. After setup, the staging URL will be printed by the deploy command and recorded here. A URL is only considered working once the application has loaded and sign-in has been checked in a browser.

## How to test Firebase safely

Before any staging deploy:

1. Confirm the target project ID is **not** `expense-tracker-b56b6` for write testing.
2. Confirm `.firebaserc` and any `--project` flag point at the intended project.
3. Use the Firebase Emulator Suite for Firestore and Auth testing where possible (`npm run test:emulator`).
4. Use only test accounts. Never sign in to staging with a real user's account.
5. Do not run migrations, backfills, or bulk writes against production data.
6. Check `firestore.rules` changes on staging before they reach production.

Checklist for a separate staging project:
- Own Authentication providers and authorised domains (add the staging domain).
- Own Firestore database and rules deployed from `dev`.
- Own Hosting site.
- Own web app config in `.env.staging` (gitignored; never committed).

## How to merge dev into main after approval

Only after the user explicitly approves the staging results:

```bash
# 1. Review what would merge
git log --oneline main..dev
git diff --stat main...dev

# 2. Merge (no fast-forward so the merge point is visible)
git switch main
git merge --no-ff dev -m "Merge dev: <summary>"

# 3. Push main only after approval
git push origin main
```

Do not run step 3 automatically. Do not push `main` before approval.

## How production deployment is performed (separately)

Merging into `main` does **not** deploy. Production is a separate, explicitly approved step:

```bash
git switch main
npm run build
firebase deploy --only hosting --project expense-tracker-b56b6
```

Confirm with the user before running the deploy command. Rules and indexes are deployed separately, only when changed and approved.

## Rollback procedure

Firebase Hosting keeps prior releases. To roll back production without touching code:

1. Open the Firebase console -> Hosting -> `expense-tracker-b56b6` -> Release history.
2. Select the last known good release and choose **Rollback**.

To roll back in code:

```bash
git switch main
git revert <bad-merge-commit>     # creates a new commit; do not rewrite history
npm run build
firebase deploy --only hosting --project expense-tracker-b56b6   # only after approval
```

Never use `git push --force` on `main`. Never delete Hosting releases as part of a rollback.

## Known issues (as of the last run on `dev`)

- ESLint reports 18 errors (react-hooks set-state-in-effect, react-refresh only-export-components, unused variables) across `mobile/src/context/*`, `mobile/src/services/firebase.ts`, `src/components/Charts/CategoryPieChart.tsx`, `src/components/ExpenseList/EditExpenseModal.tsx`, `src/context/LanguageContext.tsx`, `src/context/ThemeContext.tsx`, `src/hooks/useStatementImports.ts`. These need fixing on `dev`.
- Vite warns that some chunks exceed 500 kB. This is a performance warning, not a failure.
- Local `main` is 4 commits ahead of `origin/main`. Those commits have not been pushed.

## Safety rules

- Never commit `.env` or any `.env.*` file (except `.env.example`).
- Never paste service account keys, API secrets, or private keys into docs, commits, or chat.
- Never deploy to the `live` channel from `dev`.
- Never point staging writes at production Firestore or Auth.
