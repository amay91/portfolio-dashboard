import type { MutableRefObject } from 'react'
import type { UploadPhase } from './features/upload/UploadBar'
import { PdfPasswordRequiredError, classifyFile, isPdfFile, isTextFile, resolveToText } from './ingest/router'
import type { IngestSource } from './ingest/router'
import { analyzePortfolioFromSchemes } from './engine/portfolio'
import { assessExtractionQuality } from './engine/extractionQuality'
import type { Scheme } from './engine/types'
import { extractInvestorName } from './parsing/cas/investor'
import { parseStatement } from './parsing/cas/parse'
import { resolveLiveNavs } from './marketdata/resolve'
import { benchmarkCagr, fetchNiftyBenchmark } from './marketdata/sources/benchmark'
import type { CurrentSource, PendingPassword, PipelinePatch } from './appState'

const MARKITDOWN_ENDPOINT = 'http://127.0.0.1:8765/convert'

type Dispatch = (patch: PipelinePatch) => void

// Top-level orchestration, extracted from App.tsx (review item C1) into a
// plain, React-free module: no hooks, no closures over component state —
// every dependency (dispatch, the ref, an injectable `fetch`) is a
// parameter, so each function is directly unit-testable without rendering
// anything. Ported from reference/engine.js's updateDashboard/
// renderStatement/handleFile/convertViaMarkitdown; ports the same two-phase
// render (paint statement-only immediately, then upgrade to live NAVs) the
// prototype uses so the page never blocks on the network.

// Shared by every entry point (a fresh upload, a MarkItDown conversion, the
// Sample Portfolio, and Refresh) — everything from here on operates on
// already-parsed Scheme[], never re-touching source text.
export async function runPipeline(
  dispatch: Dispatch,
  schemes: Scheme[],
  investorNameForRun: string | null,
  label: string,
  force: boolean | undefined,
  sourceIsPdf: boolean,
  // The demo path ends at 'idle' (not 'done') on success — "Done! Dashboard
  // Created" implies a real upload, which this isn't (tasks.md U4).
  endPhaseOnSuccess: UploadPhase = 'done',
): Promise<void> {
  dispatch({ uploadPhase: 'processing' })
  let statementPf: ReturnType<typeof analyzePortfolioFromSchemes>
  try {
    statementPf = analyzePortfolioFromSchemes(schemes)
    if (!statementPf.funds.length) throw new Error('no schemes')
  } catch {
    // Zero schemes counts as an extraction problem too — surface the
    // Convert/Instructions buttons here as well, not just the message
    // text, so there's an actual clickable next step (PDF-sourced only;
    // a bad .md/paste upload has no "try Markdown instead" escape hatch).
    // `extraction` is only included in the patch for a PDF source — for
    // any other source it's deliberately left untouched, matching the
    // original conditional setExtraction() call exactly.
    dispatch({
      uploadPhase: 'idle',
      ...(sourceIsPdf ? { extraction: { ok: false, reasons: ['No schemes were found in this statement.'] } } : {}),
      status: {
        message: sourceIsPdf
          ? 'No schemes found in this PDF. Some statement layouts extract more reliably as Markdown — try “Convert PDF to Markdown” below.'
          : 'No schemes found. Is it a CAMS / KFintech consolidated statement?',
        isErr: true,
      },
    })
    return
  }
  // Only ever assessed for a real PDF upload — never for .md/paste uploads
  // or the demo, where "convert to Markdown" would be nonsensical.
  dispatch({
    pf: statementPf,
    diag: null,
    investorName: investorNameForRun,
    extraction: sourceIsPdf ? assessExtractionQuality(schemes) : null,
    status: { message: `${label ? label + ' — ' : ''}fetching latest NAVs…`, isErr: false },
  })
  try {
    const edgeUrl = import.meta.env.VITE_AMFI_EDGE_URL as string | undefined
    const [{ live, diag: newDiag }, niftyPoints] = await Promise.all([resolveLiveNavs(schemes, force, edgeUrl), fetchNiftyBenchmark()])
    const livePf = analyzePortfolioFromSchemes(schemes, live ? { live } : {})
    let niftyAllTime: number | null = null
    let nifty1Y: number | null = null
    if (niftyPoints) {
      const oneYearAgo = new Date(livePf.valDate)
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      niftyAllTime = livePf.inceptionDate ? benchmarkCagr(niftyPoints, livePf.inceptionDate, livePf.valDate) : null
      nifty1Y = benchmarkCagr(niftyPoints, oneYearAgo, livePf.valDate)
    }
    // The live-NAV outcome (matched/partial/unreachable) is now the Data
    // Check panel's job, right at the top of the page — no need to repeat
    // it here too.
    dispatch({ pf: livePf, diag: newDiag, status: null, niftyAllTime, nifty1Y })
  } catch (err) {
    console.error(err)
    dispatch({ status: { message: 'Live update failed — showing statement values.', isErr: true } })
  } finally {
    dispatch({ uploadPhase: endPhaseOnSuccess })
  }
}

export async function updateDashboard(
  dispatch: Dispatch,
  currentSourceRef: MutableRefObject<CurrentSource>,
  text: string,
  label: string,
  force?: boolean,
  sourceIsPdf?: boolean,
): Promise<void> {
  const isPdf = !!sourceIsPdf
  currentSourceRef.current = { kind: 'text', text, sourceIsPdf: isPdf }
  dispatch({ isSample: false })
  await runPipeline(dispatch, parseStatement(text), extractInvestorName(text), label, force, isPdf)
}

// Powers "Clear Data — Reset Dashboard" and the first paint: rebuilds from
// the shipped Sample Portfolio (app/public/sample.txt) — the exact,
// constant figures every time, not a randomized stand-in. The only thing
// that varies run to run is the live-NAV fetch inside runPipeline, so the
// fund lineup, folios, and quantities stay fixed while valuations/XIRR
// track real markets. `fetchImpl` defaults to the global fetch — injectable
// (review item C1) so a test can supply a fake statement without a real
// network request or a global fetch stub.
export async function loadSamplePortfolio(
  dispatch: Dispatch,
  currentSourceRef: MutableRefObject<CurrentSource>,
  force?: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  dispatch({ uploadPhase: 'processing', status: { message: force ? 'Refreshing…' : 'Building sample dashboard…', isErr: false } })
  let raw: string
  try {
    raw = await fetchImpl('/sample.txt').then((r) => r.text())
  } catch {
    dispatch((s) => ({ uploadPhase: s.pf ? 'done' : 'idle', status: { message: 'Could not load the sample statement.', isErr: true } }))
    return
  }
  const schemes = parseStatement(raw)
  currentSourceRef.current = { kind: 'schemes', schemes }
  dispatch({ isSample: true })
  await runPipeline(dispatch, schemes, null, force ? 'Refreshing' : 'Sample Portfolio', force, false, 'idle')
}

export function handleRefresh(dispatch: Dispatch, currentSourceRef: MutableRefObject<CurrentSource>, fetchImpl: typeof fetch = fetch): void {
  const src = currentSourceRef.current
  if (src.kind === 'text') void updateDashboard(dispatch, currentSourceRef, src.text, 'Refreshing', true, src.sourceIsPdf)
  else void loadSamplePortfolio(dispatch, currentSourceRef, true, fetchImpl)
}

export async function handleFile(dispatch: Dispatch, currentSourceRef: MutableRefObject<CurrentSource>, file: File, password?: string): Promise<void> {
  const isPdf = isPdfFile(file)
  if (!isPdf && !isTextFile(file)) {
    dispatch({ status: { message: 'Choose a PDF, or a MarkItDown .md / .txt file.', isErr: true } })
    return
  }
  dispatch({ uploadPhase: 'processing', status: { message: `Reading ${file.name}…`, isErr: false } })
  try {
    // classifyFile has no password param — only needed on this retry path.
    const source: IngestSource = isPdf ? { kind: 'pdf', file, password } : classifyFile(file)
    const text = await resolveToText(source)
    dispatch({ pendingPassword: null })
    await updateDashboard(dispatch, currentSourceRef, text, `Parsed ${file.name}`, undefined, isPdf)
  } catch (err) {
    if (err instanceof PdfPasswordRequiredError) {
      dispatch((s) => ({
        uploadPhase: s.pf ? 'done' : 'idle',
        pendingPassword: { kind: 'pdf', file, incorrect: err.incorrect },
        status: {
          message: err.incorrect ? 'Incorrect password — try again below.' : 'This PDF is password-protected — enter the password below.',
          isErr: true,
        },
      }))
      return
    }
    dispatch((s) => ({
      uploadPhase: s.pf ? 'done' : 'idle',
      pendingPassword: null,
      status: { message: `Could not read that file. ${(err as Error).message || ''}`, isErr: true },
    }))
  }
}

export async function handleConvertMarkitdown(
  dispatch: Dispatch,
  currentSourceRef: MutableRefObject<CurrentSource>,
  file: File,
  password?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  dispatch({ uploadPhase: 'processing', status: { message: `Converting ${file.name} with MarkItDown…`, isErr: false } })
  try {
    const buf = await file.arrayBuffer()
    const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream', 'X-Filename': file.name }
    // The bridge is localhost-only (127.0.0.1:8765) — this never leaves
    // the device. encodeURIComponent keeps the header value transport-safe
    // if the password ever contains non-ASCII characters.
    if (password) headers['X-Pdf-Password'] = encodeURIComponent(password)
    const res = await fetchImpl(MARKITDOWN_ENDPOINT, { method: 'POST', headers, body: buf })
    // Read the body before throwing on a non-OK status so a 401
    // password-required/incorrect response can be told apart from a
    // generic bridge failure.
    const data = await res.json().catch(() => ({}) as { error?: string; markdown?: string })
    if (res.status === 401 && (data.error === 'password_required' || data.error === 'incorrect_password')) {
      dispatch((s) => ({
        uploadPhase: s.pf ? 'done' : 'idle',
        pendingPassword: { kind: 'markitdown', file, incorrect: data.error === 'incorrect_password' },
        status: {
          message: data.error === 'incorrect_password' ? 'Incorrect password — try again below.' : 'This PDF is password-protected — enter the password below.',
          isErr: true,
        },
      }))
      return
    }
    if (!res.ok) throw new Error('bridge returned HTTP ' + res.status)
    if (data.error) throw new Error(data.error)
    if (!data.markdown || data.markdown.length < 50) throw new Error('empty conversion')
    dispatch({ pendingPassword: null })
    await updateDashboard(dispatch, currentSourceRef, data.markdown, `Parsed ${file.name} (MarkItDown)`, undefined, false)
  } catch (err) {
    dispatch((s) => ({
      uploadPhase: s.pf ? 'done' : 'idle',
      pendingPassword: null,
      status: {
        message: `Couldn’t reach your local MarkItDown bridge at 127.0.0.1:8765. Start it with  python markitdown_server.py  (needs: pip install "markitdown[pdf]" pypdf), then click again. [${(err as Error).message || 'network error'}]`,
        isErr: true,
      },
    }))
  }
}

export function handleSubmitPassword(
  dispatch: Dispatch,
  currentSourceRef: MutableRefObject<CurrentSource>,
  pendingPassword: PendingPassword | null,
  password: string,
): void {
  if (!pendingPassword) return
  if (pendingPassword.kind === 'pdf') void handleFile(dispatch, currentSourceRef, pendingPassword.file, password)
  else void handleConvertMarkitdown(dispatch, currentSourceRef, pendingPassword.file, password)
}
