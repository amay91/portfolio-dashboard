import { useEffect, useRef, useState } from 'react'
import { HoverButton } from '../../ui/HoverLift'
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

const DESKTOP_QUERY = '(min-width: 781px)'
const MIN_TOP = 16

// Top-left help menu: Instructions / Reading the Dashboard / Privacy and
// Data / FAQ. Permanently visible on desktop (the items render inline, no
// toggle — see app.css: .help-menu-corner .help-menu-toggle is scoped so it
// reliably beats .deck-btn's `display: inline-flex` regardless of CSS file
// import order); collapses behind a "Menu" toggle button on narrow screens.
// Mounted outside the `pf &&` gate in App.tsx (same as ThemeToggle/
// Feedback), so it's available from first paint regardless of whether a
// statement has been uploaded yet.
//
// Desktop vertical position tracks the top of the "Sample Portfolio
// Summary" box (.deck-frame, rendered by CommandDeck) rather than sitting
// fixed at the viewport top: it starts level with that box, then behaves
// like position:sticky (stays in view) once the user scrolls past it. True
// CSS `position: sticky` isn't usable here — this element isn't a flow
// sibling of .deck-frame (it's a fixed-position overlay so it can sit in
// the page's left margin, outside the centered 1080px column) — so the
// same visual effect is reproduced by reading .deck-frame's live
// viewport-relative top (already scroll-adjusted by getBoundingClientRect)
// on scroll/resize/content-reflow and clamping it to a 16px minimum.
export function HelpMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState<PanelId | null>(null)
  const [top, setTop] = useState(MIN_TOP)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function updateTop() {
      const isDesktop = typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY).matches : true
      if (!isDesktop) {
        setTop(MIN_TOP)
        return
      }
      const target = document.querySelector('.deck-frame')
      if (!target) {
        setTop(MIN_TOP)
        return
      }
      setTop(Math.max(MIN_TOP, target.getBoundingClientRect().top))
    }

    let raf = 0
    function scheduleUpdate() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(updateTop)
    }

    updateTop()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    // Catches content reflow that isn't a scroll/resize (e.g. the sample
    // portfolio finishing its first load, replacing EmptyState with the
    // full dashboard and pushing .deck-frame's on-screen position).
    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleUpdate)
      observer.observe(document.body)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      observer?.disconnect()
    }
  }, [])

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
      <div className="help-menu-corner" ref={menuRef} style={{ top }}>
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
          <HoverButton className="deck-btn" onClick={() => open('reading')}>
            Reading the Dashboard
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
              {active === 'reading' && <ReadingDashboardContent />}
              {active === 'privacy' && <PrivacyDataContent />}
              {active === 'faq' && <FaqContent />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
