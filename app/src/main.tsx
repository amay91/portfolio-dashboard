import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted (not Google Fonts) — index.html's CSP is font-src 'self', a
// deliberate choice for an app that processes real personal financial
// statements client-side. @fontsource packages bundle the actual woff2
// files as same-origin Vite assets, so both themes' fonts load without any
// external network request or CSP change. See docs/DECISIONS.md "Dark/Light
// theme toggle".
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/courier-prime/400.css'
import '@fontsource/courier-prime/700.css'
import './ui/tokens.css'
import './ui/app.css'
import './ui/deck.css'
import App from './App.tsx'

// Applies the persisted (or default) theme before the first paint — body
// has no content besides #root, so there is nothing to flash.
document.documentElement.dataset.theme = (() => {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    /* localStorage unavailable — fall through to the default */
  }
  return 'dark'
})()

// @font-face only downloads a font lazily, on first use — without this, the
// *first* theme toggle would wait on a font fetch before painting the new
// typeface. Eagerly loading both themes' fonts via the Font Loading API
// (not an index.html <link rel="preload">, which can't reference a stable
// path once Vite hashes these under dist/assets/) makes that toggle as
// instant as every one after it. Fire-and-forget: a slow/failed fetch just
// means the browser falls back to its normal lazy behavior.
if ('fonts' in document) {
  Promise.all([
    document.fonts.load('400 16px "JetBrains Mono"'),
    document.fonts.load('400 16px "Courier Prime"'),
  ]).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
