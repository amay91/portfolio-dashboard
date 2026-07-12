import { useEffect, useRef, useState } from 'react'
import { HoverButton } from '../../ui/HoverLift'
import { InstructionsContent } from './InstructionsContent'
import { PrivacyDataContent } from './PrivacyDataContent'
import { FaqContent } from './FaqContent'

type PanelId = 'instructions' | 'privacy' | 'faq'

const TITLES: Record<PanelId, string> = {
  instructions: 'Instructions',
  privacy: 'Privacy and Data',
  faq: 'FAQ',
}

// Top-left help menu: Instructions / Privacy and Data / FAQ. Permanently
// visible on desktop (the 3 items render inline, always expanded); collapses
// behind a "Menu" toggle button on narrow screens — see app.css's media
// query, which flips .help-menu-toggle/.help-menu-list visibility. Mounted
// outside the `pf &&` gate in App.tsx (same as ThemeToggle/Feedback), so
// it's available from first paint regardless of whether a statement has
// been uploaded yet.
export function HelpMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState<PanelId | null>(null)
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

  function open(id: PanelId) {
    setActive(id)
    setMenuOpen(false)
  }

  return (
    <>
      <div className="help-menu-corner" ref={menuRef}>
        <HoverButton className="deck-btn help-menu-toggle" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Menu">
          <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Menu
        </HoverButton>
        <nav className={`help-menu-list${menuOpen ? ' open' : ''}`} aria-label="Help menu">
          <HoverButton className="deck-btn" onClick={() => open('instructions')}>
            Instructions
          </HoverButton>
          <HoverButton className="deck-btn" onClick={() => open('privacy')}>
            Privacy and Data
          </HoverButton>
          <HoverButton className="deck-btn" onClick={() => open('faq')}>
            FAQ
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
              {active === 'privacy' && <PrivacyDataContent />}
              {active === 'faq' && <FaqContent />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
