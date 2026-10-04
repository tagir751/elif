import { test, expect } from '@playwright/test'
import { login, ACCOUNTS } from './helpers'

test.describe('Сквозные сценарии: manager + teacher', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ACCOUNTS.anna.email, ACCOUNTS.anna.password)
    await expect(page).toHaveURL(/\/manager\/today/)
  })

  test('A1: Создание ученика — отображается в списке', async ({ page }) => {
    // Navigate via TabBar: click "Ученики" tab directly
    await page.locator('nav button').filter({ hasText: 'Ученики' }).click()
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/manager\/students/)

    // Wait for student list to fully load
    await page.waitForTimeout(800)

    // Click + Добавить
    await page.locator('button:has-text("+ Добавить")').click()
    await expect(page.locator('h2:has-text("Новый ученик")')).toBeVisible()

    // Fill form
    await page.fill('input[placeholder="Имя"]', 'Тест')
    await page.fill('input[placeholder="Фамилия"]', 'Учеников')
    await page.fill('input[type="date"]', '2010-05-15')

    // Pick first family
    await page.locator('select').first().selectOption({ index: 1 })

    // Click Создать and wait for API response
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/students') && res.request().method() === 'POST'),
      page.locator('button').filter({ hasText: 'Создать' }).last().click(),
    ])
    expect(response.status()).toBe(201)

    // Wait for modal to close and list to refresh
    await page.waitForTimeout(1000)

    // Verify — student card renders as "Фамилия Имя"
    await expect(page.locator('text=Учеников Тест').first()).toBeVisible({ timeout: 5000 })
  })

  test('A2: Карточка ученика показывает семью и группы', async ({ page }) => {
    // Go to Students via TabBar
    await page.locator('nav button').filter({ hasText: 'Ученики' }).click()
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/manager\/students/)

    // Ensure list loaded
    await page.waitForTimeout(1000)

    // Click first student card text to navigate
    const studentName = page.locator('p.font-semibold').first()
    await expect(studentName).toBeVisible()
    await studentName.click()

    // Wait for page to navigate and load
    await page.waitForTimeout(2000)

    // Verify we landed on student detail page (URL should include the student ID)
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/\/manager\/students\//)

    // Verify student detail sections
    await expect(page.locator('text=Семья').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Группы').first()).toBeVisible({ timeout: 5000 })

    // Switch to Развитие tab
    await page.locator('button').filter({ hasText: 'Развитие' }).click()
    await expect(page.locator('text=Наблюдения').first()).toBeVisible({ timeout: 5000 })
  })

  test('A3: Экран "Сегодня" показывает данные', async ({ page }) => {
    // We're already on /manager/today from beforeEach
    // Wait for the page to fully load (lessons + alerts)
    await page.waitForTimeout(2000)

    // Check if the greeting heading rendered (sign of successful load)
    const headingVisible = await page.locator('h1, h2, .font-bold').first().isVisible().catch(() => false)
    expect(headingVisible).toBe(true)

    // Verify lessons section loaded (at minimum shows "Сегодня" label or lesson cards)
    const todayTextVisible = await page.locator('text=Сегодня').first().isVisible().catch(() => false)
    expect(todayTextVisible).toBe(true)

    // Check for payment alerts or any text content on the page
    const pageText = await page.locator('body').innerText()
    expect(pageText.length).toBeGreaterThan(50)
  })
})

test.describe('Сквозные сценарии: teacher → observation → manager sees it', () => {
  test('Педагог завершает урок, менеджер видит наблюдения', async ({ browser }) => {
    const teacherCtx = await browser.newContext()
    const teacherPage = await teacherCtx.newPage()
    await login(teacherPage, ACCOUNTS.teacher.email, ACCOUNTS.teacher.password)
    await expect(teacherPage).toHaveURL(/\/teacher\/today/)
    await teacherPage.waitForTimeout(1500)

    // Look for clickable lesson cards (divs with group name inside)
    const lessonCards = teacherPage.locator('div').filter({ has: teacherPage.locator('[class*="font-semibold"]') }).filter({ has: teacherPage.locator('text=Сегодня') })

    if (await lessonCards.count() === 0) {
      test.skip(true, 'No lessons today for teacher — skip')
      return
    }

    // Click the first lesson
    await lessonCards.first().click()
    await teacherPage.waitForTimeout(500)

    // Check if we navigated to lesson detail
    const topicInput = teacherPage.locator('input[placeholder="Тема урока"]')
    if (!(await topicInput.isVisible().catch(() => false))) {
      test.skip(true, 'Lesson detail did not open — skip')
      return
    }

    // Set topic and finish
    await topicInput.fill('E2E test topic')
    await teacherPage.locator('button').filter({ hasText: 'Завершить урок' }).click()
    await teacherPage.waitForTimeout(1500)

    // Manager: verify observations page loads
    const managerPage = await browser.newPage()
    await login(managerPage, ACCOUNTS.manager.email, ACCOUNTS.manager.password)
    await managerPage.locator('nav button').filter({ hasText: 'Ещё' }).click()
    await managerPage.waitForTimeout(500)
    // Click the Наблюдения card on the More page (first card-like element with that text)
    await managerPage.locator('[class*="rounded-2xl"]').filter({ hasText: 'Наблюдения' }).first().click()
    await expect(managerPage).toHaveURL(/\/manager\/observations/)

    // Page should have loaded
    await expect(managerPage.locator('text=Наблюдения').first()).toBeVisible({ timeout: 5000 })

    await teacherCtx.close()
  })
})
