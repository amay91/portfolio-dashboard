import { expect, test } from '@playwright/test'
import type { Page, Route } from '@playwright/test'
import { loadSampleStatementNavs } from './sampleNavs.ts'

const NAVS = loadSampleStatementNavs()

// Bumping every statement NAV by 1% keeps every mocked "live" NAV safely
// inside navPlausible's 1/3x-3x band (engine/harmonise.ts) while still being
// a genuinely different number from the statement NAV — so a passing
// DataCheck here proves the live-NAV substitution actually happened, not
// that the app just fell back to the statement value unnoticed.
function mockLiveNavSources(page: Page) {
  return page.route('**/*', (route: Route) => {
    const url = route.request().url()
    if (url.includes('amfiindia.com')) return route.abort()
    if (url.includes('api.mfapi.in')) return route.abort() // Nifty-benchmark fetch; not asserted here
    const captnemo = /mf\.captnemo\.in\/nav\/([A-Z0-9]+)/.exec(url)
    if (captnemo) {
      const isin = captnemo[1]
      const stmtNav = NAVS[isin]
      if (stmtNav == null) return route.fulfill({ status: 404, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'not found' }) })
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ nav: +(stmtNav * 1.01).toFixed(4), date: '2026-07-01', name: null }),
      })
    }
    return route.continue()
  })
}

function abortAllLiveNavSources(page: Page) {
  return page.route('**/*', (route: Route) => {
    const url = route.request().url()
    if (url.includes('amfiindia.com') || url.includes('api.mfapi.in') || url.includes('captnemo.in')) return route.abort()
    return route.continue()
  })
}

test.describe('critical-path smoke', () => {
  test('load sample -> live NAV -> full holdings sort -> commentary -> chart gallery', async ({ page }) => {
    await mockLiveNavSources(page)
    await page.goto('/')

    // Auto-loads the fixed Sample Portfolio on mount; also exercise the
    // explicit button. sample.txt's own statement NAVs are the right ones
    // for sampleNavs.ts to mock against — no randomization in the way.
    await page.getByRole('button', { name: 'Clear Data — Reset Dashboard' }).click()

    // Live NAV update landed (S1/S3-verified hosts only; see mockLiveNavSources).
    await expect(page.getByText(/Data check passed/)).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.deck-mast-meta')).toContainText('Live NAV')

    // Toggle "advanced": open the Full Holdings section from Portfolio Analysis.
    await page.getByRole('button', { name: 'Full Holdings' }).click()
    const holdingsSection = page.locator('#holdings-full')
    await expect(holdingsSection).toBeVisible()

    // Sort a table: click the Scheme header of the full holdings table.
    const schemeHeader = holdingsSection.locator('#stable th.sortable', { hasText: 'Scheme' })
    await expect(schemeHeader).toHaveAttribute('aria-sort', 'none')
    await schemeHeader.click()
    await expect(schemeHeader).toHaveAttribute('aria-sort', 'ascending')

    // Open commentary, enter age/retirement, see generated guidance.
    await page.locator('.deck-ilink', { hasText: 'Full Commentary' }).click()
    await expect(page.locator('.commentary-body')).toBeVisible()
    await page.getByLabel('Age', { exact: true }).fill('35')
    await page.getByLabel('Target Retirement Age').fill('60')
    await expect(page.locator('.commentary-out')).toContainText('early accumulation')

    // Step through the 6-chart gallery.
    await page.getByRole('button', { name: '6-Chart Gallery' }).click()
    const gallery = page.locator('#charts')
    await expect(gallery).toBeVisible()
    const tabs = gallery.locator('.gtabs .deck-advt')
    await expect(tabs.nth(0)).toHaveAttribute('aria-current', 'true')
    await gallery.locator('.gnext').click()
    await expect(tabs.nth(1)).toHaveAttribute('aria-current', 'true')
    await expect(tabs.nth(0)).not.toHaveAttribute('aria-current', 'true')
    // Jump directly to a chart by its picker button, not just prev/next.
    // Every slide is mounted simultaneously (translated via CSS, not
    // conditionally rendered), so scope the title check to that slide index.
    await tabs.nth(3).click()
    await expect(tabs.nth(3)).toHaveAttribute('aria-current', 'true')
    await expect(gallery.locator('.gslide').nth(3).locator('.gslide-title')).toContainText('Net Capital Added by Year')
  })

  test('offline path: live sources unreachable -> statement-NAV fallback + show-on-problem data check', async ({ page }) => {
    await abortAllLiveNavSources(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Clear Data — Reset Dashboard' }).click()

    await expect(page.getByText(/Today's prices couldn't be fetched/)).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.deck-mast-meta')).toContainText('Statement values')

    // The dashboard still renders fully off statement NAVs — not a blank/error page.
    await expect(page.locator('.deck-val').first()).not.toHaveText('')
  })
})
