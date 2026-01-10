/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test'

// Extend base test with authenticated fixture
export const test = base.extend<{ authenticatedPage: void }>({
  authenticatedPage: async ({ page }, use) => {
    // This fixture can be used to set up authentication
    // For now, we'll use a test account that should exist in the test environment
    // In a real setup, you'd create test users or use a test account

    await page.goto('/login')

    // Use test credentials (should be configured in test environment)
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com'
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123'

    await page.getByLabel(/email/i).fill(testEmail)
    await page.getByLabel(/пароль/i).fill(testPassword)
    await page.getByRole('button', { name: /войти/i }).click()

    // Wait for redirect to board
    await page.waitForURL('/board', { timeout: 15000 })

    await use()
  },
})

export { expect }
