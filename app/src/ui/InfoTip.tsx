import { useEffect, useId, useRef, useState } from 'react'

// Small ⓘ affordance that reveals a short explanation next to a jargon term
// (review item A1). Mouse users get it on hover (pure CSS — .infotip:hover
// in app.css); touch and keyboard users get the same popover via
// click/Enter, which is why open is real state and not hover-only: hover
// alone would make these invisible on exactly the devices where a quick
// glance at the FAQ is least convenient. Escape and click-outside close it.
//
// stopPropagation on both click and keydown matters: these sit inside
// sortable <th>s (where a bubbled click/Enter would trigger a column sort)
// and inside hover-lifted cards.
// glyph: 'info' is the default ⓘ that explains a specific metric; 'help' is a
// circled "?" for the general "where do I find guidance" affordance (the
// masthead pointer to the Help menu) — a different question, so a different
// icon keeps it from reading as just another metric explainer.
export function InfoTip({ text, label, align = 'center', glyph = 'info' }: { text: string; label: string; align?: 'left' | 'center' | 'right'; glyph?: 'info' | 'help' }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // The `align` prop's left/center/right CSS positioning (app.css) was
  // tuned against 375px viewports (see A1's resolution note) and still
  // clips at 320px — none of the three fixed anchor points guarantee the
  // fixed 250px-wide popover stays fully on-screen at every combination of
  // trigger position and narrow viewport (mobile optimization M1: found by
  // auditing at 320px, not just 375px). Rather than hand-tune a 4th align
  // value, clamp the popover's actual position into the viewport once open
  // — but only for the `open` (click/touch/keyboard) path, not `:hover`,
  // which stays pure-CSS on purpose (a mouse hovering a 320px-wide window
  // isn't a real scenario worth the JS cost for every one of the ~80
  // InfoTips on the page).
  useEffect(() => {
    const anchor = ref.current
    const pop = anchor?.querySelector<HTMLElement>('.infotip-pop')
    if (!open || !anchor || !pop) return
    const anchorRect = anchor.getBoundingClientRect()
    const margin = 12
    // document.documentElement.clientWidth, not window.innerWidth — the two
    // can diverge (verified against this exact environment: 365 vs the true
    // 320px layout viewport), and clientWidth is the one that actually
    // matches the CSS pixels everything is rendered against.
    const maxLeft = document.documentElement.clientWidth - margin - pop.offsetWidth
    const centeredLeft = anchorRect.left + anchorRect.width / 2 - pop.offsetWidth / 2
    const clampedLeft = Math.max(margin, Math.min(centeredLeft, maxLeft))
    pop.style.left = `${clampedLeft - anchorRect.left}px`
    pop.style.right = 'auto'
    pop.style.transform = 'none'
    return () => {
      pop.style.left = ''
      pop.style.right = ''
      pop.style.transform = ''
    }
  }, [open])

  return (
    <span className={`infotip infotip-${align}${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {glyph === 'help' ? (
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
            <circle cx="8" cy="8" r="6.6" />
            <path d="M6.3 6.2a1.75 1.75 0 0 1 3.4.55c0 1.2-1.7 1.5-1.7 2.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8" cy="11.4" r="0.45" fill="currentColor" stroke="none" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
            <circle cx="8" cy="8" r="6.6" />
            <path d="M8 7.2v4" strokeLinecap="round" />
            <circle cx="8" cy="4.8" r="0.4" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>
      <span role="tooltip" id={id} className="infotip-pop">
        {text}
      </span>
    </span>
  )
}
