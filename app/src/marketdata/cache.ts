// Generic TTL memoizer, ported from the prototype's `_amfiCache` pattern
// (180s TTL for the AMFI map; `force` bypasses it for the Refresh button).
// On a failed refetch (producer resolves null/falsy) the *last known-good*
// value is left untouched but this call still returns null — the caller
// (resolve.ts) falls through to the next NAV source rather than silently
// reusing stale data past its TTL.
export interface TtlCache<T> {
  get(force?: boolean): Promise<T | null>
}

export function createTtlCache<T>(
  producer: () => Promise<T | null>,
  ttlMs: number,
  now: () => number = Date.now,
): TtlCache<T> {
  let cached: T | null = null
  let ts = 0
  return {
    async get(force = false): Promise<T | null> {
      if (!force && cached && now() - ts < ttlMs) return cached
      const value = await producer()
      if (!value) return null
      cached = value
      ts = now()
      return cached
    },
  }
}
