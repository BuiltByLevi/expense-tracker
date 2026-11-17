# Testing

The project has three test layers. Only one of them needs anything beyond Node and Python.

| Layer | Command | Needs | Runs by default |
|---|---|---|---|
| TypeScript unit and integration tests (Vitest) | `npm test` | Node | Yes |
| Python independent checks (stdlib `unittest`) | `python3 -I -m unittest discover -s python_tests -p "test_*.py"` | Python 3 | Yes |
| Firestore emulator tests | `npm run test:emulator` | JDK 21+, Firebase CLI | No. Requires JDK 21. |

## TypeScript (Vitest)

`npm test` runs every `*.test.ts(x)` file under `src/`, `shared/` and
`mobile/src/`. Some files skip themselves unless an environment variable is set:

- `src/utils/firestoreEmulator.test.ts`: needs `FIRESTORE_EMULATOR_HOST`. Only `npm run test:emulator` sets it.
- `shared/testFixtures/generateStatementFiles.test.ts`: only when `REGENERATE_STATEMENT_FIXTURES=1`. It rewrites the fixture files, so it is never run by default.
- `shared/transferAudit.report.test.ts`: only when `TRANSFER_AUDIT_INPUT` and `TRANSFER_AUDIT_OUTPUT` are set. See `docs/TRANSFER_AUDIT.md`.

Type checks and build:

```bash
npx tsc -b                 # web
(cd mobile && npx tsc --noEmit)   # Expo
npm run build              # production build
```

## Python (independent checks)

Location: `python_tests/`. These are an independent second reading of the
synthetic fixtures in `shared/testFixtures/statements/`. They use only the
Python standard library, so nothing needs installing.

```bash
python3 -I -m unittest discover -s python_tests -p "test_*.py" -v
```

| File | What it checks | Limit |
|---|---|---|
| `test_statement_parsing.py` | Reads the three CSV layouts; row counts, totals, balances | Reads the CSV itself; does not call the app's parser |
| `test_accounting.py` | The seven accounting figures for the fixture | Own categoriser; does not call the app's classifier |
| `test_duplicates.py` | Fixture satisfies the duplicate rules | Python specification only; does not test the app's matcher |
| `test_dates.py` | Day-first reading, month-first detection, noon-UTC anchor | Python implementation of the rules; does not call `normalize.ts` |
| `test_currency.py` | Exact paise arithmetic; why float is avoided | Python `Decimal`; does not call `shared/money.ts` |
| `test_firestore_rules_static.py` | Static text checks on `firestore.rules` (no wildcard allow, every allow requires sign-in, updates cannot change owner) | Reads text only. It does not evaluate the rules. |

**Important:** the Python tests do not replace the TypeScript tests. A bug in
the app's parser, classifier, matcher, date code or money code would not fail
any Python test. Treat them as a check that the fixtures and the stated rules
agree with an independent reading. Their module docstrings say what each one covers.

## Firestore emulator (needs JDK 21)

`npm run test:emulator` starts the Firestore and Auth emulators with project
`demo-expense-tracker` and runs `src/utils/firestoreEmulator.test.ts` against
them. The `demo-` project id is never routed to a real Firebase project, and
the tests connect only to localhost.

Requirements:
- JDK 21 or newer. firebase-tools 15.34.1 refuses to start on JDK 17.
- Run it with JDK 21 selected, for example:
  `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home npm run test:emulator`

Status: **not run in this environment**. JDK 21 is not installed. The
emulator tests are the only tests that check the Firestore security rules at run time.

## Still outstanding

- Firestore emulator suite (needs JDK 21).
- Browser UI tests for the import flow and the accounting cards.
- Expo runtime tests on a device or simulator. Expo is type-checked only.
- A cross-check that compares the app's own figures with the Python figures
  (for example, a Vitest test that writes its results to JSON and a Python test
  that compares them). Not built yet.
