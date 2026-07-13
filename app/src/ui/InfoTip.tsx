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
export function InfoTip({ text, label, align = 'center' }: { text: string; label: string; align?: 'left' | 'center' | 'right' }) {
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
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
          <circle cx="8" cy="8" r="6.6" />
          <path d="M8 7.2v4" strokeLinecap="round" />
          <circle cx="8" cy="4.8" r="0.4" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <span role="tooltip" id={id} className="infotip-pop">
        {text}
      </span>
    </span>
  )
}
