import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Lacunose beta app smoke tests.
 *
 * The tests drive /app in a real chromium browser but mock the /api/beta/*
 * responses so we don't need Supabase / Redis / Anthropic running. Real
 * end-to-end smoke (hitting the live VPS) is a separate manual step before
 * shipping — see HACKATHON_5_DAY_PLAN.md Day 5 "harden".
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      BETA_INVITE_CODE: 'test-invite-code-123',
      LACUNOSE_BACKEND_URL: 'http://127.0.0.1:9',    // unreachable; all backend calls are route-mocked
      NODE_ENV: 'development',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
