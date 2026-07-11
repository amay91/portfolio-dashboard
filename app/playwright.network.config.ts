import { defineConfig, devices } from '@playwright/test'

// Testing-plan item #5's config — see e2e-network/networkSmoke.spec.ts for
// why this is a separate config/directory from the CI-covered e2e/ suite.
// Run manually: npm run test:network-smoke
export default defineConfig({
  testDir: './e2e-network',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
