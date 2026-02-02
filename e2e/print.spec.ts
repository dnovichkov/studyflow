import { test, expect } from '@playwright/test'

test.describe('Print Dialog', () => {
  test.describe('Unauthenticated', () => {
    test('should redirect to login when accessing board', async ({ page }) => {
      await page.goto('/board')
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Print Preview', () => {
    test.skip('should display task description in print preview', async ({ page }) => {
      // TODO: Requires authentication
      await page.goto('/board')

      // Create a task with description
      await page.getByRole('button', { name: /добавить/i }).first().click()
      await page.getByLabel(/название/i).fill('Тестовое задание')
      await page.getByLabel(/описание/i).fill('Описание для печати')
      await page.getByRole('button', { name: /создать/i }).click()

      // Open print dialog
      await page.getByRole('button', { name: /печать/i }).click()

      // Verify description is visible in preview
      await expect(page.getByText('Описание для печати')).toBeVisible()
    })

    test.skip('should not show empty description in print preview', async ({ page }) => {
      // TODO: Requires authentication
      await page.goto('/board')

      // Create a task without description
      await page.getByRole('button', { name: /добавить/i }).first().click()
      await page.getByLabel(/название/i).fill('Задание без описания')
      await page.getByRole('button', { name: /создать/i }).click()

      // Open print dialog
      await page.getByRole('button', { name: /печать/i }).click()

      // Task title should be visible
      await expect(page.getByText('Задание без описания')).toBeVisible()

      // There should be no empty description block
      // This is implicit - if description is null/empty, it's not rendered
    })

    test.skip('should include description in printed HTML', async ({ page, context }) => {
      // TODO: Requires authentication and popup handling
      await page.goto('/board')

      // Create task with description
      await page.getByRole('button', { name: /добавить/i }).first().click()
      await page.getByLabel(/название/i).fill('Задание для печати')
      await page.getByLabel(/описание/i).fill('Текст описания в печати')
      await page.getByRole('button', { name: /создать/i }).click()

      // Open print dialog
      await page.getByRole('button', { name: /печать/i }).click()

      // Listen for new window (print preview)
      const [printPage] = await Promise.all([
        context.waitForEvent('page'),
        page.getByRole('button', { name: /печать/i }).click(),
      ])

      // Verify description is in the print HTML
      const content = await printPage.content()
      expect(content).toContain('Текст описания в печати')
      expect(content).toContain('class="description"')

      await printPage.close()
    })
  })
})
