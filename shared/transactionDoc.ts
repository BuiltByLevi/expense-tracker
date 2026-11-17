/** The fields an expense and an income entry share — everything stored. */
export interface TransactionFields {
  amount: number;
  category: string;
  description: string;
  date: Date;
  source?: 'manual' | 'import' | 'recurring';
  recurringId?: string;
  importId?: string;
  originalNarration?: string;
  referenceNumber?: string;
}

/**
 * The Firestore document for an expense or income entry, owned by `uid`.
 * Firestore rejects explicit `undefined`, so optional traceability fields
 * are only present when set. Field names and types match firestore.rules
 * (validTransaction) exactly — `userid` is what the ownership rule checks.
 */
export function toTransactionDoc(entry: TransactionFields, uid: string) {
  return {
    amount: entry.amount,
    category: entry.category,
    description: entry.description,
    userid: uid,
    date: entry.date.toISOString(),
    ...(entry.source !== undefined && { source: entry.source }),
    ...(entry.importId !== undefined && { importId: entry.importId }),
    ...(entry.originalNarration !== undefined && { originalNarration: entry.originalNarration }),
    ...(entry.referenceNumber !== undefined && { referenceNumber: entry.referenceNumber }),
    ...(entry.recurringId !== undefined && { recurringId: entry.recurringId }),
  };
}

export type TransactionDoc = ReturnType<typeof toTransactionDoc>;

/** A stored document read back into the app's shape. The date comes back as
 *  the same instant that was written, so it lands on the same local calendar
 *  day (and month) it was imported under. */
export function fromTransactionDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    amount: data.amount as number,
    category: data.category as string,
    description: data.description as string,
    date: new Date(data.date as string),
    userId: data.userid as string,
    source: data.source as TransactionFields['source'],
    importId: data.importId as string | undefined,
    originalNarration: data.originalNarration as string | undefined,
    referenceNumber: data.referenceNumber as string | undefined,
    recurringId: data.recurringId as string | undefined,
  };
}
