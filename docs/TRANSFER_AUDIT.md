# Transfers audit (read-only)

Finds expenses categorised as **Transfers** and groups them so you can decide
what to change. It never edits, deletes or relabels a record. Only you can
decide to change anything, and no historical change has been made.

## Groups

| Group | Meaning | Proposed action |
|---|---|---|
| Appears internal | Own-account wording (`INTERNAL TRANSFER`, `SELF TRANSFER`, `OWN A/C`, `SWEEP`) | Keep as Transfers (excluded from spending) |
| Appears external vendor/person | A payment rail (NEFT/IMPS/RTGS/UPI) with at least two counterparty words and no own-account wording | Relabel to Other (counts as spending). Review first. |
| Ambiguous | Neither pattern is clear | Review each one manually |
| Entered by hand | `source` is `manual` or missing | Never changed by this audit |

The classifier is a pattern check on the bank narration. It is a suggestion,
not a verdict. Read each group before acting.

## Input format

A JSON array of expense records, one object per record:

```json
[
  {
    "id": "abc123",
    "amount": 3500,
    "category": "Transfers",
    "date": "2026-11-18",
    "source": "import",
    "originalNarration": "NEFT-N322260000777777-SUNRISE ENTERPRISES"
  }
]
```

- `id`: the Firestore document ID.
- `amount`: number, in rupees.
- `category`: the stored category.
- `date`: ISO date string.
- `source`: `import`, `manual` or `recurring`. Missing counts as manual.
- `description` / `originalNarration`: the bank narration, if stored.

Check the field names against one real document before exporting. Stored
Firestore field names can differ (for example `userid` for the owner), so map
them to the names above.

## Export your own records (not tested)

The app has no export feature, and this repo does not contain a verified
export script. You need to choose an export method that:

1. Returns **only documents where the owner is your own user ID**. The
   Firestore rules already restrict the signed-in client to your records, so
   a client-side query is the safe route.
2. Does **not** use the Firebase Admin SDK or a service account. Those bypass
   the rules and can read every user's financial records.
3. Writes the output to a file **outside this repository**.

Do not paste your export into a chat, a ticket or a shared document.

## Run the audit locally

From the repository root, with your export saved outside the repo:

```bash
TRANSFER_AUDIT_INPUT="$HOME/audit/transfers-export.json" \
TRANSFER_AUDIT_OUTPUT="$HOME/audit/transfers-report.md" \
npx vitest run shared/transferAudit.report.test.ts
```

- Without both variables the test is skipped, so the normal suite never reads
  any file.
- The input is read but never written.
- The only file written is the Markdown report at `TRANSFER_AUDIT_OUTPUT`.
- The report lists the count and total amount for each group, plus the
  proposed action.

## After the audit

1. Read the report. Check the "external vendor" group first, because those
   records are the ones that have dropped out of Monthly Expenses since the
   accounting change.
2. Note any record you want changed, by ID.
3. Ask for the change explicitly. Nothing is relabelled without your approval.
