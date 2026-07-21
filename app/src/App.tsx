import { useEffect, useReducer, useRef, useState } from 'react'
import { Commentary } from './features/commentary/Commentary'
import { CommandDeck } from './features/deck/CommandDeck'
import { ADVANCED_TILES } from './features/deck/advancedTiles'
import type { SectionId } from './features/deck/advancedTiles'
import { PortfolioAnalysis } from './features/deck/PortfolioAnalysis'
import { DataCheck } from './features/datacheck/DataCheck'
import { DataSources } from './features/sources/DataSources'
import { FundCards } from './features/holdings/FundCards'
import { HoldingsTable } from './features/holdings/HoldingsTable'
import { HousesTable } from './features/houses/HousesTable'
import { Notes } from './features/notes/Notes'
import { UploadBar } from './features/upload/UploadBar'
import { ChartGallery } from './charts/ChartGallery'
import { EmptyState } from './EmptyState'
import { ErrorBoundary } from './ErrorBoundary'
import { Footer } from './Footer'
import { HelpMenu } from './features/help/HelpMenu'
import { Section } from './Section'
import { ThemeToggle } from './features/theme/ThemeToggle'
import { Spotlight } from './ui/Spotlight'
import type { SpotlightRequest } from './ui/Spotlight'
import { handleConvertMarkitdown, handleFile, handleRefresh, handleSubmitPassword, loadSamplePortfolio } from './appPipeline'
import { initialPipelineState, pipelineReducer } from './appState'
import type { CurrentSource } from './appState'

// Top-level orchestration is in appPipeline.ts/appState.ts (review item C1)
// — this component owns only UI-local state (the accordion, the
// currentSource ref) and wires the extracted functions to the actual DOM
// event handlers. See appPipeline.ts's header comment for the pipeline
// shape; the default view is the "Command Deck" (tasks.md §U); the 6
// Portfolio Analysis sections below it (6-chart gallery, full holdings
// table, fund houses, fund cards, data sources, notes) behave as an
// accordion — opening one closes any other that was open — with a "View
// All" escape hatch that opens every section at once.
function App() {
  const [state, dispatch] = useReducer(pipelineReducer, initialPipelineState)
  const { pf, diag, status, uploadPhase, extraction, pendingPassword, investorName, isSample, niftyAllTime, nifty1Y } = state
  const [commentaryOpen, setCommentaryOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Partial<Record<SectionId, boolean>>>({})
  const [spotlight, setSpotlight] = useState<SpotlightRequest | null>(null)
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
  function selectSection(id: SectionId) {
    setOpenSections((prev) => {
      const openIds = (Object.keys(prev) as SectionId[]).filter((k) => prev[k])
      if (openIds.length === 1 && openIds[0] === id) return {}
      return { [id]: true }
    })
  }

  function openSection(id: SectionId) {
    setOpenSections({ [id]: true })
    scrollToId(id)
  }

  function viewAllSections() {
    setOpenSections(Object.fromEntries(ADVANCED_TILES.map((t) => [t.id, true])) as Partial<Record<SectionId, boolean>>)
  }

  function openCommentary() {
    setCommentaryOpen(true)
    scrollToId('commentary-sec')
  }

  // first paint: the fixed Sample Portfolio
  useEffect(() => {
    void loadSamplePortfolio(dispatch, currentSourceRef)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <UploadBar
        status={status}
        uploadPhase={uploadPhase}
        hasExtractionProblem={!!extraction && !extraction.ok}
        pendingPassword={pendingPassword ? { incorrect: pendingPassword.incorrect } : null}
        onFile={(file: File, password?: string) => void handleFile(dispatch, currentSourceRef, file, password)}
        onClearAndReset={() => {
          dispatch({ pendingPassword: null })
          void loadSamplePortfolio(dispatch, currentSourceRef)
        }}
        onRefresh={() => handleRefresh(dispatch, currentSourceRef)}
        onConvertMarkitdown={(file: File, password?: string) => void handleConvertMarkitdown(dispatch, currentSourceRef, file, password)}
        onSubmitPassword={(password) => handleSubmitPassword(dispatch, currentSourceRef, pendingPassword, password)}
      />
      {/* On desktop these two stay position:fixed corners (top-left/top-right),
          unaffected by their position here in the DOM. On mobile (<=1023px)
          they switch to position:static/relative and render in normal flow
          at exactly this point — just above Data Check (or EmptyState,
          before a statement loads) — instead of floating fixed over the
          upload box, which they used to visually collide with (tasks.md
          U11). See app.css's .mobile-header-row / .theme-toggle-corner /
          .help-menu-corner mobile media query.
          HelpMenu comes first in the DOM (not ThemeToggle) so this row's
          justify-content: space-between puts it on the LEFT on mobile,
          matching its desktop top-left corner — putting it on the right
          (the previous order) anchored its dropdown's `left: 0` to a
          right-edge button, pushing the menu list past the viewport's right
          edge where body's overflow-x: hidden safety net (M1) silently
          clipped it. Anchoring from the left instead gives the dropdown
          room to open into, not off, the screen. */}
      <div className="mobile-header-row">
        <HelpMenu onSpotlight={setSpotlight} />
        <div className="theme-toggle-corner">
          <ThemeToggle />
        </div>
      </div>
      <Spotlight request={spotlight} onDismiss={() => setSpotlight(null)} />
      <main id="app">
        {!pf && <EmptyState status={status} />}
        {pf && (
          <ErrorBoundary resetKey={pf}>
            <section id="datacheck">
              <div className="wrap">
                <DataCheck pf={pf} diag={diag} onOpenDataSources={() => openSection('sources')} />
              </div>
            </section>
            <CommandDeck pf={pf} investorName={investorName} isSample={isSample} niftyAllTime={niftyAllTime} nifty1Y={nifty1Y} onOpenCommentary={openCommentary} />
            <Commentary pf={pf} open={commentaryOpen} onToggle={setCommentaryOpen} />
            <PortfolioAnalysis investorName={investorName} openSections={openSections} onSelect={selectSection} onViewAll={viewAllSections} />
            {openSections.charts && (
              <Section
                id="charts"
                eyebrow="Visual Analysis"
                title="Portfolio Charts"
                subtitle="A gallery of performance and risk views — use the arrows (or swipe) to move through them. Everything here is rebuilt from your transactions each time you upload a statement."
              >
                <ChartGallery pf={pf} />
              </Section>
            )}
            {openSections['holdings-full'] && (
              <Section
                id="holdings-full"
                eyebrow="Holdings"
                title="Every Scheme At A Glance"
                subtitle="Amount invested, current market value, total gain and the money-weighted CAGR since your first investment in each fund — with the NAV date each figure is valued on."
              >
                <HoldingsTable pf={pf} live={!!pf.live} diag={diag} />
              </Section>
            )}
            {openSections.schemes && (
              <Section
                id="schemes"
                eyebrow="Holdings Detail"
                title="Every Scheme, With KIM & SID Detail"
                subtitle="Per-fund balance, average cost, capital-gains split and annualised return, alongside the key facts from each scheme's Key Information Memorandum and a link to the AMC's official page."
              >
                <FundCards pf={pf} />
              </Section>
            )}
            {openSections.houses && (
              <Section id="houses" eyebrow="By Fund House" title="Allocation Across AMCs">
                <HousesTable pf={pf} />
              </Section>
            )}
            {openSections.notes && (
              <Section id="notes" eyebrow="Method & Caveats" title="How These Figures Are Built">
                <Notes valDate={pf.valDate} />
              </Section>
            )}
            {openSections.sources && (
              <Section id="sources" eyebrow="Provenance" title="Data Sources" subtitle="Where each scheme's valuation NAV came from, and — where a live NAV wasn't used — why.">
                <DataSources pf={pf} diag={diag} />
              </Section>
            )}
          </ErrorBoundary>
        )}
      </main>
      <Footer />
    </>
  )
}

export default App
