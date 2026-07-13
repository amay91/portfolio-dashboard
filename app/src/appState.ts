import type { UploadPhase, Status } from './features/upload/UploadBar'
import type { ExtractionQuality } from './engine/extractionQuality'
import type { Portfolio, Scheme } from './engine/types'
import type { Diag } from './marketdata/resolve'

// What Refresh replays: either the raw text of a real upload (re-parsed from
// scratch, same as today) or the fixed Sample Portfolio's schemes (re-parsed
// from the same shipped statement — deterministic, so Refresh only ever
// changes what live NAVs bring with them).
export type CurrentSource = { kind: 'text'; text: string; sourceIsPdf: boolean } | { kind: 'schemes'; schemes: Scheme[] }

// One shared password prompt for both PDF ingestion paths (pdf.js direct-
// parse and the MarkItDown bridge) — see docs/DECISIONS.md "Password-
// protected statements". `incorrect` distinguishes "never tried yet" from
// "that password didn't work, try again" copy in the UI.
export type PendingPassword = { kind: 'pdf' | 'markitdown'; file: File; incorrect: boolean }

// Everything a pipeline run (a fresh upload, a MarkItDown conversion, the
// Sample Portfolio, or Refresh) can change — review item C1: these fields
// used to be independent useState atoms, set via 3-8 separate setState
// calls scattered across each async handler in App.tsx. Two concrete risks
// that created: (1) a multi-field transition (e.g. "statement parsed" —
// pf/diag/investorName/extraction all change together) rendered across
// several intermediate commits instead of one atomic update; (2) a value
// like `pf` read from a handler's closure (`setUploadPhase(pf ? 'done' :
// 'idle')`) could be stale if `pf` changed *during* an in-flight async
// operation. A single reducer fixes both: one dispatch = one atomic update,
// and a function-form patch reads the reducer's always-current state
// instead of a closure snapshot. `commentaryOpen`/`openSections` deliberately
// stay as separate useState in App.tsx — pure UI toggle state a user click
// can change independently of any pipeline run, not part of "the result."
export interface PipelineState {
  pf: Portfolio | null
  diag: Diag | null
  status: Status | null
  uploadPhase: UploadPhase
  extraction: ExtractionQuality | null
  pendingPassword: PendingPassword | null
  investorName: string | null
  isSample: boolean
  niftyAllTime: number | null
  nifty1Y: number | null
}

export const initialPipelineState: PipelineState = {
  pf: null,
  diag: null,
  status: null,
  uploadPhase: 'idle',
  extraction: null,
  pendingPassword: null,
  investorName: null,
  isSample: true,
  niftyAllTime: null,
  nifty1Y: null,
}

// A patch is either applied directly (the common case — the caller already
// knows the new values) or, when a transition needs to read state at the
// moment it actually lands rather than when the async function that
// scheduled it started running, a function of the current state — the same
// escape hatch React's own `setState(prev => ...)` gives a single field,
// generalized here to a whole atomic multi-field update.
export type PipelinePatch = Partial<PipelineState> | ((state: PipelineState) => Partial<PipelineState>)

export function pipelineReducer(state: PipelineState, patch: PipelinePatch): PipelineState {
  const next = typeof patch === 'function' ? patch(state) : patch
  return { ...state, ...next }
}
