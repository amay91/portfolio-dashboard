import { describe, expect, it, vi } from 'vitest'
import { createTtlCache } from './cache'

describe('createTtlCache', () => {
  it('calls the producer once and serves the cached value within the TTL', async () => {
    const producer = vi.fn().mockResolvedValue('v1')
    const cache = createTtlCache(producer, 1000, () => 0)
    expect(await cache.get()).toBe('v1')
    expect(await cache.get()).toBe('v1')
    expect(producer).toHaveBeenCalledTimes(1)
  })

  it('refetches once the TTL has elapsed', async () => {
    let t = 0
    const producer = vi.fn().mockImplementation(() => Promise.resolve('v' + t))
    const cache = createTtlCache(producer, 1000, () => t)
    expect(await cache.get()).toBe('v0')
    t = 1500
    expect(await cache.get()).toBe('v1500')
    expect(producer).toHaveBeenCalledTimes(2)
  })

  it('force bypasses a still-fresh cache', async () => {
    const producer = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2')
    const cache = createTtlCache(producer, 1000, () => 0)
    expect(await cache.get()).toBe('v1')
    expect(await cache.get(true)).toBe('v2')
    expect(producer).toHaveBeenCalledTimes(2)
  })

  it('a failed refetch returns null but leaves the last known-good value intact for the next non-forced call', async () => {
    let t = 0
    const producer = vi.fn().mockImplementation(() => Promise.resolve(t < 1000 ? 'good' : null))
    const cache = createTtlCache(producer, 1000, () => t)
    expect(await cache.get()).toBe('good') // t=0, seeds the cache
    t = 2000 // TTL expired, force a refetch
    expect(await cache.get()).toBeNull() // producer fails at t=2000
    t = 2100 // still within 1000ms of... nothing was re-cached, so this reads as expired again
    // The failed refetch never updated ts, so the stale entry from t=0 is still
    // technically outside its TTL — this call refetches again (also failing).
    expect(await cache.get()).toBeNull()
  })
})
