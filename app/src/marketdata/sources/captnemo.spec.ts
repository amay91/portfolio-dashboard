import { afterEach, describe, expect, it, vi } from 'vitest'
import { captnemoByIsin } from './captnemo'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('captnemoByIsin', () => {
  it('returns null for an empty ISIN without making a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const r = await captnemoByIsin('')
    expect(r).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('parses a successful response into a LiveMatch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ ISIN: 'INF090I01PD7', name: 'Franklin India Equity Savings Fund', nav: 18.6453, date: '2026-07-02' }),
      ),
    )
    const r = await captnemoByIsin('INF090I01PD7')
    expect(r).toEqual({
      nav: 18.6453,
      date: new Date(Date.UTC(2026, 6, 2)),
      source: 'mf.captnemo.in',
      name: 'Franklin India Equity Savings Fund',
    })
  })

  it('falls back to the O->0 folded ISIN when the raw spelling 404s as invalid', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('INF109K016O4')) return Promise.resolve(jsonResponse({ error: 'Invalid ISIN' }))
      if (url.includes('INF109K01604')) return Promise.resolve(jsonResponse({ nav: 39.2108, date: '2026-07-02', name: 'ICICI Prudential Arbitrage Fund' }))
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await captnemoByIsin('INF109K016O4')
    expect(r?.nav).toBe(39.2108)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null when every candidate spelling fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Invalid ISIN' })))
    const r = await captnemoByIsin('INF109K016O4')
    expect(r).toBeNull()
  })
})
