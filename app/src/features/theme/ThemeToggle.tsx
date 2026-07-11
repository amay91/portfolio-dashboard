import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
const STORAGE_KEY = 'theme'

function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage unavailable (e.g. a private-browsing edge case) — fall through to the default.
  }
  return (document.documentElement.dataset.theme as Theme) || 'dark'
}

// Toggles the whole dashboard between "Terminal Deck" (dark) and "The
// Ledger" (light) — see docs/DECISIONS.md "Dark/Light theme toggle". This
// component owns only its own label/icon; the actual visual flip is a pure
// CSS cascade off the data-theme attribute (tokens.css), so it's effectively
// instant regardless of how much of the dashboard is on screen.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // best-effort persistence only
    }
  }, [theme])

  // The label/icon always name the mode a click switches TO, not the current one.
  const switchTo: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button className="deck-btn" onClick={() => setTheme(switchTo)} title={`Switch to ${switchTo === 'dark' ? 'Terminal Deck' : 'The Ledger'}`}>
      {switchTo === 'dark' ? (
        <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      ) : (
        <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 1.5v3M12 19.5v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1.5 12h3M19.5 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
        </svg>
      )}
      {switchTo === 'dark' ? 'Dark Mode' : 'Light Mode'}
    </button>
  )
}
