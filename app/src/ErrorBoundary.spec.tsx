import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

// Real client render (not renderToStaticMarkup) — getDerivedStateFromError/
// componentDidCatch are runtime error-recovery behavior a static render
// never exercises. Same technique as Feedback.spec.tsx.
function Bomb({ throwError }: { throwError: boolean }) {
  if (throwError) throw new Error('boom')
  return <div className="ok-child">ok</div>
}

describe('ErrorBoundary', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it('renders children normally when nothing throws', () => {
    act(() => {
      root.render(
        <ErrorBoundary resetKey="a">
          <Bomb throwError={false} />
        </ErrorBoundary>,
      )
    })
    expect(container.querySelector('.ok-child')).not.toBeNull()
    expect(container.querySelector('.empty-state')).toBeNull()
  })

  it('shows the friendly fallback instead of blanking the page when a child throws', () => {
    act(() => {
      root.render(
        <ErrorBoundary resetKey="a">
          <Bomb throwError={true} />
        </ErrorBoundary>,
      )
    })
    expect(container.querySelector('.ok-child')).toBeNull()
    expect(container.textContent).toContain('Something went wrong showing this')
    expect(container.textContent).toContain('Clear Data')
  })

  it('clears the error and renders fresh children when resetKey changes', () => {
    act(() => {
      root.render(
        <ErrorBoundary resetKey="a">
          <Bomb throwError={true} />
        </ErrorBoundary>,
      )
    })
    expect(container.textContent).toContain('Something went wrong showing this')

    act(() => {
      root.render(
        <ErrorBoundary resetKey="b">
          <Bomb throwError={false} />
        </ErrorBoundary>,
      )
    })
    expect(container.querySelector('.ok-child')).not.toBeNull()
    expect(container.textContent).not.toContain('Something went wrong showing this')
  })

  it('does not reset when resetKey is unchanged', () => {
    act(() => {
      root.render(
        <ErrorBoundary resetKey="a">
          <Bomb throwError={true} />
        </ErrorBoundary>,
      )
    })
    act(() => {
      root.render(
        <ErrorBoundary resetKey="a">
          <Bomb throwError={false} />
        </ErrorBoundary>,
      )
    })
    expect(container.textContent).toContain('Something went wrong showing this')
  })
})
