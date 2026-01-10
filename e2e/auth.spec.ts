import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('StudyFlow')).toBeVisible()
    await expect(page.getByText(/войдите в свой аккаунт/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/пароль/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible()
  })

  test('should show register page', async ({ page }) => {
    await page.goto('/register')

    await expect(page.getByText('Регистрация')).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^пароль$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /зарегистрироваться/i })).toBeVisible()
  })

  test('should navigate from login to register', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('link', { name: /создать аккаунт/i }).click()

    await expect(page).toHaveURL('/register')
  })

  test('should navigate from register to login', async ({ page }) => {
    await page.goto('/register')

    await page.getByRole('link', { name: /войти/i }).click()

    await expect(page).toHaveURL('/login')
  })

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/пароль/i).fill('wrongpassword')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()

    // Wait for error message
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10000 })
  })

  test('should show error for empty fields on registration', async ({ page }) => {
    await page.goto('/register')

    await page.getByRole('button', { name: /зарегистрироваться/i }).click()

    // HTML5 validation should prevent submission
    const emailInput = page.getByLabel(/email/i)
    await expect(emailInput).toHaveAttribute('required', '')
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/board')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show forgot password page', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('link', { name: /забыли пароль/i }).click()

    await expect(page).toHaveURL('/forgot-password')
  })

  test('should show Google sign-in button on login page', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
  })

  test('should show Google sign-in button on register page', async ({ page }) => {
    await page.goto('/register')

    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
  })

  test('should have divider between form and OAuth on login', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText(/или/i)).toBeVisible()
  })
})
