import { useEffect, useRef, useState } from 'react'
import { HoverButton } from '../../ui/HoverLift'
import { ModalShell } from '../../ui/primitives/ModalShell'
import { Feedback } from '../feedback/Feedback'
import { InstructionsContent } from './InstructionsContent'
import { ReadingDashboardContent } from './ReadingDashboardContent'
import { PrivacyDataContent } from './PrivacyDataContent'
import { FaqContent } from './FaqContent'
import type { SpotlightRequest } from '../../ui/Spotlight'

type PanelId = 'instructions' | 'reading' | 'privacy' | 'faq'

const TITLES: Record<PanelId, string> = {
  instructions: 'Instructions',
  reading: 'Reading the Dashboard',
  privacy: 'Privacy and Data',
  faq: 'FAQ',
}

// Help menu: a single "Help" button that opens a dropdown of Instructions /
// Reading the Dashboard / Privacy and Data / FAQ / Feedback. One consolidated
// affordance at every width (review item #4 — desktop used to show all five
// inline as a floating pill stack in the gutter; that read as leftover debug
// buttons). Lives in the app header bar (App.tsx), grouped with the theme
// toggle; the dropdown is right-aligned so it always opens into the screen.
// Feedback is the last item (tasks.md U10 — it used to be its own right-edge
// corner button). Mounted outside the `pf &&` gate in App.tsx (same as
// ThemeToggle), so it's available from first paint regardless of whether a
// statement has been uploaded yet.
//
// Feedback is a distinct modal (its own form/submit lifecycle — see
// Feedback.tsx) rather than a read-only content panel like the other four,
// so it gets its own open state (`feedbackOpen`) instead of going through
// `active`/`TITLES`/.help-modal.
export function HelpMenu({ onSpotlight }: { onSpotlight: (request: SpotlightRequest) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState<PanelId | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  function openPanel(id: PanelId) {
    setActive(id)
    setMenuOpen(false)
  }

  function openFeedback() {
    setFeedbackOpen(true)
    setMenuOpen(false)
  }

  // Closes this modal first — the spotlight highlights/positions itself
  // against the real dashboard underneath, which the modal's own backdrop
  // would otherwise cover.
  function spotlightAndClose(request: SpotlightRequest) {
    setActive(null)
    onSpotlight(request)
  }

  return (
    <>
      <div className="help-menu-corner" ref={menuRef}>
        <HoverButton className="deck-btn help-menu-toggle" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Help menu">
          <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.4 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.4 2.2-2.4 3.8" />
            <path d="M12 17.2h.01" />
          </svg>
          Help
          <svg className="deck-ic help-menu-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
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
        <ModalShell
          titleId="help-modal-title"
          title={TITLES[active]}
          onClose={() => setActive(null)}
          overlayClassName="help-overlay"
          modalClassName="help-modal"
          headClassName="help-modal-head"
        >
          <div className="help-modal-body">
            {active === 'instructions' && <InstructionsContent />}
            {active === 'reading' && <ReadingDashboardContent onSpotlight={spotlightAndClose} />}
            {active === 'privacy' && <PrivacyDataContent />}
            {active === 'faq' && <FaqContent />}
          </div>
        </ModalShell>
      )}
      <Feedback open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}
