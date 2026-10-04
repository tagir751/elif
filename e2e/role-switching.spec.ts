import { test, expect } from '@playwright/test'
import { login, ACCOUNTS } from './helpers'

test.describe('Переключение ролей (anna — manager+teacher)', () => {
  test('B1: Переключение между ролями через кнопку в шапке', async ({ page }) => {
    await login(page, ACCOUNTS.anna.email, ACCOUNTS.anna.password)
    await expect(page).toHaveURL(/\/manager\/today/)
    await expect(page.locator('nav button:has-text("Сегодня")')).toBeVisible()

    // Wait for user data to load (role button depends on user state)
    await page.waitForTimeout(1000)
    // Find and click the role switch button in header
    const switchBtn = page.locator('button:has-text("Переключиться")')
    await expect(switchBtn).toBeVisible({ timeout: 8000 })
    await switchBtn.click()

    // Now on teacher today
    await expect(page).toHaveURL(/\/teacher\/today/)
    await expect(page.locator('nav button:has-text("Ученики")')).toBeVisible()

    // Teacher should NOT see Tasks
    await expect(page.locator('nav button:has-text("Задачи")')).toHaveCount(0)

    // Switch back to manager
    const backBtn = page.locator('button:has-text("Переключиться")')
    await expect(backBtn).toBeVisible()
    await backBtn.click()
    await expect(page).toHaveURL(/\/manager\/today/)
    await expect(page.locator('nav button:has-text("Задачи")')).toBeVisible()
  })

  test('B2: Педагог не может перейти на менеджерский маршрут', async ({ page }) => {
    await login(page, ACCOUNTS.teacher.email, ACCOUNTS.teacher.password)
    await expect(page).toHaveURL(/\/teacher\/today/)

    // Try to navigate to a manager route directly
    await page.goto('/manager/students')
    await page.waitForTimeout(1500)

    // Should be redirected away from manager route
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/manager/students')
  })
})

test.describe('Права администратора', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password)
    await expect(page).toHaveURL(/\/admin/)
  })

  test('B3: Админ создаёт пользователя', async ({ page }) => {
    // Open sidebar
    await page.click('button:has-text("☰")')
    await expect(page.locator('text=Пользователи')).toBeVisible()
    await page.click('text=Пользователи')
    await page.waitForTimeout(300)

    // Toggle create form
    const createBtn = page.locator('button:has-text("+ Создать")')
    await createBtn.click()
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible({ timeout: 3000 })

    // Fill form
    await page.locator('input[placeholder="Email"]').fill('e2etest@test.ru')
    await page.locator('input[placeholder="Пароль"]').fill('test12345')

    // Submit
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/users') && res.request().method() === 'POST', { timeout: 10_000 }),
      page.locator('button').filter({ hasText: 'Создать' }).last().click(),
    ])

    // Wait for user to appear in list
    await page.waitForTimeout(500)
    await expect(page.locator('text=e2etest@test.ru').first()).toBeVisible({ timeout: 5000 })
  })

  test('B4: Админ скачивает Excel через прямой URL', async ({ page }) => {
    // Open sidebar — click hamburger
    await page.click('button:has-text("☰")')
    await page.waitForTimeout(500)

    // Click the sidebar button inside the drawer (the one with class bg-[#e8f2ff] when active)
    // Use the span with text "База данных" inside the drawer
    const sidebarButton = page.locator('.w-\\[280px\\] button').filter({ hasText: 'База данных' })
    await expect(sidebarButton).toBeVisible({ timeout: 3000 })
    await sidebarButton.click()
    await page.waitForTimeout(500)

    // Verify database section is visible
    await expect(page.locator('text=Резервное копирование')).toBeVisible({ timeout: 3000 })

    // The Excel button uses window.open, so test the API directly
    const response = await page.request.get('/api/admin/backup/export-xlsx')
    expect(response.status()).toBe(200)

    // Verify Content-Type is spreadsheet
    const contentType = response.headers()['content-type'] || ''
    expect(contentType).toContain('spreadsheet')
  })
})
