import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx tsx scripts/seed.ts && npx next dev --webpack -p 3000',
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: true,
  },
})
