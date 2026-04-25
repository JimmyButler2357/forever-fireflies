// Signed URL cache for photos stored in Supabase private buckets.
//
// Why this exists: Supabase signed URLs are one-hour access tickets. Without
// a cache we'd re-issue a URL for every child avatar on every Home screen
// mount — wasted network calls. Without a TTL (and a focus-based refresh at
// the call site) an idle app would hold expired URLs and silently 403 on the
// next render.
//
// Think of it like a wallet full of timed concert tickets: the first time
// you want to get in you buy the ticket, then you keep it in your wallet
// until it's almost expired. When it's about to expire you get a fresh one.
//
// Shape: a module-level Map keyed by storage path. Values carry the URL and
// the timestamp it goes stale at. 50-minute TTL sits 10 minutes below the
// 1-hour signed-URL expiry so we never hand out a URL that could 403 during
// its natural use window.
//
// Scope: this cache is in-memory only. It's cleared on app cold start, which
// is fine — cold start is already re-fetching everything anyway.

const DEFAULT_TTL_MS = 50 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

/**
 * UI-state for a photo that may or may not have a signed URL yet.
 * Discriminated union so components can render each case safely.
 *
 * - `'none'`   — the record has no `photoPath` (fall back to initials/placeholder)
 * - `'loading'` — URL fetch is in flight (show skeleton / spinner)
 * - `'loaded'` — URL is ready (render the Image)
 * - `'error'`  — URL fetch failed (show initials + retry affordance)
 */
export type PhotoState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'loaded'; url: string }
  | { status: 'error' };

const cache = new Map<string, CacheEntry>();

/**
 * Return a signed URL for a storage path, using a cached value if it's
 * still fresh. The first caller for a given path pays the network cost;
 * subsequent callers within the TTL window get the cached URL instantly.
 *
 * @param storagePath - The bucket-relative path (e.g. `family123/child456.jpg`)
 * @param fetcher - Function that produces a fresh signed URL for the path.
 *                  Passed in so this module stays decoupled from storageService.
 * @param ttlMs - How long to trust a fetched URL before refetching. Defaults
 *                to 50 minutes — under the 1-hour Supabase expiry.
 */
export async function getCachedPhotoUrl(
  storagePath: string,
  fetcher: (path: string) => Promise<string>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<string> {
  const now = Date.now();
  const cached = cache.get(storagePath);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const url = await fetcher(storagePath);
  cache.set(storagePath, { url, expiresAt: now + ttlMs });
  return url;
}

/**
 * Drop a cached URL — call this when the underlying file changes or is
 * deleted. The next `getCachedPhotoUrl` for this path will refetch.
 */
export function invalidatePhotoUrl(storagePath: string): void {
  cache.delete(storagePath);
}

/**
 * Clear the entire cache. Useful on sign-out so the next signed-in user
 * doesn't briefly see stale URLs bound to the previous session.
 */
export function clearPhotoUrlCache(): void {
  cache.clear();
}
