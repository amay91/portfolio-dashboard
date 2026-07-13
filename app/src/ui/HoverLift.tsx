import type { ComponentPropsWithoutRef } from 'react'

// Shared hover-lift treatment for every boxed surface in the dashboard — KPI
// tiles, cards, fund cards, section buttons, legend rows, the data-check
// banner. Scale + a softened, more diffuse shadow. NOT applied to table rows
// (scaling a <tr> breaks the table's grid layout) — see docs/DECISIONS.md
// "Hover-lift on every boxed element".
//
// Plain CSS `.hover-lift` (app.css) instead of framer-motion (review item
// C5) — a `:hover`-driven scale/shadow doesn't need a 35KB-gzip animation
// library or per-instance JS state; the "settles with a slight overshoot"
// character is a back-out cubic-bezier easing instead of a spring
// simulation. `prefers-reduced-motion` is handled in CSS too — the
// reduced-motion media query in app.css both disables the transition *and*
// zeroes the hover transform/shadow outright, matching the old
// `useReducedMotion() ? undefined : HOVER_STATE` behavior (no effect at
// all, not just an instant one).
function withHoverLift(className?: string) {
  return className ? `hover-lift ${className}` : 'hover-lift'
}

export function HoverDiv({ className, ...rest }: ComponentPropsWithoutRef<'div'>) {
  return <div className={withHoverLift(className)} {...rest} />
}

export function HoverArticle({ className, ...rest }: ComponentPropsWithoutRef<'article'>) {
  return <article className={withHoverLift(className)} {...rest} />
}

export function HoverButton({ className, ...rest }: ComponentPropsWithoutRef<'button'>) {
  return <button className={withHoverLift(className)} {...rest} />
}
