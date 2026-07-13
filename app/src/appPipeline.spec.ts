import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleConvertMarkitdown, handleFile, handleRefresh, handleSubmitPassword, loadSamplePortfolio, runPipeline } from './appPipeline'
import { initialPipelineState, pipelineReducer } from './appState'
import type { CurrentSource, PipelinePatch } from './appState'
import { parseStatement } from './parsing/cas/parse'

// The app's highest-risk previously-untested logic (review item C1): before
// this, App.tsx's orchestration (runPipeline/loadSamplePortfolio/handleFile/
// handleConvertMarkitdown) was exercised only indirectly, by 2 Playwright
// e2e tests. Extracting it into a plain module with an injectable `dispatch`
// and `fetchImpl` makes each transition directly testable here, with no
// browser and no real network.

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../tests/fixtures')
const readFixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')
const alok2026 = readFixture('alok_2026.txt')

// Applies every dispatched patch to a real reducer (same one App.tsx uses),
// so assertions read final, rendered-equivalent state rather than raw patch
// shapes — and records the patch sequence for tests that care about the
// transitions along the way, not just the destination.
function harness(seed = initialPipelineState) {
  let state = seed
  const patches: PipelinePatch[] = []
  const dispatch = (patch: PipelinePatch) => {
    patches.push(patch)
    state = pipelineReducer(state, patch)
  }
  return { dispatch, patches, getState: () => state }
}

function refOf(source: CurrentSource) {
  return { current: source }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runPipeline', () => {
  it('reports "no schemes" for a PDF source and also flags an extraction problem', async () => {
    const { dispatch, getState } = harness()
    await runPipeline(dispatch, [], null, 'Parsed x.pdf', undefined, true)
    const s = getState()
    expect(s.uploadPhase).toBe('idle')
    expect(s.extraction).toEqual({ ok: false, reasons: ['No schemes were found in this statement.'] })
    expect(s.status?.isErr).toBe(true)
    expect(s.status?.message).toContain('try “Convert PDF to Markdown” below')
  })

  it('reports "no schemes" for a non-PDF source without touching extraction (no Markdown escape hatch makes sense there)', async () => {
    // Seeded with a stale extraction value from an earlier PDF attempt —
    // the non-PDF "no schemes" path must leave it exactly as it was, not
    // silently null it out (that would hide the earlier PDF's problem, or
    // paper over it with an unrelated "ok" state).
    const seeded = pipelineReducer(initialPipelineState, { extraction: { ok: false, reasons: ['earlier pdf problem'] } })
    const { dispatch, getState } = harness(seeded)
    await runPipeline(dispatch, [], null, 'Parsed x.md', undefined, false)
    const s = getState()
    expect(s.uploadPhase).toBe('idle')
    expect(s.extraction).toEqual({ ok: false, reasons: ['earlier pdf problem'] })
    expect(s.status?.message).toBe('No schemes found. Is it a CAMS / KFintech consolidated statement?')
  })

  it('degrades to statement-NAV values (not an error message) when every live-NAV source is unreachable', async () => {
    // resolveLiveNavs/fetchNiftyBenchmark swallow their own network errors
    // and resolve with a "nothing found" result rather than rejecting — so
    // an unreachable network lands in the *success* branch of runPipeline's
    // try, with diag.reachable:false, not the outer catch. This is the same
    // scenario the "offline path" e2e test drives through the whole app;
    // this is the orchestration-level version of it.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unreachable')))
    const schemes = parseStatement(alok2026)
    const { dispatch, getState, patches } = harness()
    await runPipeline(dispatch, schemes, 'Alok Utsav', 'Parsed x.txt', undefined, false)
    const s = getState()
    expect(s.pf?.totalValue).toBeGreaterThan(0)
    expect(s.investorName).toBe('Alok Utsav')
    expect(s.diag?.reachable).toBe(false)
    expect(s.status).toBeNull() // cleared once the (unreachable) attempt resolves, not left as an error
    expect(s.uploadPhase).toBe('done')
    // Confirms this really did dispatch a "processing" phase first, not
    // just jump straight to the end state.
    expect(patches[0]).toEqual({ uploadPhase: 'processing' })
  })
})

describe('loadSamplePortfolio', () => {
  it('builds the dashboard from an injected fetchImpl, with no real network call', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('should not be called — only fetchImpl should be used for /sample.txt')))
    const fetchImpl = vi.fn().mockResolvedValue(new Response(alok2026))
    const { dispatch, getState } = harness()
    const ref = refOf({ kind: 'text', text: '', sourceIsPdf: false })
    await loadSamplePortfolio(dispatch, ref, undefined, fetchImpl)
    expect(fetchImpl).toHaveBeenCalledWith('/sample.txt')
    const s = getState()
    expect(s.isSample).toBe(true)
    expect(s.pf?.totalValue).toBeGreaterThan(0)
    expect(s.uploadPhase).toBe('idle') // demo path ends at 'idle', not 'done'
    expect(ref.current).toEqual({ kind: 'schemes', schemes: parseStatement(alok2026) })
  })

  it('reports a friendly error when the sample statement itself fails to load', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('404'))
    const { dispatch, getState } = harness()
    await loadSamplePortfolio(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), undefined, fetchImpl)
    const s = getState()
    expect(s.status).toEqual({ message: 'Could not load the sample statement.', isErr: true })
    expect(s.uploadPhase).toBe('idle') // no pf yet, so idle not done
  })

  it('falls back to "done" (not "idle") on a fetch failure if a dashboard was already showing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('404'))
    const seeded = pipelineReducer(initialPipelineState, { pf: { totalValue: 1 } as never })
    const { dispatch, getState } = harness(seeded)
    await loadSamplePortfolio(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), undefined, fetchImpl)
    expect(getState().uploadPhase).toBe('done')
  })
})

describe('handleFile', () => {
  it('rejects an unrecognised file type before touching uploadPhase', async () => {
    const { dispatch, getState } = harness()
    const file = new File(['binary junk'], 'statement.xlsx', { type: 'application/vnd.ms-excel' })
    await handleFile(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), file)
    const s = getState()
    expect(s.status).toEqual({ message: 'Choose a PDF, or a MarkItDown .md / .txt file.', isErr: true })
    expect(s.uploadPhase).toBe('idle') // untouched — still the initial value
  })

  it('reads a dropped .txt file straight through to a populated dashboard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unreachable')))
    const { dispatch, getState } = harness()
    const file = new File([alok2026], 'statement.txt', { type: 'text/plain' })
    await handleFile(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), file)
    const s = getState()
    expect(s.investorName).toBe('Alok Utsav')
    expect(s.pf?.totalValue).toBeGreaterThan(0)
    expect(s.pendingPassword).toBeNull()
  })
})

describe('handleConvertMarkitdown', () => {
  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status })
  }

  it('parses a successful conversion straight through to a populated dashboard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unreachable'))) // the live-NAV phase, not the bridge
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ markdown: alok2026 }))
    const { dispatch, getState } = harness()
    const file = new File(['%PDF-1.4'], 'statement.pdf', { type: 'application/pdf' })
    await handleConvertMarkitdown(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), file, undefined, fetchImpl)
    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:8765/convert', expect.objectContaining({ method: 'POST' }))
    const s = getState()
    expect(s.investorName).toBe('Alok Utsav')
    expect(s.pendingPassword).toBeNull()
  })

  it('surfaces a password prompt on a 401 password_required response, without touching the dashboard', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'password_required' }, 401))
    const { dispatch, getState } = harness()
    const file = new File(['%PDF-1.4'], 'statement.pdf', { type: 'application/pdf' })
    await handleConvertMarkitdown(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), file, undefined, fetchImpl)
    const s = getState()
    expect(s.pendingPassword).toEqual({ kind: 'markitdown', file, incorrect: false })
    expect(s.status?.message).toBe('This PDF is password-protected — enter the password below.')
    expect(s.pf).toBeNull()
  })

  it('distinguishes an incorrect password from a first attempt', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'incorrect_password' }, 401))
    const { dispatch, getState } = harness()
    const file = new File(['%PDF-1.4'], 'statement.pdf', { type: 'application/pdf' })
    await handleConvertMarkitdown(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), file, 'wrong-pw', fetchImpl)
    const s = getState()
    expect(s.pendingPassword?.incorrect).toBe(true)
    expect(s.status?.message).toBe('Incorrect password — try again below.')
  })

  it('reports a specific, actionable error when the local bridge is unreachable', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const { dispatch, getState } = harness()
    const file = new File(['%PDF-1.4'], 'statement.pdf', { type: 'application/pdf' })
    await handleConvertMarkitdown(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), file, undefined, fetchImpl)
    const s = getState()
    expect(s.status?.message).toContain('Couldn’t reach your local MarkItDown bridge')
    expect(s.status?.message).toContain('Failed to fetch')
    expect(s.pendingPassword).toBeNull()
  })
})

describe('handleSubmitPassword', () => {
  it('does nothing when there is no pending password', () => {
    const { dispatch, patches } = harness()
    handleSubmitPassword(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), null, 'x')
    expect(patches).toEqual([])
  })

  it('routes a markitdown-kind retry to handleConvertMarkitdown with the resubmitted password', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'incorrect_password' }), { status: 401 }))
    vi.stubGlobal('fetch', fetchImpl) // handleSubmitPassword can't take an injected fetchImpl itself
    const file = new File(['%PDF-1.4'], 'statement.pdf', { type: 'application/pdf' })
    const { dispatch, getState } = harness()
    handleSubmitPassword(dispatch, refOf({ kind: 'text', text: '', sourceIsPdf: false }), { kind: 'markitdown', file, incorrect: false }, 'still-wrong')
    await vi.waitFor(() => expect(getState().pendingPassword?.incorrect).toBe(true))
  })
})

describe('handleRefresh', () => {
  it('replays a text-sourced upload via updateDashboard, not the sample fetch', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unreachable')))
    const fetchImpl = vi.fn()
    const { dispatch, getState } = harness()
    const ref = refOf({ kind: 'text', text: alok2026, sourceIsPdf: false })
    handleRefresh(dispatch, ref, fetchImpl)
    expect(fetchImpl).not.toHaveBeenCalled() // '/sample.txt' path never taken
    expect(getState().isSample).toBe(false)
  })

  it('replays the sample source via loadSamplePortfolio when nothing has been uploaded yet', () => {
    // isSample isn't asserted here — loadSamplePortfolio only dispatches it
    // after its fetch resolves, which (being async) hasn't happened yet at
    // this point; `fetchImpl` being called with '/sample.txt' is what
    // actually distinguishes this branch from the updateDashboard one.
    const fetchImpl = vi.fn().mockResolvedValue(new Response(alok2026))
    const { dispatch } = harness()
    handleRefresh(dispatch, refOf({ kind: 'schemes', schemes: parseStatement(alok2026) }), fetchImpl)
    expect(fetchImpl).toHaveBeenCalledWith('/sample.txt')
  })
})
