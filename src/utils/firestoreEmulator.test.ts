import { beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut, type Auth } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDocs, getFirestore, query, setDoc, where, writeBatch, type Firestore } from 'firebase/firestore';
import { addTransactionDocs } from './firestoreBulk';
import { BulkWriteError } from '../../shared/bulkWrite';
import { parseCsvText } from '../../shared/statementParsers/csvParser';
import { buildReviewTransactions } from '../../shared/statementReview';
import { executeImport, planImport } from '../../shared/statementImport';
import { fromTransactionDoc, toTransactionDoc, type TransactionFields } from '../../shared/transactionDoc';
import { resolveMonthlyEarnings } from '../../shared/earningsResolution';
import { makeCashFlowLookup } from '../../shared/cashFlowLookup';
import { computeFinanceTotals } from '../../shared/finance';
import { entriesForMonth } from '../../shared/monthFilter';
import { EXPECTED, separateColumnsCsv } from '../../shared/testFixtures/statementFixture';
import type { Expense, Income } from '../../shared/types';

/**
 * Runs the import's real Firestore writes and reads against the LOCAL
 * Firebase emulator with the project's actual firestore.rules.
 *
 *   npm run test:emulator
 *
 * Skipped in the normal test run. It can only ever talk to the emulator:
 * the project id is a "demo-" id (which Firebase never routes to a real
 * project) and both SDKs are connected to localhost before any call.
 */
const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;
const suite = EMULATOR ? describe : describe.skip;

suite('statement import against the Firestore emulator and the real security rules', () => {
  let app: FirebaseApp;
  let auth: Auth;
  let db: Firestore;
  const run = Date.now();

  const signInAs = async (name: string) => {
    await signOut(auth);
    const { user } = await createUserWithEmailAndPassword(auth, `${name}-${run}-${Math.random().toString(36).slice(2)}@example.test`, 'not-a-real-password');
    return user.uid;
  };

  const writersFor = (uid: string) => {
    const add = (name: 'expenses' | 'income') => async (records: TransactionFields[]) => {
      const result = await addTransactionDocs(db, name, uid, records);
      if (result.failed > 0) throw new BulkWriteError(result);
    };
    return { addExpenses: add('expenses'), addIncomes: add('income') };
  };

  const read = async <T,>(name: 'expenses' | 'income', uid: string): Promise<T[]> => {
    const snapshot = await getDocs(query(collection(db, name), where('userid', '==', uid)));
    return snapshot.docs.map((d) => fromTransactionDoc(d.id, d.data()) as T);
  };

  const importCsv = async (uid: string, text: string) => {
    const result = parseCsvText(text);
    if ('error' in result) throw new Error(result.error.message);
    const review = buildReviewTransactions(result.transactions, await read<Expense>('expenses', uid), await read<Income>('income', uid));
    return executeImport(planImport(review, `import-${run}`), writersFor(uid));
  };

  beforeAll(async () => {
    app = initializeApp({ projectId: 'demo-expense-tracker', apiKey: 'emulator-only' }, `emulator-${run}`);
    auth = getAuth(app);
    db = getFirestore(app);
    const [host, port] = (EMULATOR as string).split(':');
    connectFirestoreEmulator(db, host, Number(port));
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`, { disableWarnings: true });
    return async () => { await deleteApp(app); };
  });

  it('saves the 16-row statement, reads it back, and the month figures reconcile', async () => {
    const uid = await signInAs('owner');
    const outcome = await importCsv(uid, separateColumnsCsv());
    expect(outcome).toMatchObject({ imported: 16, expensesImported: 8, incomeImported: 8, failed: 0, status: 'completed' });

    const expenses = await read<Expense>('expenses', uid);
    const income = await read<Income>('income', uid);
    expect(expenses).toHaveLength(8);
    expect(income).toHaveLength(8);
    expect([...expenses, ...income].every((r) => r.userId === uid && r.source === 'import')).toBe(true);

    const incomeFor = (y: number, m: number) => entriesForMonth(income, y, m);
    expect(incomeFor(2026, 10).total).toBe(EXPECTED.creditTotal);
    expect(entriesForMonth(expenses, 2026, 10).total).toBe(EXPECTED.debitTotal);
    expect(resolveMonthlyEarnings(2026, 10, incomeFor(2026, 10).entries, null)!.amount).toBe(EXPECTED.monthlyEarnings);
    const totals = computeFinanceTotals(expenses, income, 0, makeCashFlowLookup(incomeFor, () => null), 2026, 10);
    const november = totals.monthlySummaries.find((s) => s.year === 2026 && s.month === 10)!;
    expect(november.spent).toBe(EXPECTED.monthlyExpenses);
    expect(november.monthBalance).toBe(EXPECTED.netCashFlow);

    // Importing the same file again writes nothing.
    const again = await importCsv(uid, separateColumnsCsv());
    expect(again).toMatchObject({ imported: 0, failed: 0, notSelected: 16 });
    expect(await read('expenses', uid)).toHaveLength(8);
    expect(await read('income', uid)).toHaveLength(8);
  });

  it('writes more than 500 rows across several batches', async () => {
    const uid = await signInAs('bulk');
    const rows = Array.from({ length: 1203 }, (_, i) => `1${i % 9}/11/2026,UPI/SHOP NUMBER ${i},${i + 1}.00,`);
    const outcome = await importCsv(uid, ['Date,Narration,Debit,Credit', ...rows].join('\n'));
    expect(outcome).toMatchObject({ imported: 1203, failed: 0, status: 'completed' });
    expect(await read('expenses', uid)).toHaveLength(1203);
  }, 60_000);

  it('the rules reject a batch as a whole, and the result reports every row in it as unsaved', async () => {
    const uid = await signInAs('rules');
    const good: TransactionFields = { amount: 10, category: 'Other', description: 'ok', date: new Date(2026, 10, 1) };
    const tooLong: TransactionFields = { ...good, description: 'x'.repeat(501) };
    const result = await addTransactionDocs(db, 'expenses', uid, [good, tooLong, good]);
    expect(result).toMatchObject({ written: 0, failed: 3 });
    expect(await read('expenses', uid)).toHaveLength(0);

    // ...which is why the import trims text to the rules' limits before writing.
    const outcome = await importCsv(uid, `Date,Narration,Debit,Credit\n10/11/2026,UPI/${'LONG NAME '.repeat(120)},50.00,\n11/11/2026,UPI/NORMAL,60.00,`);
    expect(outcome).toMatchObject({ imported: 2, failed: 0 });
  });

  it('one user can neither read nor write another user\'s records', async () => {
    const owner = await signInAs('alice');
    await importCsv(owner, separateColumnsCsv());

    const intruder = await signInAs('mallory');
    await expect(getDocs(query(collection(db, 'income'), where('userid', '==', owner)))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(getDocs(collection(db, 'expenses'))).rejects.toMatchObject({ code: 'permission-denied' });
    const forged = toTransactionDoc({ amount: 1, category: 'Other', description: 'forged', date: new Date(2026, 10, 1) }, owner);
    await expect(setDoc(doc(collection(db, 'expenses')), forged)).rejects.toMatchObject({ code: 'permission-denied' });
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'income')), forged);
    await expect(batch.commit()).rejects.toMatchObject({ code: 'permission-denied' });
    expect(await read('expenses', intruder)).toHaveLength(0);
  });

  it('a signed-out client cannot write at all', async () => {
    await signOut(auth);
    const result = await addTransactionDocs(db, 'expenses', 'nobody', [{ amount: 1, category: 'Other', description: 'x', date: new Date(2026, 10, 1) }]);
    expect(result).toMatchObject({ written: 0, failed: 1 });
  });
});
