import { collection, doc, writeBatch, type Firestore } from 'firebase/firestore';
import { commitInChunks, type BulkWriteResult } from '../../shared/bulkWrite';
import { toTransactionDoc, type TransactionFields } from '../../shared/transactionDoc';

/**
 * Adds many expense or income documents for one user in Firestore batches
 * (500 writes max each). Document ids are chosen up front, so a batch that
 * is retried after an unclear failure overwrites the same documents instead
 * of adding copies. Never throws: the result says exactly how many were and
 * weren't saved.
 */
export function addTransactionDocs(
  db: Firestore,
  collectionName: 'expenses' | 'income',
  uid: string,
  entries: TransactionFields[]
): Promise<BulkWriteResult> {
  const writes = entries.map((entry) => ({ ref: doc(collection(db, collectionName)), data: toTransactionDoc(entry, uid) }));
  return commitInChunks(writes, async (chunk) => {
    const batch = writeBatch(db);
    for (const write of chunk) batch.set(write.ref, write.data);
    await batch.commit();
  });
}
