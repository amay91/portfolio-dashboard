import { useState } from 'react'
import { buildCommentaryHTML } from './commentaryText'
import { HoverDiv } from '../../ui/HoverLift'
import type { Portfolio } from '../../engine/types'

const HINT = 'Add your age & target retirement age for a tailored, index-investing perspective'

// Collapsible Portfolio Commentary card. Ported from reference/engine.js
// initCommentary/renderCommentaryOut. `open` is controlled from App.tsx (not
// local state) so the deck's Insight card can open + scroll to this section
// (by id, "commentary-sec") via a single "Full Commentary" link. The
// generated guidance (buildCommentaryHTML) is pre-built, escaped HTML —
// rendered via a scoped dangerouslySetInnerHTML.
//
// Retirement is entered as a target AGE, not a calendar year — most people
// think "retire around 60", not "retire in 2051" — so years-to-retirement is
// simply the age difference, with no dependency on today's date.
export function Commentary({
  pf,
  open,
  onToggle,
}: {
  pf: Portfolio | null
  open: boolean
  onToggle: (open: boolean) => void
}) {
  const [age, setAge] = useState('')
  const [retireAge, setRetireAge] = useState('')

  const ageNum = parseInt(age, 10)
  const retireAgeNum = parseInt(retireAge, 10)
  const ageOK = isFinite(ageNum) && ageNum >= 16 && ageNum <= 100
  const retOK = isFinite(retireAgeNum) && retireAgeNum > ageNum && retireAgeNum <= 100

  let zLine: React.ReactNode = null
  if (ageOK && retOK) {
    zLine = (
      <>
        Years to retirement: <b>{retireAgeNum - ageNum}</b> &nbsp;({retireAgeNum} − {ageNum})
      </>
    )
  } else if (ageOK && isFinite(retireAgeNum) && retireAgeNum <= ageNum) {
    zLine = 'Target retirement age must be greater than your current age.'
  }

  return (
    <section id="commentary-sec">
      <div className="wrap">
        <HoverDiv className="commentary-card">
          <button className="commentary-head" aria-expanded={open} aria-controls="commentary-body" onClick={() => onToggle(!open)}>
            <span className="ch-title">Portfolio Commentary</span>
            <span className="ch-sub">{open ? '' : HINT}</span>
            <span className="ch-chevron">›</span>
          </button>
          {open && (
            <div className="commentary-body" id="commentary-body">
              <div className="commentary-inputs">
                <label>
                  Age
                  <input type="number" min={16} max={100} placeholder="e.g. 38" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
                </label>
                <label>
                  Target Retirement Age
                  <input type="number" min={17} max={100} placeholder="e.g. 60" inputMode="numeric" value={retireAge} onChange={(e) => setRetireAge(e.target.value)} />
                </label>
                <div className="commentary-z">{zLine}</div>
              </div>
              <div className="commentary-out">
                {ageOK && retOK ? (
                  <div dangerouslySetInnerHTML={{ __html: buildCommentaryHTML(ageNum, retireAgeNum, pf) }} />
                ) : (
                  <p className="commentary-empty">
                    Enter your age and a target retirement age above to generate commentary tailored to your horizon. The guidance draws on the low-cost, broadly-diversified
                    index-investing philosophy of John C. Bogle and the Bogleheads community.
                  </p>
                )}
              </div>
            </div>
          )}
        </HoverDiv>
      </div>
    </section>
  )
}
