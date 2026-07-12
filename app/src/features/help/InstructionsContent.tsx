import { useState } from 'react'

// A simplified, in-app redraw of the CAMS request form's key fields (see
// cams-instructions.png, the real screenshot shown as a thumbnail above
// this) — reuses the dashboard's own theme tokens so it re-themes with the
// dark/light toggle, unlike a static screenshot. Five steps, single column,
// same shape as the process-flow diagram below it for visual consistency.
function CamsStepsDiagram() {
  const steps = [
    { title: 'CAMS website', sub: 'CAS request page' },
    { title: 'Statement type', sub: 'Select detailed' },
    { title: 'Period', sub: 'Specific period' },
    { title: 'Folio listing', sub: 'With zero balance' },
    { title: 'Submit', sub: 'PDF via email' },
  ]
  const boxW = 240
  const boxH = 56
  const gapY = 60
  const x = (680 - boxW) / 2
  const cx = 680 / 2
  return (
    <svg viewBox={`0 0 680 ${steps.length * (boxH + gapY) - gapY + 80}`} role="img" aria-label="Five steps to request your CAS statement from CAMS" style={{ width: '100%', height: 'auto' }}>
      {steps.map((s, i) => {
        const y = 40 + i * (boxH + gapY)
        return (
          <g key={s.title}>
            {i > 0 && <line x1={cx} y1={y - gapY} x2={cx} y2={y} stroke="var(--line)" strokeWidth={1.5} markerEnd="url(#help-arrow)" />}
            <rect x={x} y={y} width={boxW} height={boxH} rx={8} fill={i === 0 || i === steps.length - 1 ? 'var(--card-hover)' : 'var(--card)'} stroke="var(--line)" strokeWidth={1} />
            <text x={cx} y={y + 22} textAnchor="middle" fill="var(--ink)" fontSize={13} fontWeight={600}>
              {s.title}
            </text>
            <text x={cx} y={y + 40} textAnchor="middle" fill="var(--muted)" fontSize={11.5}>
              {s.sub}
            </text>
          </g>
        )
      })}
      <defs>
        <marker id="help-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="var(--line)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
    </svg>
  )
}

export function InstructionsContent() {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="help-body">
      <h4>Download your Statement from CAMS</h4>
      <p>
        The dashboard reads a <b>Consolidated Account Statement (CAS)</b> — a single document covering every mutual fund you hold, across fund houses. CAMS and KFintech (the two
        registrars who between them service almost every Indian mutual fund) issue this jointly. Here's how to request one:
      </p>
      <ol className="help-steps">
        <li>
          Go to CAMS's CAS request page:{' '}
          <a href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement" target="_blank" rel="noopener">
            camsonline.com — Consolidated Account Statement
          </a>
          .
        </li>
        <li>
          Under <b>Statement Type</b>, choose <b>Detailed</b> (includes transaction listing) — not Summary. The dashboard needs every individual purchase and redemption to
          calculate returns; a summary-only statement can't produce them.
        </li>
        <li>
          Under <b>Period</b>, choose <b>Specific Period</b>, then set the <b>From Date</b> well before your very first investment — a few years earlier than necessary does no
          harm, and it guarantees nothing gets left out. Set the <b>To Date</b> to today.
        </li>
        <li>
          Under <b>Folio Listing</b>, choose <b>With zero balance folios</b> — this keeps any fund you've fully exited in the statement too, so the dashboard can still count its
          history toward your all-time returns (it won't show up as a current holding, but the past gains still matter).
        </li>
        <li>
          Enter your <b>email</b>, then set a <b>password</b> for the PDF — CAMS typically expects your <b>PAN</b> or a <b>PIN code</b> for this; either is fine. Click{' '}
          <b>Submit</b>.
        </li>
        <li>
          Check your email — CAMS sends the actual statement as a password-protected PDF attachment. <b>That PDF is what you upload</b> to this dashboard (the dashboard will ask
          for the same password to open it).
        </li>
      </ol>

      <button className="help-thumb" onClick={() => setLightboxOpen(true)} aria-label="Enlarge the CAMS request form screenshot">
        <img src="/cams-instructions.png" alt="The CAMS CAS request form, with Detailed, Specific Period, and With zero balance folios highlighted" />
      </button>
      <p className="help-thumb-caption">↑ Tap to enlarge — the exact form, with the fields above boxed in red.</p>

      <CamsStepsDiagram />

      {lightboxOpen && (
        <div className="help-lightbox" onClick={() => setLightboxOpen(false)}>
          <img src="/cams-instructions.png" alt="The CAMS CAS request form, enlarged" />
        </div>
      )}
    </div>
  )
}
