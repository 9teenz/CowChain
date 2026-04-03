import { test, expect } from '@playwright/test'

test('dashboard home renders hero content', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Tokenize herd ownership/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Open Marketplace/i })).toBeVisible()
})
