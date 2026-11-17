/** Firestore's hard cap on writes in one batch. */
export const BATCH_LIMIT = 500;

export interface BulkWriteResult {
  /** Items in batches that committed. */
  written: number;
  /** Items in batches that did not commit. */
  failed: number;
  /** Positions (in the original list) of the items that were not saved. */
  failedIndexes: number[];
  /** The first error hit, for logging. */
  error: unknown;
}

/** Thrown by the bulk add functions when some batches didn't commit. Carries
 *  exact counts so the caller can report "saved X, failed Y" instead of
 *  guessing all-or-nothing. */
export class BulkWriteError extends Error {
  result: BulkWriteResult;
  constructor(result: BulkWriteResult) {
    super(`Saved ${result.written} of ${result.written + result.failed} records`);
    this.name = 'BulkWriteError';
    this.result = result;
  }
}

/**
 * Commits items in batches of at most `limit`. Each batch is atomic; a batch
 * that fails is retried once (the caller's `commit` must be safe to repeat —
 * i.e. write to document ids chosen up front), and the remaining batches are
 * still attempted, so one bad batch can't sink the rest of an import.
 * Never throws: the result says exactly what was and wasn't saved.
 */
export async function commitInChunks<T>(
  items: T[],
  commit: (chunk: T[]) => Promise<void>,
  options: { limit?: number; retries?: number } = {}
): Promise<BulkWriteResult> {
  const limit = Math.max(1, Math.min(options.limit ?? BATCH_LIMIT, BATCH_LIMIT));
  const retries = options.retries ?? 1;
  const result: BulkWriteResult = { written: 0, failed: 0, failedIndexes: [], error: null };

  for (let start = 0; start < items.length; start += limit) {
    const chunk = items.slice(start, start + limit);
    let saved = false;
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= retries && !saved; attempt++) {
      try {
        await commit(chunk);
        saved = true;
      } catch (error) {
        lastError = error;
      }
    }
    if (saved) {
      result.written += chunk.length;
    } else {
      result.failed += chunk.length;
      for (let i = 0; i < chunk.length; i++) result.failedIndexes.push(start + i);
      result.error = result.error ?? lastError;
    }
  }
  return result;
}

/** commitInChunks for callers that want an exception on any failure. */
export async function commitInChunksOrThrow<T>(
  items: T[],
  commit: (chunk: T[]) => Promise<void>,
  options: { limit?: number; retries?: number } = {}
): Promise<void> {
  const result = await commitInChunks(items, commit, options);
  if (result.failed > 0) throw new BulkWriteError(result);
}
