// Shared HTTP helpers for the market-data layer. Every fetch has a timeout
// (AbortController) and fails soft (returns null rather than throwing) —
// the whole live-NAV pipeline is built to degrade gracefully to statement
// NAVs, never to surface a network error to the user.

export async function fetchText(url: string, ms?: number): Promise<string | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms || 12000)
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' })
    if (!r.ok) return null
    return await r.text()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export async function fetchJSON<T = unknown>(url: string, ms?: number): Promise<T | null> {
  const txt = await fetchText(url, ms)
  if (!txt) return null
  try {
    return JSON.parse(txt) as T
  } catch {
    return null
  }
}
