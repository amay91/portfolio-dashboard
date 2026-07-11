import { useRef, useState } from 'react'

export interface Status {
  message: string
  isErr: boolean
}

// Mirrors App.tsx's UploadPhase — defined here (not there) so App.tsx can
// import it the same way it already imports Status, keeping this the single
// place that owns "what state is the upload bar in."
export type UploadPhase = 'idle' | 'processing' | 'done'

const IDLE_LABEL = 'Drop a CAMS / KFintech Statement Here — or Click to Browse'
const PROCESSING_LABEL = 'Please Wait - Creating Dashboard...'
const DONE_LABEL = 'Done! Dashboard Created — Click to Upload a New Statement'
const PASSWORD_LABEL = 'Password Required — Enter It Below to Continue'

function dropLabelFor(phase: UploadPhase, hasPendingPassword: boolean): string {
  // Takes priority over the normal idle/processing/done cycle — there's
  // nothing else useful to say while a password is outstanding.
  if (hasPendingPassword) return PASSWORD_LABEL
  if (phase === 'processing') return PROCESSING_LABEL
  if (phase === 'done') return DONE_LABEL
  return IDLE_LABEL
}

// The upload bar: drag-drop / click-to-browse file input (its own label
// cycles idle -> processing -> done with the upload phase, tasks.md U4),
// status line, Refresh, a conditional MarkItDown fallback (Convert +
// Instructions, shown only when the current PDF actually had an extraction
// problem — see engine/extractionQuality.ts), Clear Data / Reset Dashboard,
// and a conditional password prompt (shown whenever either ingestion path
// hits a password-protected PDF — see docs/DECISIONS.md "Password-protected
// statements"). Ported from reference/engine.js's upload-bar wiring into
// React state + callback props. The actual file -> text resolution and
// dashboard update live in App.tsx (this component is UI-only).
export function UploadBar({
  status,
  uploadPhase,
  hasExtractionProblem,
  pendingPassword,
  onFile,
  onClearAndReset,
  onRefresh,
  onConvertMarkitdown,
  onSubmitPassword,
}: {
  status: Status | null
  uploadPhase: UploadPhase
  hasExtractionProblem: boolean
  pendingPassword: { incorrect: boolean } | null
  onFile: (file: File) => void
  onClearAndReset: () => void
  onRefresh: () => void
  onConvertMarkitdown: (file: File) => void
  onSubmitPassword: (password: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const lastPdfFile = useRef<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const convertInputRef = useRef<HTMLInputElement>(null)
  const busy = uploadPhase === 'processing'

  const handleFile = (file: File) => {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (isPdf) lastPdfFile.current = file
    onFile(file)
  }

  const handleConvertClick = () => {
    if (lastPdfFile.current) onConvertMarkitdown(lastPdfFile.current)
    else convertInputRef.current?.click() // defensive fallback — shouldn't be reachable, this button only appears after a PDF was already dropped
  }

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput) return
    onSubmitPassword(passwordInput)
    setPasswordInput('')
  }

  return (
    <div className="uploadbar">
      <div className="wrap">
        <label
          className={`drop${dragOver ? ' over' : ''}`}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            // A <label> wrapping a hidden (display:none) <input> is never
            // in the tab order and doesn't forward Enter/Space to it like a
            // native <button> would — both are needed for this to be
            // keyboard-reachable at all, not just mouse-clickable.
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
        >
          <svg className="ic" viewBox="0 0 24 24">
            <path d="M12 16V4m0 0L8 8m4-4l4 4" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          <span>{dropLabelFor(uploadPhase, !!pendingPassword)}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.md,.markdown,.txt,text/markdown,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </label>
        <span className={`upload-status${status?.isErr ? ' err' : ''}`}>{status?.message || ''}</span>
        <button className={`deck-btn${busy ? ' spin' : ''}`} onClick={onRefresh} disabled={busy}>
          <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4" />
            <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
          </svg>
          Refresh
        </button>
        {hasExtractionProblem && (
          <>
            <button
              className="btn-demo"
              title="This statement didn't extract cleanly from the PDF. Converting it via MarkItDown often reads CAS tables more reliably."
              onClick={handleConvertClick}
            >
              Convert PDF to Markdown
            </button>
            <button className="btn-demo" onClick={() => setShowInstructions((v) => !v)} aria-expanded={showInstructions} aria-controls="markitdown-instructions">
              Instructions
            </button>
          </>
        )}
        <button
          className="btn-demo"
          onClick={() => {
            if (fileInputRef.current) fileInputRef.current.value = ''
            onClearAndReset()
          }}
        >
          Clear Data — Reset Dashboard
        </button>
        <input
          ref={convertInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onConvertMarkitdown(f)
          }}
        />
      </div>
      {pendingPassword && (
        <form className="upload-password-block" onSubmit={submitPassword}>
          <p>
            <b>{pendingPassword.incorrect ? 'Incorrect password — try again.' : 'This statement is password-protected.'}</b>
          </p>
          <div className="upload-password-row">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Statement Password"
              aria-label="Statement Password"
              autoFocus
            />
            <button type="submit" className="btn-demo" disabled={!passwordInput}>
              Unlock &amp; Continue
            </button>
          </div>
          <p>
            Usually your PAN in capitals (e.g. <code>AAAPZ1234C</code>), or whatever password entered on the CAMS webpage — Processed entirely on your
            device; uses your local MarkItDown bridge (127.0.0.1) if you're using that path.
          </p>
        </form>
      )}
      {hasExtractionProblem && showInstructions && (
        <div className="upload-instructions" id="markitdown-instructions">
          <p>
            <b>Setting up MarkItDown (one-time, runs entirely on your own machine):</b>
          </p>
          <ol>
            <li>
              Install it: <code>pip install "markitdown[pdf]" pypdf</code>
            </li>
            <li>
              Run the bridge and leave it running: <code>python markitdown_server.py</code>
            </li>
            <li>Click "Convert PDF to Markdown" above again.</li>
          </ol>
          <p>Listens only on 127.0.0.1:8765 (your own machine) — nothing is uploaded anywhere, and nothing is stored.</p>
        </div>
      )}
    </div>
  )
}
