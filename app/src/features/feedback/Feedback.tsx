import { useEffect, useRef, useState } from 'react'
import { HoverButton } from '../../ui/HoverLift'

export type FeedbackCategory = 'Bug Report' | 'Feature Request' | 'General Feedback'
const CATEGORIES: FeedbackCategory[] = ['Bug Report', 'Feature Request', 'General Feedback']
const FEEDBACK_ENDPOINT = 'http://127.0.0.1:8766/api/feedback'
const MAX_LENGTH = 5000

type SubmitState = 'idle' | 'sending' | 'sent' | 'error'

// A floating Feedback button (right edge, vertically centered — matches
// ThemeToggle's fixed top-right button in size and styling, see
// docs/DECISIONS.md "Feedback system") that opens a small modal: category
// + free-text message, posted to a local companion server (server/
// feedback-server.js, same "run it yourself on 127.0.0.1" pattern as
// markitdown_server.py). This component owns only the form/request
// lifecycle — the server does the actual sanitizing/persisting.
export function Feedback() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('General Feedback')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    textareaRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    setOpen(false)
    setState('idle')
    setErrorMsg('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setState('sending')
    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setState('sent')
      setMessage('')
    } catch (err) {
      setState('error')
      const msg = (err as Error).message
      setErrorMsg(
        msg === 'Failed to fetch'
          ? 'Couldn’t reach the feedback server at 127.0.0.1:8766. Start it with  cd server && npm install && npm start  then try again.'
          : msg,
      )
    }
  }

  return (
    <>
      <div className="feedback-corner">
        <HoverButton className="deck-btn" onClick={() => setOpen(true)}>
          <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
          </svg>
          Feedback
        </HoverButton>
      </div>
      {open && (
        <div className="feedback-overlay" onClick={close}>
          <div className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-modal-head">
              <p id="feedback-title" className="deck-sec">
                Send Feedback
              </p>
              <button className="feedback-close" onClick={close} aria-label="Close">
                ×
              </button>
            </div>
            {state === 'sent' ? (
              <div className="feedback-sent">
                <p>Thanks — your feedback has been sent.</p>
                <button className="btn-demo" onClick={close}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <label className="feedback-label">
                  Category
                  <select value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="feedback-label">
                  Your feedback
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={5}
                    maxLength={MAX_LENGTH}
                    required
                  />
                </label>
                {state === 'error' && <p className="feedback-error">{errorMsg}</p>}
                <div className="feedback-actions">
                  <button type="button" className="btn-demo" onClick={close}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-demo" disabled={state === 'sending' || !message.trim()}>
                    {state === 'sending' ? 'Sending…' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
