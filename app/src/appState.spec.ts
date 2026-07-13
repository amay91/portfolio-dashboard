import { describe, expect, it } from 'vitest'
import { initialPipelineState, pipelineReducer } from './appState'

describe('pipelineReducer', () => {
  it('merges an object patch into state, leaving untouched fields alone', () => {
    const next = pipelineReducer(initialPipelineState, { uploadPhase: 'processing', isSample: false })
    expect(next.uploadPhase).toBe('processing')
    expect(next.isSample).toBe(false)
    expect(next.pf).toBeNull() // untouched
  })

  it('applies a function-form patch against the current state, not a stale snapshot', () => {
    const withPf = pipelineReducer(initialPipelineState, { pf: { totalValue: 100 } as never })
    const next = pipelineReducer(withPf, (s) => ({ uploadPhase: s.pf ? 'done' : 'idle' }))
    expect(next.uploadPhase).toBe('done')
  })

  it('a field omitted from an object patch is left exactly as it was (not reset to a default)', () => {
    const withExtraction = pipelineReducer(initialPipelineState, { extraction: { ok: false, reasons: ['x'] } })
    const next = pipelineReducer(withExtraction, { status: { message: 'hi', isErr: false } })
    expect(next.extraction).toEqual({ ok: false, reasons: ['x'] })
  })

  it('two sequential dispatches never produce an inconsistent intermediate combination the app could render', () => {
    // Simulates App.tsx's "statement parsed" transition, which used to be 4
    // separate setState calls — here it's one dispatch, so there is no
    // render where pf is set but investorName/extraction aren't yet.
    const next = pipelineReducer(initialPipelineState, {
      pf: { totalValue: 500 } as never,
      diag: null,
      investorName: 'Amay',
      extraction: null,
    })
    expect(next).toMatchObject({ pf: { totalValue: 500 }, diag: null, investorName: 'Amay', extraction: null })
  })
})
