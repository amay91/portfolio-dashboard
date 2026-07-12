import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Masthead } from '../../Masthead'
import { AllocationSection } from '../allocation/AllocationSection'
import { KpiRail } from './KpiRail'
import { TopHoldings } from './TopHoldings'
import { ValueVsInvestedCard } from './ValueVsInvestedCard'
import { HoverDiv } from '../../ui/HoverLift'
import type { Portfolio } from '../../engine/types'

// 163 PPI is the pixel density of a 27" 4K monitor (3840x2160 over a 27"
// diagonal) — the user's own reference point for "HD" output. Browsers/
// canvas APIs treat 96 CSS px as 1 inch, so scaling the capture by
// 163/96 reproduces that density without hardcoding an arbitrary "2x".
const PNG_PIXEL_RATIO = 163 / 96

// The lean "Command Deck": masthead + KPI row (Total Value/Invested, Total
// Gain/ST-LT Split, XIRR vs Nifty 50, Insight) + a 2-column grid (chart + top
// holdings stacked on the left; Allocation alone, sized to match their
// combined height, on the right). This is the whole of the default view —
// see tasks.md §U for the locked design. The old "Show Advanced" launcher
// row has moved out to its own always-visible PortfolioAnalysis component.
export function CommandDeck({
  pf,
  investorName,
  isSample,
  niftyAllTime,
  nifty1Y,
  onOpenCommentary,
}: {
  pf: Portfolio
  investorName: string | null
  isSample: boolean
  niftyAllTime: number | null
  nifty1Y: number | null
  onOpenCommentary: () => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [savingPng, setSavingPng] = useState(false)

  // Captures exactly .deck-frame (masthead + KPI row + chart/holdings/
  // allocation) — Portfolio Commentary and Portfolio Analysis live outside
  // this element, so they're never included. The Save-as-PNG button itself
  // is excluded from the capture via `filter` (it'd otherwise render inside
  // its own screenshot).
  async function handleSaveAsPng() {
    if (!frameRef.current || savingPng) return
    setSavingPng(true)
    try {
      const dataUrl = await toPng(frameRef.current, {
        pixelRatio: PNG_PIXEL_RATIO,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--frame').trim() || undefined,
        filter: (node) => !(node instanceof HTMLElement && node.classList.contains('deck-mast-pngbtn')),
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `portfolio-summary-${pf.valDate.toISOString().slice(0, 10)}.png`
      link.click()
    } catch (err) {
      console.error('Save as PNG failed', err)
    } finally {
      setSavingPng(false)
    }
  }

  return (
    <div className="deck">
      <div className="deck-frame" ref={frameRef}>
        <Masthead pf={pf} investorName={investorName} isSample={isSample} onSaveAsPng={handleSaveAsPng} savingPng={savingPng} />
        <KpiRail pf={pf} niftyAllTime={niftyAllTime} nifty1Y={nifty1Y} onOpenCommentary={onOpenCommentary} />
        <div className="deck-grid-2col">
          <div className="deck-col deck-col-chart">
            <ValueVsInvestedCard pf={pf} />
            <TopHoldings pf={pf} />
          </div>
          <div className="deck-col deck-col-alloc">
            <HoverDiv className="deck-card deck-alloc-card">
              <p className="deck-sec deck-alloc-head">Allocation</p>
              <AllocationSection pf={pf} />
            </HoverDiv>
          </div>
        </div>
      </div>
    </div>
  )
}
