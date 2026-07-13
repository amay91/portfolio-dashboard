import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Shared modal chrome (B3, review item) — overlay backdrop, dialog frame,
// title + close button, focus trap, and focus-restore-on-close. Extracted
// from what were two near-identical implementations (HelpMenu's info panels
// and Feedback) that had already converged on the same dialog/aria-modal/
// close-button shape but neither trapped Tab inside the modal nor returned
// focus to whatever opened it — a keyboard user tabbing past the last
// control fell through to the page behind the backdrop, and closing landed
// focus back at the top of the document instead of the triggering button.
// Callers keep their own body markup/classes (HelpMenu's scrollable
// .help-modal-body wrapper vs. Feedback's bare form) — this only owns the
// shell and its keyboard behavior.
export function ModalShell({
  titleId,
  title,
  onClose,
  overlayClassName,
  modalClassName,
  headClassName,
  initialFocusRef,
  children,
}: {
  titleId: string
  title: ReactNode
  onClose: () => void
  overlayClassName: string
  modalClassName: string
  headClassName: string
  initialFocusRef?: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const toFocus = initialFocusRef?.current ?? modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    toFocus?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !modalRef.current) return
      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      opener?.focus()
    }
    // Mount/unmount-scoped intentionally: this modal is only ever rendered
    // while open (callers gate with `{open && <ModalShell>}` / `if (!open)
    // return null`), so mount == opened and unmount == closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={overlayClassName} onClick={onClose}>
      <div className={modalClassName} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className={headClassName}>
          <p id={titleId} className="deck-sec">
            {title}
          </p>
          <button className="feedback-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
