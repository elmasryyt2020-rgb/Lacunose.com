/**
 * Playwright config for the LIVE production stress test against the deployed VPS.
 * Unlike playwright.config.ts (which mocks the backend), this config hits
 * https://lacunose.com directly and burns real Anthropic + Cohere credits.
 *
 * Run with: npx playwright test --config playwright.live.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-live',
  // Each analysis takes 60-150s; a single test runs 1 full analysis end-to-end
  // and asserts on the streaming output. 5 minutes per test is conservative.
  timeout: 300_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-live' }]],
  use: {
    baseURL: 'https://lacunose.com',
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium-live', use: { ...devices['Desktop Chrome'] } },
  ],
});
