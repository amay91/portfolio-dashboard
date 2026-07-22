import type { ReactNode } from 'react'

// The eyebrow/title/[subtitle]/content shell shared by every Portfolio
// Analysis section (review item C1) — App.tsx used to repeat this exact
// `<section><div className="wrap">...</div></section>` structure six times
// with only the id/copy/child component varying. `sec-anim-in` (review item
// #7) plays a quiet fade-up the instant this mounts — App.tsx only mounts a
// Section when its accordion entry opens, so this doubles as the section's
// "expand" motion with no extra state (see app.css's comment on
// .sec-anim-in for why enter-only is the deliberate scope).
export function Section({ id, eyebrow, title, subtitle, children }: { id: string; eyebrow: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section id={id} className="sec-anim-in">
      <div className="wrap">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="sec-title">{title}</h2>
        {subtitle && <p className="sec-sub">{subtitle}</p>}
        {children}
      </div>
    </section>
  )
}
