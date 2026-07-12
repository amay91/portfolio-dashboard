import { useEffect, useRef, useState } from 'react'
import { Commentary } from './features/commentary/Commentary'
import { CommandDeck } from './features/deck/CommandDeck'
import { ADVANCED_TILES } from './features/deck/advancedTiles'
import { PortfolioAnalysis } from './features/deck/PortfolioAnalysis'
import { DataCheck } from './features/datacheck/DataCheck'
import { DataSources } from './features/sources/DataSources'
import { FundCards } from './features/holdings/FundCards'
import { HoldingsTable } from './features/holdings/HoldingsTable'
import { HousesTable } from './features/houses/HousesTable'
import { Notes } from './features/notes/Notes'
import type { Status, UploadPhase } from './features/upload/UploadBar'
import { UploadBar } from './features/upload/UploadBar'
import { PdfPasswordRequiredError, classifyFile, resolveToText } from './ingest/router'
import type { IngestSource } from './ingest/router'
import { analyzePortfolioFromSchemes } from './engine/portfolio'
import { assessExtractionQuality } from './engine/extractionQuality'
import type { ExtractionQuality } from './engine/extractionQuality'
import type { Portfolio, Scheme } from './engine/types'
import { extractInvestorName } from './parsing/cas/investor'
import { parseStatement } from './parsing/cas/parse'
import type { Diag } from './marketdata/resolve'
import { resolveLiveNavs } from './marketdata/resolve'
import { benchmarkCagr, fetchNiftyBenchmark } from './marketdata/sources/benchmark'
import { ChartGallery } from './charts/ChartGallery'
import { EmptyState } from './EmptyState'
import { Feedback } from './features/feedback/Feedback'
import { Footer } from './Footer'
import { PrivacyNote } from './features/privacy/PrivacyNote'
import { ThemeToggle } from './features/theme/ThemeToggle'

const MARKITDOWN_ENDPOINT = 'http://127.0.0.1:8765/convert'

// What Refresh replays: either the raw text of a real upload (re-parsed from
// scratch, same as today) or the fixed Sample Portfolio's schemes (re-parsed
// from the same shipped statement — deterministic, so Refresh only ever
// changes what live NAVs bring with them).
type CurrentSource = { kind: 'text'; text: string; sourceIsPdf: boolean } | { kind: 'schemes'; schemes: Scheme[] }

// One shared password prompt for both PDF ingestion paths (pdf.js direct-
// parse and the MarkItDown bridge) — see docs/DECISIONS.md "Password-
// protected statements". `incorrect` distinguishes "never tried yet" from
// "that password didn't work, try again" copy in the UI.
type PendingPassword = { kind: 'pdf' | 'markitdown'; file: File; incorrect: boolean }

// Top-level orchestration, ported from reference/engine.js's
// updateDashboard/renderStatement/handleFile/convertViaMarkitdown. Paints
// statement-only immediately (analyzePortfolioFromSchemes(schemes)), then
// upgrades to live NAVs (resolveLiveNavs -> analyzePortfolioFromSchemes with
// {live}) — the same two-phase render the prototype uses so the page never
// blocks on the network. The default view is the "Command Deck" (tasks.md
// §U); the 6 Portfolio Analysis sections below it (6-chart gallery, full
// holdings table, fund houses, fund cards, data sources, notes) behave as an
// accordion — opening one closes any other that was open — with a "View
// All" escape hatch that opens every section at once.
function App() {
  const [pf, setPf] = useState<Portfolio | null>(null)
  const [diag, setDiag] = useState<Diag | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle')
  const [extraction, setExtraction] = useState<ExtractionQuality | null>(null)
  const [pendingPassword, setPendingPassword] = useState<PendingPassword | null>(null)
  const [investorName, setInvestorName] = useState<string | null>(null)
  // True while the Sample Portfolio (sample.txt) is on screen, false once a
  // real statement has been uploaded — drives the masthead title (Masthead.tsx).
  const [isSample, setIsSample] = useState(true)
  const [commentaryOpen, setCommentaryOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [niftyAllTime, setNiftyAllTime] = useState<number | null>(null)
  const [nifty1Y, setNifty1Y] = useState<number | null>(null)
  const currentSourceRef = useRef<CurrentSource>({ kind: 'text', text: '', sourceIsPdf: false })

  // Double-rAF guarantees the section's own DOM commit has painted, but
  // large sections (a big table, a chart gallery) can still shift height a
  // little further via their own nested effects right after — a short extra
  // delay before scrolling avoids landing short of the target.
  function scrollToId(id: string) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
      })
    })
  }

  // Accordion: opening a section replaces whatever else was open. Re-clicking
  // the one section that's currently (solely) open closes it. Clicking while
  // several are open (via "View All") narrows down to just the clicked one.
  function selectSection(id: string) {
    setOpenSections((prev) => {
      const openIds = Object.keys(prev).filter((k) => prev[k])
      if (openIds.length === 1 && openIds[0] === id) return {}
      return { [id]: true }
    })
  }

  function openSection(id: string) {
    setOpenSections({ [id]: true })
    scrollToId(id)
  }

  function viewAllSections() {
    setOpenSections(Object.fromEntries(ADVANCED_TILES.map((t) => [t.id, true])))
  }

  function openCommentary() {
    setCommentaryOpen(true)
    scrollToId('commentary-sec')
  }

  // Shared by every entry point (a fresh upload, a MarkItDown conversion, the
  // Sample Portfolio, and Refresh) — everything from here on operates on
  // already-parsed Scheme[], never re-touching source text.
  async function runPipeline(
    schemes: Scheme[],
    investorNameForRun: string | null,
    label: string,
    force: boolean | undefined,
    sourceIsPdf: boolean,
    // The demo path ends at 'idle' (not 'done') on success — "Done! Dashboard
    // Created" implies a real upload, which this isn't (tasks.md U4).
    endPhaseOnSuccess: UploadPhase = 'done',
  ) {
    setUploadPhase('processing')
    let statementPf: Portfolio
    try {
      statementPf = analyzePortfolioFromSchemes(schemes)
      if (!statementPf.funds.length) throw new Error('no schemes')
    } catch {
      setUploadPhase('idle')
      // Zero schemes counts as an extraction problem too — surface the
      // Convert/Instructions buttons here as well, not just the message
      // text, so there's an actual clickable next step (PDF-sourced only;
      // a bad .md/paste upload has no "try Markdown instead" escape hatch).
      if (sourceIsPdf) setExtraction({ ok: false, reasons: ['No schemes were found in this statement.'] })
      setStatus({
        message: sourceIsPdf
          ? 'No schemes found in this PDF. Some statement layouts extract more reliably as Markdown — try “Convert PDF to Markdown” below.'
          : 'No schemes found. Is it a CAMS / KFintech consolidated statement?',
        isErr: true,
      })
      return
    }
    setPf(statementPf)
    setDiag(null)
    setInvestorName(investorNameForRun)
    // Only ever assessed for a real PDF upload — never for .md/paste uploads
    // or the demo, where "convert to Markdown" would be nonsensical.
    setExtraction(sourceIsPdf ? assessExtractionQuality(schemes) : null)

    setStatus({ message: `${label ? label + ' — ' : ''}fetching latest NAVs…`, isErr: false })
    try {
      const edgeUrl = import.meta.env.VITE_AMFI_EDGE_URL as string | undefined
      const [{ live, diag: newDiag }, niftyPoints] = await Promise.all([resolveLiveNavs(schemes, force, edgeUrl), fetchNiftyBenchmark()])
      const livePf = analyzePortfolioFromSchemes(schemes, live ? { live } : {})
      setPf(livePf)
      setDiag(newDiag)
      // The live-NAV outcome (matched/partial/unreachable) is now the Data
      // Check panel's job, right at the top of the page — no need to repeat
      // it here too.
      setStatus(null)

      if (niftyPoints) {
        const oneYearAgo = new Date(livePf.valDate)
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        setNiftyAllTime(livePf.inceptionDate ? benchmarkCagr(niftyPoints, livePf.inceptionDate, livePf.valDate) : null)
        setNifty1Y(benchmarkCagr(niftyPoints, oneYearAgo, livePf.valDate))
      } else {
        setNiftyAllTime(null)
        setNifty1Y(null)
      }
    } catch (err) {
      console.error(err)
      setStatus({ message: 'Live update failed — showing statement values.', isErr: true })
    } finally {
      setUploadPhase(endPhaseOnSuccess)
    }
  }

  async function updateDashboard(text: string, label: string, force?: boolean, sourceIsPdf?: boolean) {
    const isPdf = !!sourceIsPdf
    currentSourceRef.current = { kind: 'text', text, sourceIsPdf: isPdf }
    setIsSample(false)
    await runPipeline(parseStatement(text), extractInvestorName(text), label, force, isPdf)
  }

  // Powers "Clear Data — Reset Dashboard" and the first paint: rebuilds from
  // the shipped Sample Portfolio (app/public/sample.txt) — the exact,
  // constant figures every time, not a randomized stand-in. The only thing
  // that varies run to run is the live-NAV fetch inside runPipeline, so the
  // fund lineup, folios, and quantities stay fixed while valuations/XIRR
  // track real markets.
  async function loadSamplePortfolio(force?: boolean) {
    setUploadPhase('processing')
    setStatus({ message: force ? 'Refreshing…' : 'Building sample dashboard…', isErr: false })
    let raw: string
    try {
      raw = await fetch('/sample.txt').then((r) => r.text())
    } catch {
      setUploadPhase(pf ? 'done' : 'idle')
      setStatus({ message: 'Could not load the sample statement.', isErr: true })
      return
    }
    const schemes = parseStatement(raw)
    currentSourceRef.current = { kind: 'schemes', schemes }
    setIsSample(true)
    await runPipeline(schemes, null, force ? 'Refreshing' : 'Sample Portfolio', force, false, 'idle')
  }

  function handleRefresh() {
    const src = currentSourceRef.current
    if (src.kind === 'text') updateDashboard(src.text, 'Refreshing', true, src.sourceIsPdf)
    else loadSamplePortfolio(true)
  }

  async function handleFile(file: File, password?: string) {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    const isText = /\.(md|markdown|txt|text)$/i.test(file.name) || /^text\//.test(file.type || '')
    if (!isPdf && !isText) {
      setStatus({ message: 'Choose a PDF, or a MarkItDown .md / .txt file.', isErr: true })
      return
    }
    setUploadPhase('processing')
    setStatus({ message: `Reading ${file.name}…`, isErr: false })
    try {
      // classifyFile has no password param — only needed on this retry path.
      const source: IngestSource = isPdf ? { kind: 'pdf', file, password } : classifyFile(file)
      const text = await resolveToText(source)
      setPendingPassword(null)
      await updateDashboard(text, `Parsed ${file.name}`, undefined, isPdf)
    } catch (err) {
      setUploadPhase(pf ? 'done' : 'idle')
      if (err instanceof PdfPasswordRequiredError) {
        setPendingPassword({ kind: 'pdf', file, incorrect: err.incorrect })
        setStatus({
          message: err.incorrect ? 'Incorrect password — try again below.' : 'This PDF is password-protected — enter the password below.',
          isErr: true,
        })
        return
      }
      setPendingPassword(null)
      setStatus({ message: `Could not read that file. ${(err as Error).message || ''}`, isErr: true })
    }
  }

  async function handleConvertMarkitdown(file: File, password?: string) {
    setUploadPhase('processing')
    setStatus({ message: `Converting ${file.name} with MarkItDown…`, isErr: false })
    try {
      const buf = await file.arrayBuffer()
      const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream', 'X-Filename': file.name }
      // The bridge is localhost-only (127.0.0.1:8765) — this never leaves
      // the device. encodeURIComponent keeps the header value transport-safe
      // if the password ever contains non-ASCII characters.
      if (password) headers['X-Pdf-Password'] = encodeURIComponent(password)
      const res = await fetch(MARKITDOWN_ENDPOINT, { method: 'POST', headers, body: buf })
      // Read the body before throwing on a non-OK status so a 401
      // password-required/incorrect response can be told apart from a
      // generic bridge failure.
      const data = await res.json().catch(() => ({}) as { error?: string; markdown?: string })
      if (res.status === 401 && (data.error === 'password_required' || data.error === 'incorrect_password')) {
        setUploadPhase(pf ? 'done' : 'idle')
        setPendingPassword({ kind: 'markitdown', file, incorrect: data.error === 'incorrect_password' })
        setStatus({
          message: data.error === 'incorrect_password' ? 'Incorrect password — try again below.' : 'This PDF is password-protected — enter the password below.',
          isErr: true,
        })
        return
      }
      if (!res.ok) throw new Error('bridge returned HTTP ' + res.status)
      if (data.error) throw new Error(data.error)
      if (!data.markdown || data.markdown.length < 50) throw new Error('empty conversion')
      setPendingPassword(null)
      await updateDashboard(data.markdown, `Parsed ${file.name} (MarkItDown)`, undefined, false)
    } catch (err) {
      setUploadPhase(pf ? 'done' : 'idle')
      setPendingPassword(null)
      setStatus({
        message: `Couldn’t reach your local MarkItDown bridge at 127.0.0.1:8765. Start it with  python markitdown_server.py  (needs: pip install "markitdown[pdf]" pypdf), then click again. [${(err as Error).message || 'network error'}]`,
        isErr: true,
      })
    }
  }

  function handleSubmitPassword(password: string) {
    if (!pendingPassword) return
    if (pendingPassword.kind === 'pdf') handleFile(pendingPassword.file, password)
    else handleConvertMarkitdown(pendingPassword.file, password)
  }

  // first paint: the fixed Sample Portfolio
  useEffect(() => {
    loadSamplePortfolio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className="theme-toggle-corner">
        <ThemeToggle />
      </div>
      <Feedback />
      <PrivacyNote open={privacyOpen} onOpenChange={setPrivacyOpen} onOpenMethodNotes={() => openSection('notes')} />
      <UploadBar
        status={status}
        uploadPhase={uploadPhase}
        hasExtractionProblem={!!extraction && !extraction.ok}
        pendingPassword={pendingPassword ? { incorrect: pendingPassword.incorrect } : null}
        onFile={handleFile}
        onClearAndReset={() => {
          setPendingPassword(null)
          loadSamplePortfolio()
        }}
        onRefresh={handleRefresh}
        onConvertMarkitdown={handleConvertMarkitdown}
        onSubmitPassword={handleSubmitPassword}
      />
      <main id="app">
        {!pf && <EmptyState status={status} />}
        {pf && (
          <>
            <section id="datacheck">
              <div className="wrap">
                <DataCheck pf={pf} diag={diag} onOpenDataSources={() => openSection('sources')} />
              </div>
            </section>
            <CommandDeck pf={pf} investorName={investorName} isSample={isSample} niftyAllTime={niftyAllTime} nifty1Y={nifty1Y} onOpenCommentary={openCommentary} />
            <Commentary pf={pf} open={commentaryOpen} onToggle={setCommentaryOpen} />
            <PortfolioAnalysis investorName={investorName} openSections={openSections} onSelect={selectSection} onViewAll={viewAllSections} />
            {openSections.charts && (
              <section id="charts">
                <div className="wrap">
                  <p className="eyebrow">Visual Analysis</p>
                  <h2 className="sec-title">Portfolio Charts</h2>
                  <p className="sec-sub">A gallery of performance and risk views — use the arrows (or swipe) to move through them. Everything here is rebuilt from your transactions each time you upload a statement.</p>
                  <ChartGallery pf={pf} />
                </div>
              </section>
            )}
            {openSections['holdings-full'] && (
              <section id="holdings-full">
                <div className="wrap">
                  <p className="eyebrow">Holdings</p>
                  <h2 className="sec-title">Every Scheme At A Glance</h2>
                  <p className="sec-sub">Amount invested, current market value, total gain and the money-weighted CAGR since your first investment in each fund — with the NAV date each figure is valued on.</p>
                  <HoldingsTable pf={pf} live={!!pf.live} diag={diag} />
                </div>
              </section>
            )}
            {openSections.schemes && (
              <section id="schemes">
                <div className="wrap">
                  <p className="eyebrow">Holdings Detail</p>
                  <h2 className="sec-title">Every Scheme, With KIM &amp; SID Detail</h2>
                  <p className="sec-sub">Per-fund balance, average cost, capital-gains split and annualised return, alongside the key facts from each scheme's Key Information Memorandum and a link to the AMC's official page.</p>
                  <FundCards pf={pf} />
                </div>
              </section>
            )}
            {openSections.houses && (
              <section id="houses">
                <div className="wrap">
                  <p className="eyebrow">By Fund House</p>
                  <h2 className="sec-title">Allocation Across AMCs</h2>
                  <HousesTable pf={pf} />
                </div>
              </section>
            )}
            {openSections.notes && (
              <section id="notes">
                <div className="wrap">
                  <p className="eyebrow">Method &amp; Caveats</p>
                  <h2 className="sec-title">How These Figures Are Built</h2>
                  <Notes valDate={pf.valDate} />
                </div>
              </section>
            )}
            {openSections.sources && (
              <section id="sources">
                <div className="wrap">
                  <p className="eyebrow">Provenance</p>
                  <h2 className="sec-title">Data Sources</h2>
                  <p className="sec-sub">Where each scheme's valuation NAV came from, and — where a live NAV wasn't used — why.</p>
                  <DataSources pf={pf} diag={diag} />
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  )
}

export default App
