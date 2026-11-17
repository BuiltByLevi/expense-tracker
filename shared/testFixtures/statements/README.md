# Synthetic bank statement fixtures

Permanent regression fixtures for the bank statement import. Every file here is
**synthetic**: the account number is masked, the names are invented, and the
amounts and dates are made up. None of it is a real person's financial data.

All six files describe the same one-month statement (November 2026, 16 rows,
opening ₹10,000.00, closing ₹61,866.50) from `shared/testFixtures/statementFixture.ts`:

| File | Layout |
| --- | --- |
| `november-2026-separate-columns.csv` | Withdrawal and Deposit columns, with balance and total lines |
| `november-2026-single-amount-drcr.csv` | One Amount column with a Dr/Cr marker |
| `november-2026-signed-amount.csv` | One signed Amount column (debits negative) |
| `november-2026-bank-export.xlsx` | Excel 2007+ with real date and number cells |
| `november-2026-bank-export.xls` | Legacy Excel (BIFF8) with real date and number cells |
| `november-2026-statement.pdf` | Text-based PDF, two pages, Withdrawal / Deposit / Balance columns |

`shared/statementFiles.test.ts` reads each file from disk through the production
parser for its format and checks it against the fixture: every row's type and
amount, every narration, and the reconciled opening/closing balance.

## Regenerating

The files are generated from the fixture code. Regenerate only when the fixture
itself changes, then review the diff:

    REGENERATE_STATEMENT_FIXTURES=1 npx vitest run shared/testFixtures/generateStatementFiles.test.ts

Normal test runs never rewrite these files.
