import { Page } from '@playwright/test'

export const ACCOUNTS = {
  admin: { email: 'admin@elif.ru', password: '1975' },
  manager: { email: 'manager@elif.ru', password: 'manager123' },
  teacher: { email: 'teacher@elif.ru', password: 'teacher123' },
  anna: { email: 'anna@elif.ru', password: 'anna123' },
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.waitForSelector('input[placeholder="Email"]', { timeout: 10_000 })

  // Clear any previous error by reloading
  const errorVisible = await page.locator('text=Ошибка').isVisible().catch(() => false)
  if (errorVisible) {
    await page.goto('/login')
    await page.waitForSelector('input[placeholder="Email"]', { timeout: 10_000 })
  }

  await page.fill('input[placeholder="Email"]', email)
  await page.fill('input[placeholder="Пароль"]', password)
  await page.click('button[type="submit"]')

  // Wait for navigation away from login page
  try {
    await page.waitForURL(/\/(admin|manager|teacher)/, { timeout: 15_000 })
  } catch {
    // Retry once on failure
    await page.goto('/login')
    await page.waitForSelector('input[placeholder="Email"]', { timeout: 10_000 })
    await page.fill('input[placeholder="Email"]', email)
    await page.fill('input[placeholder="Пароль"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(admin|manager|teacher)/, { timeout: 15_000 })
  }
}

export async function waitForNav(page: Page) {
  await page.waitForSelector('nav button', { timeout: 10_000 })
}

export function todayDateString(): string {
  return new Date().toISOString().split('T')[0]
}
