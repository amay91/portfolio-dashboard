import { defineConfig, devices } from '@playwright/test'

// T1: a small, critical-path e2e smoke — NOT a replacement for the 274
// Vitest unit/render specs, which already cover logic and render output in
// isolation. This exists to catch what only a real browser catches: wiring
// across component boundaries (App.tsx's state -> CommandDeck -> Portfolio
// Analysis accordion -> a lazily-mounted section), and the two-phase
// statement-then-live-NAV render sequence. Runs against a real production
// build (`vite preview`) rather than the dev server, so it also exercises
// the same static output (including the S1 CSP meta tag) a real deploy
// would serve.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
