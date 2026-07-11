import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleAmfiNav } from './amfiNav'

const REAL_ROWS = [
  'Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date',
  '',
  'Open Ended Schemes(Debt Scheme - Liquid Fund)',
  '',
  '120198;INF109K016O4;-;ICICI Prudential Arbitrage Fund - Direct Plan - Growth;39.2108;02-Jul-2026',
  '120199;N.A.;-;Some Suspended Scheme - Direct Plan - Growth;N.A.;02-Jul-2026',
].join('\n')
// looksLikeAmfi() (inside fetchAmfi) requires >50000 chars — a real NAVAll.txt
// easily clears that; pad with a line parseAmfi skips (no ';') to match shape.
const SAMPLE = REAL_ROWS + '\n' + 'x'.repeat(60000)

function jsonBody(res: Response) {
  return res.text().then((t) => JSON.parse(t))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('handleAmfiNav', () => {
  it('serves a CORS-enabled ISIN->{nav,date,name} map, folding O->0 the same way the client parser does', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(SAMPLE, { status: 200 })))
    const res = await handleAmfiNav(new Request('https://example.test/amfi-nav'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Cache-Control')).toContain('max-age=86400')

    const map = await jsonBody(res)
    expect(map['INF109K016O4'].nav).toBe(39.2108)
    expect(map['INF109K01604'].nav).toBe(39.2108) // O folded to 0, same as parseAmfi()
    expect(map['INF109K016O4'].date).toBe('2026-07-02')
    expect(Object.values(map).some((r: any) => String(r.name).includes('Suspended'))).toBe(false)
  })

  it('answers CORS preflight with 204 and no body', async () => {
    const res = await handleAmfiNav(new Request('https://example.test/amfi-nav', { method: 'OPTIONS' }))
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('rejects methods other than GET/OPTIONS', async () => {
    const res = await handleAmfiNav(new Request('https://example.test/amfi-nav', { method: 'POST' }))
    expect(res.status).toBe(405)
  })

  it('returns a CORS-enabled 502 (not a thrown error) when AMFI is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const res = await handleAmfiNav(new Request('https://example.test/amfi-nav'))
    expect(res.status).toBe(502)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    const body = await jsonBody(res)
    expect(body.error).toBeTruthy()
  })

  it('returns 502 when AMFI responds with something too short/garbage to be the real file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>error</html>', { status: 200 })))
    const res = await handleAmfiNav(new Request('https://example.test/amfi-nav'))
    expect(res.status).toBe(502)
  })
})
