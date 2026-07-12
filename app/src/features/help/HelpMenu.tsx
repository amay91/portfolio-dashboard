import { useEffect, useRef, useState } from 'react'
import { HoverButton } from '../../ui/HoverLift'
import { useStickyToTarget } from '../../ui/useStickyToTarget'
import { Feedback } from '../feedback/Feedback'
import { InstructionsContent } from './InstructionsContent'
import { ReadingDashboardContent } from './ReadingDashboardContent'
import { PrivacyDataContent } from './PrivacyDataContent'
import { FaqContent } from './FaqContent'

type PanelId = 'instructions' | 'reading' | 'privacy' | 'faq'

const TITLES: Record<PanelId, string> = {
  instructions: 'Instructions',
  reading: 'Reading the Dashboard',
  privacy: 'Privacy and Data',
  faq: 'FAQ',
}

// Top-left help menu: Instructions / Reading the Dashboard / Privacy and
// Data / FAQ / Feedback. Permanently visible on desktop (the items render
// inline, no toggle — see app.css: .help-menu-corner .help-menu-toggle is
// scoped so it reliably beats .deck-btn's `display: inline-flex` regardless
// of CSS file import order); collapses behind a "Menu" toggle button on
// narrow screens, where Feedback drops down with the rest of the items
// rather than floating separately (tasks.md U10 — Feedback used to be its
// own right-edge corner button). Mounted outside the `pf &&` gate in
// App.tsx (same as ThemeToggle), so it's available from first paint
// regardless of whether a statement has been uploaded yet.
//
// Desktop vertical position tracks the top of the "Sample Portfolio
// Summary" box (.deck-frame, rendered by CommandDeck) via useStickyToTarget
// (ui/useStickyToTarget.ts).
//
// Feedback is a distinct modal (its own form/submit lifecycle — see
// Feedback.tsx) rather than a read-only content panel like the other four,
// so it gets its own open state (`feedbackOpen`) instead of going through
// `active`/`TITLES`/.help-modal.
export function HelpMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState<PanelId | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const top = useStickyToTarget('.deck-frame')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active])

  function openPanel(id: PanelId) {
    setActive(id)
    setMenuOpen(false)
  }

  function openFeedback() {
    setFeedbackOpen(true)
    setMenuOpen(false)
  }

  return (
    <>
      <div className="help-menu-corner" ref={menuRef} style={top !== null ? { top } : undefined}>
        <HoverButton className="deck-btn help-menu-toggle" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Menu">
          <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Menu
        </HoverButton>
        <nav className={`help-menu-list${menuOpen ? ' open' : ''}`} aria-label="Help menu">
          <HoverButton className="deck-btn" onClick={() => openPanel('instructions')}>
            Instructions
          </HoverButton>
          <HoverButton className="deck-btn" onClick={() => openPanel('reading')}>
            Reading the Dashboard
          </HoverButton>
          <HoverButton className="deck-btn" onClick={() => openPanel('privacy')}>
            Privacy and Data
          </HoverButton>
          <HoverButton className="deck-btn" onClick={() => openPanel('faq')}>
            FAQ
          </HoverButton>
          <HoverButton className="deck-btn" onClick={openFeedback}>
            Feedback
          </HoverButton>
        </nav>
      </div>
      {active && (
        <div className="help-overlay" onClick={() => setActive(null)}>
          <div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-head">
              <p id="help-modal-title" className="deck-sec">
                {TITLES[active]}
              </p>
              <button className="feedback-close" onClick={() => setActive(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="help-modal-body">
              {active === 'instructions' && <InstructionsContent />}
              {active === 'reading' && <ReadingDashboardContent />}
              {active === 'privacy' && <PrivacyDataContent />}
              {active === 'faq' && <FaqContent />}
            </div>
          </div>
        </div>
      )}
      <Feedback open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}
