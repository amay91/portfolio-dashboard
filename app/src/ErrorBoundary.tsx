import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  // Any value that changes when the caller has just loaded fresh data (App.tsx
  // passes `pf`, a new object on every successful pipeline run) — on change,
  // an already-tripped boundary clears itself and gives the new children a
  // fresh render, so "Clear Data — Reset Dashboard" (in UploadBar, deliberately
  // rendered *outside* this boundary — see App.tsx) is a real recovery path,
  // not just a page reload.
  resetKey: unknown
}

interface State {
  hasError: boolean
  resetKey: unknown
}

// Catches a render error anywhere in the dashboard (review item C4) — messy
// real-world statement data reaching an edge case the engine/UI didn't
// anticipate previously blanked the entire page, upload bar and all, with no
// way back short of a manual reload. Scoped to wrap only the dashboard
// content (App.tsx), not UploadBar/ThemeToggle/HelpMenu, so the actual
// recovery controls stay on screen and functional. React error boundaries
// have no hook equivalent — a class component is the only way to implement
// getDerivedStateFromError/componentDidCatch.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, resetKey: undefined }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  // Resets on a resetKey change via getDerivedStateFromProps (runs before
  // render, single pass) rather than a componentDidUpdate + setState — that
  // pattern works but forces an extra render cycle purely to un-trip a flag.
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { hasError: false, resetKey: props.resetKey }
    return null
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error('Dashboard render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="wrap empty-state">
          <div className="empty-state-icon err">!</div>
          <p className="empty-state-head">Something went wrong showing this</p>
          <p className="empty-state-sub">
            Your statement never left your device, and nothing was lost — this is a display bug, not a data problem. Try{' '}
            <b>Clear Data — Reset Dashboard</b> above, or reload the page.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
