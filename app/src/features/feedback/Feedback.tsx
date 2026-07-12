import { useEffect, useRef, useState } from 'react'

export type FeedbackCategory = 'Bug Report' | 'Feature Request' | 'General Feedback'
const CATEGORIES: FeedbackCategory[] = ['Bug Report', 'Feature Request', 'General Feedback']
// Local dev default: server/feedback-server.js, a companion process you run
// yourself (same "127.0.0.1 only" pattern as markitdown_server.py) — there's
// no such process on a real visitor's machine once this is deployed, so
// production sets VITE_FEEDBACK_URL to the same-origin Pages Function
// instead (`/api/feedback`, task D3 — see functions/api/feedback.ts and
// docs/DEPLOY.md). Left unset, behaviour is unchanged from before D3.
const EDGE_FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL as string | undefined
const FEEDBACK_ENDPOINT = EDGE_FEEDBACK_URL || 'http://127.0.0.1:8766/api/feedback'
const MAX_LENGTH = 5000

type SubmitState = 'idle' | 'sending' | 'sent' | 'error'

// The feedback form modal: category + free-text message, posted to
// FEEDBACK_ENDPOINT above (local companion server in dev, edge Function in
// production). This component owns only the form/request lifecycle — the
// receiving end does the actual sanitizing/forwarding.
//
// Fully controlled (`open`/`onClose`) rather than owning its own floating
// trigger button — it used to render its own right-edge corner button, but
// that's now the "Feedback" item at the bottom of HelpMenu's nav list
// (tasks.md U10), which owns the open/close state and renders this
// component conditionally.
export function Feedback({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    onClose()
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
          ? EDGE_FEEDBACK_URL
            ? 'Couldn’t send feedback right now — please try again in a moment.'
            : 'Couldn’t reach the feedback server at 127.0.0.1:8766. Start it with  cd server && npm install && npm start  then try again.'
          : msg,
      )
    }
  }

  if (!open) return null

  return (
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
  )
}
