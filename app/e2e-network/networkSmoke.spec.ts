import { expect, test } from '@playwright/test'

// Testing-plan item #5: a real-browser, real-network reliability smoke test.
// Everything else in this repo's test suites (Vitest unit specs, the T1
// Playwright e2e smoke in e2e/) fetch-mocks every live data source — by
// design (docs/TESTING.md: "no real network in the suite"), so none of them
// can ever catch an actual upstream outage or API shape change at
// AMFI/mf.captnemo.in/mfapi.in. This test is the one place that lets those
// real requests fly, from a real browser (matching this session's own
// established rule that CORS/connection-pooling bugs only ever show up
// live, never in Node/jsdom).
//
// Deliberately isolated from both `npm test` (Vitest) and `npm run test:e2e`
// (the CI-covered e2e/ suite, via its own playwright.config.ts testDir) —
// this lives in e2e-network/ with its own config and its own npm script, so
// it is NEVER picked up by CI (see .github/workflows/ci.yml, which only
// invokes `npm run test:e2e`). Real network flakiness in a CI-blocking test
// would be a liability, not a safety net — this is meant to be run by hand,
// periodically, exactly as the testing plan asked for. Run it with:
//
//   npm run test:network-smoke
//
test.describe('real-network reliability smoke (manual/periodic — never runs in CI)', () => {
  test('sample portfolio resolves live NAVs against the real internet', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    await page.getByRole('button', { name: 'Clear Data — Reset Dashboard' }).click()

    // Real sequential mfapi.in/captnemo/AMFI calls (see resolve.ts) can take
    // a while under real network conditions — this session measured a cold
    // first request up to ~17s on its own.
    await expect(page.getByText(/Data check passed|Data check failed/)).toBeVisible({ timeout: 60000 })

    const dataCheckText = (await page.locator('text=/Data check (passed|failed)/').first().textContent()) || ''
    const mastMeta = (await page.locator('.deck-mast-meta').textContent()) || ''
    console.log(`[network-smoke] Data Check: ${dataCheckText.trim()}`)
    console.log(`[network-smoke] Masthead meta: ${mastMeta.trim()}`)
    console.log(`[network-smoke] Console errors seen: ${consoleErrors.length}`)
    for (const e of consoleErrors) console.log(`[network-smoke]   - ${e}`)

    // The bar for a *smoke* test is reachability, not a perfect per-fund
    // match — that's what the match-audit tool (tools/matchAudit.spec.ts)
    // and the 100-fund coverage sweep are for. This only fails if every live
    // source was unreachable, i.e. the dashboard fell all the way back to
    // statement-only values, which is the one outcome that means "the whole
    // live-NAV pipeline is down."
    await expect(page.locator('.deck-mast-meta')).not.toContainText('Statement values')
    expect(mastMeta).toContain('Live NAV')

    // A real, non-empty total rendered — not a blank/error state.
    await expect(page.locator('.deck-val').first()).not.toHaveText('')
  })
})
