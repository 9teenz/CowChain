import { test, expect } from '@playwright/test'

test('signup flow handles validation and successful registration', async ({ page }) => {
  await page.goto('/signup')

  await expect(page.getByText('Create an account')).toBeVisible()

  await page.getByLabel('Full Name').fill('Alice Doe')
  await page.getByLabel('Email').fill('alice@example.com')
  await page.getByLabel('Password', { exact: true }).fill('SecretPass123')
  await page.getByLabel('Confirm Password').fill('Mismatch123')
  await page.locator('#terms').check()

  await page.getByRole('button', { name: /^Create account$/i }).click()
  await expect(page.getByText('Passwords do not match.')).toBeVisible()

  await page.getByLabel('Confirm Password').fill('SecretPass123')

  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        message: 'Account created. Check your email for verification link.',
      }),
    })
  })

  await page.getByRole('button', { name: /^Create account$/i }).click()
  await expect(page.getByText('Account created. Check your email for verification link.')).toBeVisible()

  await page.getByRole('link', { name: /Sign in/i }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Sign in to your account')).toBeVisible()
})

test('marketplace buy action redirects unauthenticated users to login with next', async ({ page }) => {
  await page.goto('/marketplace')

  await expect(page.getByRole('heading', { name: /P2P Marketplace/i })).toBeVisible()

  const quantityInputs = page.locator('tbody input[type="number"]')
  await expect(quantityInputs.first()).toBeVisible()
  await quantityInputs.first().fill('10')

  await page.locator('tbody').getByRole('button', { name: /^Buy$/ }).first().click()

  await expect(page).toHaveURL(/\/login\?next=%2Fmarketplace/)
  await expect(page.getByText('Sign in to your account')).toBeVisible()
})
