import { describe, expect, it } from 'vitest'
import { getDayCachedAmfiMap, setDayCachedAmfiMap } from './dayCache'
import type { DayCacheStore, DayCachedAmfiMap } from './dayCache'
import type { LiveMatch } from '../engine/harmonise'

// In-memory fake store — jsdom (this project's Vitest environment) has no
// real `indexedDB`, so this is how the actual day-boundary/round-trip logic
// gets exercised at all; see dayCache.ts's own comment on the storage seam.
function fakeStore(initial?: DayCachedAmfiMap): DayCacheStore {
  let record = initial
  return {
    async get() {
      return record
    },
    async set(r) {
      record = r
    },
  }
}

function match(nav: number): LiveMatch {
  return { nav, date: new Date('2026-07-11'), source: 'AMFI', name: 'Test Fund' }
}

describe('getDayCachedAmfiMap / setDayCachedAmfiMap', () => {
  it('returns null when the store is empty', async () => {
    const store = fakeStore()
    expect(await getDayCachedAmfiMap(store)).toBeNull()
  })

  it('round-trips a map written earlier the same day', async () => {
    const store = fakeStore()
    const now = () => +new Date('2026-07-11T10:00:00')
    await setDayCachedAmfiMap({ byIsin: { INF001: match(100) }, byName: {}, rows: [] }, store, now)
    const got = await getDayCachedAmfiMap(store, now)
    expect(got?.byIsin.INF001.nav).toBe(100)
  })

  it('a later same-day read (different time of day) still hits the cache', async () => {
    const store = fakeStore()
    await setDayCachedAmfiMap({ byIsin: { INF001: match(100) }, byName: {}, rows: [] }, store, () => +new Date('2026-07-11T09:00:00'))
    const got = await getDayCachedAmfiMap(store, () => +new Date('2026-07-11T23:59:00'))
    expect(got?.byIsin.INF001.nav).toBe(100)
  })

  it('a read on the next calendar day misses the cache — N4\'s "day" boundary', async () => {
    const store = fakeStore()
    await setDayCachedAmfiMap({ byIsin: { INF001: match(100) }, byName: {}, rows: [] }, store, () => +new Date('2026-07-11T23:00:00'))
    const got = await getDayCachedAmfiMap(store, () => +new Date('2026-07-12T00:01:00'))
    expect(got).toBeNull()
  })

  it('preserves Date objects on liveMatch.date through a round-trip (structured-clone, not JSON)', async () => {
    const store = fakeStore()
    const now = () => +new Date('2026-07-11T10:00:00')
    await setDayCachedAmfiMap({ byIsin: { INF001: match(100) }, byName: {}, rows: [] }, store, now)
    const got = await getDayCachedAmfiMap(store, now)
    expect(got?.byIsin.INF001.date).toBeInstanceOf(Date)
  })

  it('a store that throws (IndexedDB unavailable/broken) fails open to null rather than throwing', async () => {
    const brokenStore: DayCacheStore = {
      get: () => Promise.reject(new Error('IndexedDB unavailable')),
      set: () => Promise.reject(new Error('IndexedDB unavailable')),
    }
    await expect(getDayCachedAmfiMap(brokenStore)).resolves.toBeNull()
    await expect(setDayCachedAmfiMap({ byIsin: {}, byName: {}, rows: [] }, brokenStore)).resolves.toBeUndefined()
  })

  it('falls back to real indexedDB when no store is injected — inert (returns null, does not throw) in this jsdom test environment, which has no real indexedDB', async () => {
    await expect(getDayCachedAmfiMap()).resolves.toBeNull()
  })
})
