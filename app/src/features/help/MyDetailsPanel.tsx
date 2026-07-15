import { useEffect, useRef, useState } from 'react'
import type { MyDetails } from './myDetails'

type FieldKey = keyof MyDetails

// Quick-fill for the two text fields CAMS's own CAS request form actually
// requires: an email address, and a password of the investor's own choosing
// to protect the resulting PDF (verified 2026-07-15 directly against the
// live form at camsonline.com — "EMAIL *", "PASSWORD *" with its own
// 6-char/2-digit rule, "CONFIRM PASSWORD *"; PAN is a separate, clearly
// optional field, not the password — an earlier version of this panel
// wrongly conflated the two). Typed once here, then copied field-by-field
// into CAMS's form instead of re-typed from memory each time a fresh
// statement is needed — this dashboard can't submit that form itself (it
// has a CAPTCHA, out of scope to bypass), so a same-tab copy-paste aid is
// the friction reduction that's actually available. The password typed
// here doubles as a genuine convenience later too: it's the same string
// the dashboard's own upload flow asks for when unlocking the downloaded,
// password-protected PDF.
//
// `value`/`onChange` are owned by HelpMenu (lifted there, not local state
// here) specifically so the fields survive closing and reopening this
// panel within the same tab — but deliberately go no further than that:
// no localStorage, no IndexedDB. PrivacyDataContent.tsx makes an explicit,
// tested claim that nothing here is ever written to disk or sent anywhere,
// only kept in the browser's memory for as long as the tab stays open. See
// tasks.md.
export function MyDetailsPanel({ value, onChange }: { value: MyDetails; onChange: (next: MyDetails) => void }) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [copied, setCopied] = useState<FieldKey | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const copiedTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  function flash(field: FieldKey) {
    window.clearTimeout(copiedTimer.current)
    setCopied(field)
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1500)
  }

  function copyField(field: FieldKey) {
    const text = value[field]
    if (!text) return
    const ref = field === 'email' ? emailRef : passwordRef
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => flash(field))
        .catch(() => {
          // Clipboard permission can be denied in some embedded/preview
          // contexts — selecting the text still lets the user Ctrl/Cmd+C it
          // manually, so this isn't a dead end even when the API call fails.
          ref.current?.select()
          flash(field)
        })
    } else if (ref.current) {
      ref.current.select()
      try {
        document.execCommand('copy')
      } catch {
        // Older/unsupported browser — the selection above is still useful.
      }
      flash(field)
    }
  }

  return (
    <div className="mydetails">
      <p className="mydetails-note">
        Fill this in once, then use the <b>Copy</b> buttons to paste each field into the matching box on CAMS's own form as you go through the steps below. Stays only in this
        browser tab's memory (see <b>Privacy and Data</b>) — never saved to disk, never sent anywhere.
      </p>
      <div className="mydetails-row">
        <label htmlFor="mydetails-email">Email</label>
        <div className="mydetails-field">
          <div className="mydetails-input-wrap">
            <input
              id="mydetails-email"
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={value.email}
              onChange={(e) => onChange({ ...value, email: e.target.value })}
            />
          </div>
          <button type="button" className="mydetails-copy" onClick={() => copyField('email')} disabled={!value.email}>
            {copied === 'email' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="mydetails-row">
        <label htmlFor="mydetails-password">PDF password (your choice — you'll set this on CAMS's form)</label>
        <div className="mydetails-field">
          <div className="mydetails-input-wrap">
            <input
              id="mydetails-password"
              ref={passwordRef}
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="off"
              placeholder="6+ characters, at least 2 numbers"
              value={value.password}
              onChange={(e) => onChange({ ...value, password: e.target.value })}
            />
            <button type="button" className="mydetails-eye" onClick={() => setPasswordVisible((v) => !v)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>
              <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                {passwordVisible ? (
                  <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.9 4.24A10.9 10.9 0 0 1 12 4c5.5 0 9.5 4 11 8-.6 1.7-1.6 3.3-3 4.6M6.3 6.3C4 7.8 2.4 9.8 1 12c1.5 4 5.5 8 11 8 1.3 0 2.5-.2 3.7-.6" />
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <button type="button" className="mydetails-copy" onClick={() => copyField('password')} disabled={!value.password}>
            {copied === 'password' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
