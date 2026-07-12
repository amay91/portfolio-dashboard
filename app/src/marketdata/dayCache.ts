import type { LiveMatch, LiveRow } from '../engine/harmonise'

// N4: persists the AMFI bulk NAV map across page reloads (not just within one
// tab session, which the in-memory `amfiCache` TTL in resolve.ts already
// covers) so a same-day reload skips the network fetch entirely. Scoped
// deliberately to the AMFI tier only — the single largest, statement-
// independent bulk resource (~18,500 ISINs in one response) — not the
// per-fund captnemo/mfapi gap-rescue tiers, which are scoped to whatever's
// currently held and already fast; see tasks.md N4's own framing, "persist
// THE DAY'S NAV MAP" (singular), not a general fetch-memoization overhaul.
export interface DayCachedAmfiMap {
  day: string
  byIsin: Record<string, LiveMatch>
  byName: Record<string, LiveMatch>
  rows: LiveRow[]
}

// The storage seam tests inject a fake for — jsdom (this project's Vitest
// environment) has no real `indexedDB`, so exercising the actual day-
// boundary/round-trip logic needs something other than the real browser API.
// Production code never passes a store explicitly; it gets the real-
// IndexedDB-backed one below.
export interface DayCacheStore {
  get(): Promise<DayCachedAmfiMap | undefined>
  set(record: DayCachedAmfiMap): Promise<void>
}

const DB_NAME = 'portfolio-dashboard'
const STORE_NAME = 'amfi-nav-cache'
const RECORD_KEY = 'amfi-map'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Real IndexedDB, used in production. Every failure mode (IndexedDB missing
// entirely — old browser, some privacy modes; blocked/quota-exceeded; a
// mid-transaction error) is swallowed by the caller, not here — see
// getDayCachedAmfiMap/setDayCachedAmfiMap below — so a broken cache never
// blocks the actual NAV fetch it exists to skip.
const realStore: DayCacheStore = {
  async get() {
    const db = await openDb()
    try {
      return await new Promise<DayCachedAmfiMap | undefined>((resolve, reject) => {
        const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(RECORD_KEY)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    } finally {
      db.close()
    }
  },
  async set(record) {
    const db = await openDb()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(record, RECORD_KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  },
}

// Local calendar day (not UTC) — AMFI publishes once/day after Indian
// market close, so "today" means the browser's own local day, matching
// when a user would actually expect fresh data to show up.
function todayKey(now: () => number): string {
  const d = new Date(now())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface AmfiTierMap {
  byIsin: Record<string, LiveMatch>
  byName: Record<string, LiveMatch>
  rows: LiveRow[]
}

export async function getDayCachedAmfiMap(store: DayCacheStore = realStore, now: () => number = Date.now): Promise<AmfiTierMap | null> {
  try {
    const record = await store.get()
    if (!record || record.day !== todayKey(now)) return null
    return { byIsin: record.byIsin, byName: record.byName, rows: record.rows }
  } catch {
    return null // cache unavailable/broken — the caller falls through to a real fetch
  }
}

export async function setDayCachedAmfiMap(map: AmfiTierMap, store: DayCacheStore = realStore, now: () => number = Date.now): Promise<void> {
  try {
    await store.set({ day: todayKey(now), byIsin: map.byIsin, byName: map.byName, rows: map.rows || [] })
  } catch {
    // best-effort only — a failed write just means the next reload refetches
  }
}
