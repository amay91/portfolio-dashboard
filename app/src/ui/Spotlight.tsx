import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface SpotlightRequest {
  targetIds: string[]
  label: ReactNode
  body: ReactNode
}

const MARGIN = 12
const STANDARD_WIDTH = 300
// Below this, a box would wrap into too many short, hard-to-read lines to
// be worth placing outside the dashboard rather than centered over the
// target.
const MIN_OUTSIDE_WIDTH = 150

// "Reading the Dashboard" navigation: clicking one of that panel's 5 items
// (ReadingDashboardContent.tsx) closes the help modal, scrolls to and
// briefly highlights the matching live dashboard element(s), and shows the
// same explanatory text next to it — so a reader can see exactly which part
// of the page an explanation refers to, in place, rather than having to
// mentally map help-menu prose onto the dashboard themselves.
//
// Deliberately imperative DOM lookup (`document.getElementById`) rather than
// prop-threading refs down through every targetable component — the target
// set (KPI rail, a chart card, a table, the Portfolio Analysis button row,
// the Commentary section) spans several unrelated component trees several
// levels deep, and each already has (or now has) a stable `id` for exactly
// this purpose; a ref-threading alternative would mean touching every one of
// those components' prop signatures instead of just adding one attribute
// each. `targetIds` supports more than one id so a single explanation (e.g.
// "Top holdings and Allocation", two separate cards) can highlight both at
// once, sharing one popover positioned against their combined bounding box.
export function Spotlight({ request, onDismiss }: { request: SpotlightRequest | null; onDismiss: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)
  // Mobile-only: the "X" closes the popover but leaves the highlight lit
  // (see the dismiss-handling comment below) — separate from `request`,
  // which drives the highlight, so the two can be dismissed independently.
  // Reset to true whenever a new request comes in.
  const [popupVisible, setPopupVisible] = useState(true)
  const popRef = useRef<HTMLDivElement>(null)
  // Tracks whatever shift is currently applied to #app, so the position
  // effect below can compute the dashboard's *true* unshifted position
  // mathematically (subtracting this) instead of resetting the DOM and
  // re-measuring on every call — see that effect's comment for why the
  // reset-and-remeasure version visibly jittered.
  const shiftRef = useRef(0)
  // Whether the *current* placement is "outside the dashboard" (desktop-
  // like, room enough to sit beside it) vs "centered over the target"
  // (mobile-like, no room). Read by the dismiss handlers below, which are
  // set up once per `request` in the effect after this one and need the
  // latest value without re-running just because it changed — a ref
  // avoids that stale-closure problem the same way `shiftRef` does.
  const isOutsideRef = useRef(true)

  useLayoutEffect(() => {
    if (!request) {
      setRect(null)
      setPos(null)
      return
    }
    const targets = request.targetIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    if (!targets.length) {
      onDismiss()
      return
    }
    targets.forEach((el) => el.classList.add('spotlight-target'))
    setPopupVisible(true)

    function measure() {
      const rects = targets.map((el) => el.getBoundingClientRect())
      const left = Math.min(...rects.map((r) => r.left))
      const top = Math.min(...rects.map((r) => r.top))
      const right = Math.max(...rects.map((r) => r.right))
      const bottom = Math.max(...rects.map((r) => r.bottom))
      setRect(new DOMRect(left, top, right - left, bottom - top))
    }

    measure()
    // Scrolling the very first target into view is enough to bring the
    // whole highlighted group roughly into frame even when there are two
    // (item 3's holdings+allocation pair sit side by side at desktop widths,
    // stacked on mobile — either way the first one anchors the scroll).
    targets[0].scrollIntoView({ behavior: 'smooth', block: 'center' })

    let raf = 0
    function onScrollOrResize() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    // Re-measures for the whole duration of a smooth scroll, not just once
    // at the end — the rAF throttle keeps this cheap either way.
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    // Desktop (isOutsideRef true): clicking outside the popover AND outside
    // the target ends the tour; clicking the target itself doesn't (it's
    // still usable underneath the highlight). Mobile (isOutsideRef false —
    // the popover sits centered *over* the target, per design, so it isn't
    // reachable without dismissing the popover first anyway): clicking the
    // target now *also* ends the tour, matching "remains highlighted until
    // the user clicks it, or clicks elsewhere on the dashboard" — the only
    // thing that doesn't end it there is the "X", which is handled
    // separately (it hides just the popover, keeping the highlight lit).
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node
      if (popRef.current?.contains(t)) return
      const onTarget = targets.some((el) => el.contains(t))
      if (onTarget && isOutsideRef.current) return
      onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    // A same-tick listener would catch the very click that opened this
    // spotlight (the Reading-the-Dashboard item's own onClick, which fires
    // during the same 'mousedown'->'click' sequence) and instantly dismiss
    // it — deferred registration to the next macrotask sidesteps that.
    const registerTimer = window.setTimeout(() => document.addEventListener('mousedown', onPointerDown), 0)

    return () => {
      window.clearTimeout(registerTimer)
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      cancelAnimationFrame(raf)
      targets.forEach((el) => el.classList.remove('spotlight-target'))
    }
  }, [request, onDismiss])

  // Second pass: now that the popover itself has rendered (once `rect` is
  // set), measure its own size to place it without overflowing the
  // viewport — same two-pass measure-then-position technique as
  // InfoTip.tsx's off-screen clamp, and for the same reason (can't know a
  // box's rendered size before it's rendered).
  //
  // Genuinely *outside* the dashboard when there's room — its right edge
  // flush against `.deck-frame`'s own left edge (shared by CommandDeck's
  // "Summary Portfolio" card and PortfolioAnalysis's "Your Portfolio
  // Analysis" card) — never overlapping it. `.deck-frame`'s own left
  // margin is the box's natural width budget: at typical desktop widths
  // (the 1080px-max-width column leaves maybe 80-150px of gutter on a
  // ~1280-1400px-wide window) there usually isn't literal room for a
  // 300px box beside it without running off the left of the screen, so
  // `#app` itself is nudged right by exactly the shortfall via a
  // `transform: translateX(...)`, opening genuine, guaranteed room —
  // capped so the shift never pushes the dashboard's own right edge past
  // the viewport (which would just move the overlap problem to running
  // off the other side instead of fixing it). On viewports too narrow for
  // the dashboard AND a readable box to coexist at all even with a
  // maximal safe shift (mobile, essentially, where the dashboard already
  // runs edge to edge) — overlap is explicitly fine there — the box is
  // instead centered directly over the target, standard width capped to
  // the viewport.
  //
  // This effect re-runs on every scroll-triggered remeasure above — many
  // times during a single ~300ms smooth `scrollIntoView` — so it
  // deliberately does NOT reset `#app`'s transform to '' and re-measure
  // from scratch on every call: `#app` has a `transition` on `transform`
  // for the visible "nudge", and repeatedly toggling it off-then-on-again
  // across dozens of calls restarted that transition each time, producing
  // visible jitter instead of one clean settle (confirmed by watching it
  // happen, not assumed). Instead `shiftRef` tracks whatever shift is
  // *currently* applied, so the dashboard's true unshifted position is
  // computed by subtracting it from the live rect — no DOM write at all
  // unless the target shift amount has actually changed.
  useLayoutEffect(() => {
    const main = document.getElementById('app')
    if (!rect || !popRef.current) {
      if (main) main.style.transform = ''
      shiftRef.current = 0
      setPos(null)
      return
    }
    const popEl = popRef.current
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight

    const frame = document.querySelector('.deck-frame')
    const liveRect = frame ? frame.getBoundingClientRect() : null
    const naturalRect = liveRect ? new DOMRect(liveRect.left - shiftRef.current, liveRect.top, liveRect.width, liveRect.height) : null

    let shift = 0
    let placedOutside = false
    if (naturalRect) {
      const naturalGutter = naturalRect.left - MARGIN
      if (naturalGutter >= MIN_OUTSIDE_WIDTH) {
        placedOutside = true
      } else if (naturalGutter < STANDARD_WIDTH) {
        const needed = STANDARD_WIDTH - naturalGutter
        const maxSafeShift = Math.max(0, vw - MARGIN - naturalRect.right)
        const candidate = Math.min(needed, maxSafeShift)
        if (naturalGutter + candidate >= MIN_OUTSIDE_WIDTH) {
          shift = candidate
          placedOutside = true
        }
      }
    }
    if (main && shift !== shiftRef.current) {
      main.style.transform = shift > 0 ? `translateX(${shift}px)` : ''
      shiftRef.current = shift
    }
    isOutsideRef.current = placedOutside

    const frameLeft = naturalRect ? naturalRect.left + shift : 0
    const outsideRoom = frameLeft - MARGIN

    let width: number
    let left: number
    if (placedOutside) {
      width = Math.min(STANDARD_WIDTH, outsideRoom)
      left = frameLeft - width
    } else {
      // Centered over the target, not squeezed below it — overlap is fine
      // here (there's no non-overlapping option left once outside
      // placement isn't possible at all), and it reads more like a single
      // coach-mark than an oddly-offset label.
      width = Math.min(STANDARD_WIDTH, vw - MARGIN * 2)
      left = Math.max(MARGIN, (vw - width) / 2)
    }
    popEl.style.width = `${width}px`
    const popH = popEl.offsetHeight // forces layout at the new width before this is read

    const idealTop = rect.top + rect.height / 2 - popH / 2
    const top = Math.min(Math.max(idealTop, MARGIN), Math.max(MARGIN, vh - popH - MARGIN))
    setPos({ left, top, width })
  }, [rect])

  if (!request || !rect) return null

  return (
    <>
      {popupVisible && (
        <div
          ref={popRef}
          className="spotlight-pop"
          role="dialog"
          aria-label={typeof request.label === 'string' ? request.label : undefined}
          style={{ left: pos?.left ?? rect.left, top: pos?.top ?? rect.top, width: pos?.width, visibility: pos ? 'visible' : 'hidden' }}
        >
          <button
            className="spotlight-close"
            onClick={() => (isOutsideRef.current ? onDismiss() : setPopupVisible(false))}
            aria-label="Close"
          >
            ×
          </button>
          <p className="spotlight-label">{request.label}</p>
          <p className="spotlight-body">{request.body}</p>
        </div>
      )}
    </>
  )
}
