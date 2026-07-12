import { useEffect } from 'react'
import { HoverButton } from '../../ui/HoverLift'

// A floating Privacy button (bottom-right corner — the one edge position
// ThemeToggle's top-right and Feedback's vertically-centered right-edge
// buttons don't already occupy) that opens a short, standalone privacy
// statement — task D2. Deliberately distinct from Notes.tsx's "Method &
// Caveats" document: that's a long methods reference, gated behind opening
// the Method Notes section and requiring a loaded portfolio; this is a
// handful of sentences, always one tap away regardless of whether a
// statement has been uploaded yet (mounted outside the `pf &&` gate in
// App.tsx, same as ThemeToggle/Feedback).
//
// Every claim below is enforced by a real test, not just written down:
// marketdata/egress.spec.ts spies on every `fetch()` call resolveLiveNavs()/
// fetchNiftyBenchmark() make and asserts (a) the host is one of exactly
// www.amfiindia.com / mf.captnemo.in / api.mfapi.in / 127.0.0.1, and (b) no
// folio number or rupee amount ever appears in a request URL — only ISIN or
// fund name does, which is the one thing a live NAV lookup actually needs.
export function PrivacyNote({ open, onOpenChange, onOpenMethodNotes }: { open: boolean; onOpenChange: (open: boolean) => void; onOpenMethodNotes?: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  return (
    <>
      <div className="privacy-corner">
        <HoverButton className="deck-btn" onClick={() => onOpenChange(true)}>
          <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Privacy
        </HoverButton>
      </div>
      {open && (
        <div className="feedback-overlay" onClick={() => onOpenChange(false)}>
          <div className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-modal-head">
              <p id="privacy-title" className="deck-sec">
                Your Privacy
              </p>
              <button className="feedback-close" onClick={() => onOpenChange(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="privacy-body">
              <p>
                Your CAS statement never leaves this device. Every PDF, MarkItDown file, or pasted statement is parsed entirely in your browser — nothing is uploaded
                anywhere.
              </p>
              <p>
                The only network requests this dashboard makes are NAV lookups — by <b>ISIN or fund name only</b> — to AMFI, mf.captnemo.in, and mfapi.in, to fetch each
                fund's latest published price. Your name, folio numbers, holdings, and transaction amounts are never sent in those requests.
              </p>
              <p>
                If you use the optional MarkItDown conversion or Feedback form, those talk only to a small server running on your own machine (<code>127.0.0.1</code>) —
                never a third party.
              </p>
              {onOpenMethodNotes && (
                <p className="privacy-footnote">
                  For how the figures themselves are calculated, see{' '}
                  <button
                    className="deck-ilink"
                    onClick={() => {
                      onOpenChange(false)
                      onOpenMethodNotes()
                    }}
                  >
                    Method Notes
                  </button>
                  .
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
