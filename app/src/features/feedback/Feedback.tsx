import { useRef, useState } from 'react'
import { ModalShell } from '../../ui/primitives/ModalShell'
import { resolveFeedbackEndpoint } from './feedbackEndpoint'

export type FeedbackCategory = 'Bug Report' | 'Feature Request' | 'General Feedback'
const CATEGORIES: FeedbackCategory[] = ['Bug Report', 'Feature Request', 'General Feedback']
const EDGE_FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL as string | undefined
const FEEDBACK_ENDPOINT = resolveFeedbackEndpoint(EDGE_FEEDBACK_URL, import.meta.env.DEV)
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
        // Accept: application/json is what makes Formspree respond with JSON
        // instead of redirecting (its default, form-post-without-JS
        // behaviour) — inert for the other two endpoints, which just read
        // request.json() regardless of Accept.
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ category, message }),
      })
      // Formspree's validation-error shape is `{ errors: [{ message, ... }] }`,
      // not the local/edge endpoints' `{ error: string }` — checking both
      // means a Formspree rejection still surfaces a real message instead of
      // silently falling through to the generic one below.
      const data = await res.json().catch(() => ({}) as { error?: string; errors?: { message?: string }[] })
      if (!res.ok) throw new Error(data.error || data.errors?.[0]?.message || 'Something went wrong.')
      setState('sent')
      setMessage('')
    } catch (err) {
      setState('error')
      const msg = (err as Error).message
      setErrorMsg(
        msg === 'Failed to fetch'
          ? EDGE_FEEDBACK_URL || !import.meta.env.DEV
            ? 'Couldn’t send feedback right now — please try again in a moment.'
            : 'Couldn’t reach the feedback server at 127.0.0.1:8766. Start it with  cd server && npm install && npm start  then try again.'
          : msg,
      )
    }
  }

  if (!open) return null

  return (
    <ModalShell
      titleId="feedback-title"
      title="Send Feedback"
      onClose={close}
      overlayClassName="feedback-overlay"
      modalClassName="feedback-modal"
      headClassName="feedback-modal-head"
      initialFocusRef={textareaRef}
    >
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
    </ModalShell>
  )
}
