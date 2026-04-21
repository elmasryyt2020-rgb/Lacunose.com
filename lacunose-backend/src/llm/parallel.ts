/**
 * Thin wrapper around `p-limit` for bounded-concurrency fan-out.
 *
 * Used by the gap engine to parallelize per-chunk map calls without
 * stampeding a single provider's rate limit.
 */
import pLimit from 'p-limit';

/**
 * Run `fn` over every item with at most `concurrency` in flight at once.
 * Preserves input order in the returned array.
 *
 * Errors bubble up: the first rejection aborts the aggregate (via Promise.all
 * semantics). If you need per-item error isolation, wrap `fn` with a try/catch
 * at the call site.
 */
export async function parallelMap<A, B>(
  items: A[],
  fn: (item: A, index: number) => Promise<B>,
  opts: { concurrency: number; onProgress?: (done: number, total: number) => void },
): Promise<B[]> {
  if (opts.concurrency <= 0) throw new Error('parallelMap: concurrency must be > 0');
  const limit = pLimit(opts.concurrency);
  const total = items.length;
  let done = 0;

  const tasks = items.map((item, index) =>
    limit(async () => {
      const result = await fn(item, index);
      done += 1;
      if (opts.onProgress) opts.onProgress(done, total);
      return result;
    }),
  );
  return Promise.all(tasks);
}
