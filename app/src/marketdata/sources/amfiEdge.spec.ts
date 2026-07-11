import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAmfiEdge } from './amfiEdge'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchAmfiEdge', () => {
  it('maps the edge function response into a byIsin LiveMatch map', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ INF090I01PD7: { nav: 18.5719, date: '2026-07-02', name: 'Franklin India Equity Savings Fund' } })),
    )
    const map = await fetchAmfiEdge('https://edge.example/nav')
    expect(map?.INF090I01PD7?.nav).toBe(18.5719)
    expect(map?.INF090I01PD7?.source).toBe('AMFI')
    expect(map?.INF090I01PD7?.date?.toISOString().slice(0, 10)).toBe('2026-07-02')
  })

  it('skips entries with a non-finite or non-positive NAV', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ BAD1: { nav: 0, date: null, name: null }, BAD2: { nav: NaN, date: null, name: null } })))
    expect(await fetchAmfiEdge('https://edge.example/nav')).toBeNull()
  })

  it('returns null when the endpoint is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await fetchAmfiEdge('https://edge.example/nav')).toBeNull()
  })

  it('returns null for an empty map', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({})))
    expect(await fetchAmfiEdge('https://edge.example/nav')).toBeNull()
  })
})
