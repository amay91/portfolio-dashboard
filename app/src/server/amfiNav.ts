import { fetchAmfi, parseAmfi } from '../marketdata/sources/amfi'

export interface AmfiNavRecord {
  nav: number
  date: string | null
  name: string | null
}
export type AmfiNavMap = Record<string, AmfiNavRecord>

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  // AMFI republishes NAVAll.txt once per trading day after market close, so
  // a day-long shared cache means every visitor rides the same fetch
  // instead of hitting AMFI per user (task N2's whole point).
  'Cache-Control': 'public, max-age=86400',
}

// The N2 edge function: fetches+parses AMFI's NAVAll.txt (reusing the exact
// same fetchAmfi()/parseAmfi() the browser client already uses and already
// tests — including the O<->0 ISIN fold) and serves it as a small,
// CORS-enabled ISIN->{nav,date,name} map. Written as a plain Web-standard
// `(Request) => Promise<Response>` handler with no platform-specific
// imports, so it runs unmodified on Cloudflare Workers, Vercel Edge
// Functions, Deno Deploy, or Netlify Edge — which platform to actually
// deploy it on is task D1's decision, not this one's.
export async function handleAmfiNav(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: CORS_HEADERS })

  const txt = await fetchAmfi()
  if (!txt) return new Response(JSON.stringify({ error: 'AMFI unreachable or returned an unrecognisable response' }), { status: 502, headers: CORS_HEADERS })

  const { byIsin } = parseAmfi(txt)
  const map: AmfiNavMap = {}
  for (const [isin, rec] of Object.entries(byIsin)) {
    map[isin] = { nav: rec.nav, date: rec.date ? rec.date.toISOString().slice(0, 10) : null, name: rec.name ?? null }
  }
  return new Response(JSON.stringify(map), { status: 200, headers: CORS_HEADERS })
}
