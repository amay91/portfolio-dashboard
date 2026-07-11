import { useMemo, useRef, useState } from 'react'
import { AnnualChart } from './AnnualChart'
import { annualCaption, annualGeometry } from './annual'
import { CapitalChart } from './CapitalChart'
import { CAPITAL_CAPTION, capitalGeometry } from './capital'
import { GeographyChart } from './GeographyChart'
import { geographyCaption, geographyGeometry } from './geography'
import { HoldingsChart } from './HoldingsChart'
import { holdingsCaption, holdingsGeometry } from './holdings'
import { InvestedChart } from './InvestedChart'
import { investedCaption, investedGeometry } from './invested'
import { RollingChart } from './RollingChart'
import { ROLLING_CAPTION, rollingGeometry } from './rolling'
import { HoverButton } from '../ui/HoverLift'
import type { Portfolio, Series } from '../engine/types'

type SlideKind = 'invested' | 'annual' | 'rolling' | 'capital' | 'holdings' | 'geography'
interface Slide {
  kind: SlideKind
  series: Series
}

// Short-form labels for the chart-picker row — full titles (used in the
// slide itself, see renderSlide below) stay unchanged; these are button
// text only, so a longer chart title still fits a compact horizontal row.
const SHORT_LABEL: Record<SlideKind, string> = {
  invested: 'Portfolio Value',
  annual: 'Annual Returns',
  rolling: 'Rolling Returns',
  capital: 'Net Capital Changes',
  holdings: 'Holdings by Value',
  geography: 'Geo Concentration',
}

// The 6-chart gallery carousel (prev/next/dots/swipe). Ported from
// reference/engine.js renderCharts, with `GI`/`GN` promoted from module
// globals to real component state. Every slide is a real React SVG
// component with a hover/keyboard tooltip (tasks U2a, review #3) — driven
// by a pure geometry function per chart (charts/{invested,annual,rolling,
// capital,holdings,geography}.ts), not a pre-built markup string.
export function ChartGallery({ pf }: { pf: Portfolio }) {
  const slides = useMemo<Slide[]>(() => {
    const s = pf.series
    if (!s) return []
    const kinds: SlideKind[] = ['invested', 'annual', 'rolling', 'capital', 'holdings', 'geography']
    const hasGeometry: Record<SlideKind, () => boolean> = {
      invested: () => investedGeometry(s) != null,
      annual: () => annualGeometry(s) != null,
      rolling: () => rollingGeometry(s) != null,
      capital: () => capitalGeometry(s) != null,
      holdings: () => holdingsGeometry(pf.funds, pf.totalValue) != null,
      geography: () => geographyGeometry(pf.geo) != null,
    }
    return kinds.filter((k) => hasGeometry[k]()).map((kind) => ({ kind, series: s }))
  }, [pf])

  const [index, setIndex] = useState(0)
  const touchX = useRef<number | null>(null)
  const n = slides.length
  const go = (i: number) => setIndex(((i % n) + n) % n)

  if (!n) {
    return (
      <div className="gallery">
        <div className="gviewport">
          <div className="gtrack">
            <div className="gslide">
              <div className="gslide-sub">Not enough dated transactions in this statement to build the charts.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const clampedIndex = index % n
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) go(clampedIndex + (dx < 0 ? 1 : -1))
    touchX.current = null
  }

  return (
    <>
      <div className="deck-adv-tiles deck-adv-tiles-standalone gtabs" role="group" aria-label="Choose a chart">
        {slides.map((sl, i) => (
          <HoverButton
            key={i}
            className={`deck-advt${i === clampedIndex ? ' deck-advt-open' : ''}`}
            aria-current={i === clampedIndex ? 'true' : undefined}
            onClick={() => go(i)}
          >
            {SHORT_LABEL[sl.kind]}
          </HoverButton>
        ))}
      </div>
      <div className="gallery">
        <button className="gbtn gprev" aria-label="Previous chart" onClick={() => go(clampedIndex - 1)}>
          ‹
        </button>
        <div className="gviewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="gtrack" id="gtrack" style={{ transform: `translateX(-${clampedIndex * 100}%)` }}>
            {slides.map((sl, i) => (
              <div className="gslide" key={i}>
                {renderSlide(sl, pf)}
              </div>
            ))}
          </div>
        </div>
        <button className="gbtn gnext" aria-label="Next chart" onClick={() => go(clampedIndex + 1)}>
          ›
        </button>
      </div>
    </>
  )
}

function renderSlide(sl: Slide, pf: Portfolio) {
  switch (sl.kind) {
    case 'invested': {
      const latest = { value: pf.totalValue, cost: pf.totalCost }
      return (
        <>
          <div className="gslide-title">Invested vs Portfolio Value</div>
          <div className="gslide-sub">How the money you’ve put in has grown, year by year since inception.</div>
          <InvestedChart series={sl.series} latest={latest} />
          <div className="gslide-cap">{investedCaption(sl.series, latest)}</div>
        </>
      )
    }
    case 'annual': {
      const geo = annualGeometry(sl.series)!
      return (
        <>
          <div className="gslide-title">Calendar-Year Returns</div>
          <div className="gslide-sub">Portfolio growth for each calendar year since inception.</div>
          <AnnualChart series={sl.series} />
          <div className="gslide-cap">{annualCaption(geo)}</div>
        </>
      )
    }
    case 'rolling':
      return (
        <>
          <div className="gslide-title">Rolling 1-Year Returns</div>
          <div className="gslide-sub">Trailing one-year return, recomputed every month across the life of the portfolio.</div>
          <RollingChart series={sl.series} />
          <div className="gslide-cap">{ROLLING_CAPTION}</div>
        </>
      )
    case 'capital':
      return (
        <>
          <div className="gslide-title">Net Capital Added by Year</div>
          <div className="gslide-sub">External money you put in (or took out) each calendar year.</div>
          <CapitalChart series={sl.series} />
          <div className="gslide-cap">{CAPITAL_CAPTION}</div>
        </>
      )
    case 'holdings': {
      const geo = holdingsGeometry(pf.funds, pf.totalValue)!
      return (
        <>
          <div className="gslide-title">Holdings by Value</div>
          <div className="gslide-sub">Your current positions, largest first — a read on concentration.</div>
          <HoldingsChart funds={pf.funds} totalValue={pf.totalValue} />
          <div className="gslide-cap">{holdingsCaption(geo)}</div>
        </>
      )
    }
    case 'geography': {
      const geo = geographyGeometry(pf.geo)!
      return (
        <>
          <div className="gslide-title">Geographical Concentration</div>
          <div className="gslide-sub">Where your money is actually invested — a look-through to the countries behind every fund.</div>
          <GeographyChart geo={pf.geo} />
          <div className="gslide-cap">{geographyCaption(geo)}</div>
        </>
      )
    }
  }
}
