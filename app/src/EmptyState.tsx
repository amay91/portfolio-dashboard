import type { Status } from './features/upload/UploadBar'

// Shown in the main content area before the first statement has parsed
// successfully — either still loading (initial sample fetch in flight) or
// failed to produce a portfolio (parse/network error, or an unrecognised
// file). Distinct from the upload-bar status line, which is a persistent
// one-line log; this is the primary content-area placeholder so the page
// never just renders blank.
export function EmptyState({ status }: { status: Status | null }) {
  const isError = !!status?.isErr
  return (
    <div className="wrap empty-state">
      {isError ? (
        <>
          <div className="empty-state-icon err">!</div>
          <p className="empty-state-head">Nothing to show yet</p>
          <p className="empty-state-sub">{status?.message || 'Drop a CAMS / KFintech statement above, or load the sample.'}</p>
        </>
      ) : (
        <>
          <span className="loading-spinner" aria-hidden="true" />
          <p className="empty-state-head">{status?.message || 'Loading your statement…'}</p>
        </>
      )}
    </div>
  )
}
