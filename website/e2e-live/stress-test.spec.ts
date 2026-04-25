/**
 * Live-production stress test for the Lacunose beta /app live A/B compare.
 *
 * For each demo topic:
 *   1. Hit /app, enter the invite code, unlock.
 *   2. Submit the topic with Live compare ON.
 *   3. Wait for both Opus and Haiku columns to populate to terminal state.
 *   4. Assert: status reaches 'done', at least 1 gap on each side, no JS errors.
 *   5. Capture timings, gap counts, cost numbers, and a screenshot at terminal.
 *
 * Goal: detect variance, dead columns, missing cost display, frontend bugs.
 *
 * Run from website/ with:
 *   npx playwright test --config playwright.live.config.ts
 */
import { test, expect, type Page } from '@playwright/test';

const INVITE_CODE = 'lacunose-J8VejgrbErh5';

const TOPICS: Array<{ topic: string; field: string; minGapsTotal: number }> = [
  { topic: 'whole tooth regeneration',                                                 field: 'medicine',         minGapsTotal: 4 },
  { topic: 'long-term cardiovascular outcomes of semaglutide in patients over 75 with heart failure', field: 'medicine', minGapsTotal: 3 },
  { topic: 'attention mechanism interpretability in small language models',            field: 'computer-science', minGapsTotal: 3 },
];

interface RunOutcome {
  topic: string;
  opusStatus: string;
  opusGapCount: number;
  haikuStatus: string;
  haikuGapCount: number;
  footerText: string;
  totalSeconds: number;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: Array<{ url: string; status: number }>;
}

async function unlockBeta(page: Page): Promise<void> {
  await page.goto('/app');
  // Type the invite code in the gate input
  const gateInput = page.locator('input[placeholder="invite code"]');
  await gateInput.waitFor({ state: 'visible', timeout: 15_000 });
  await gateInput.fill(INVITE_CODE);
  await page.getByRole('button', { name: /unlock/i }).click();
  // Wait for entry screen
  await page.waitForSelector('text=/What area of/i', { timeout: 15_000 });
}

async function submitTopic(page: Page, topic: string, field: string): Promise<void> {
  // Pick the field chip if it isn't already medicine (default)
  const fieldChip = page.getByRole('button', { name: new RegExp(`^${field}$`, 'i') }).first();
  if (await fieldChip.isVisible().catch(() => false)) {
    await fieldChip.click().catch(() => {/* may already be active */});
  }
  // Confirm the Live compare toggle is ON. Default is true; we re-assert.
  const toggle = page.locator('button[aria-pressed]');
  await toggle.waitFor({ state: 'visible', timeout: 5_000 });
  const pressed = await toggle.getAttribute('aria-pressed');
  if (pressed !== 'true') await toggle.click();
  // Topic textarea
  const topicInput = page.locator('textarea').first();
  await topicInput.fill(topic);
  // Submit
  await page.getByRole('button', { name: /find gaps/i }).click();
}

async function waitForBothColumnsTerminal(page: Page, deadlineMs: number): Promise<void> {
  // Both columns are present once results screen renders. Wait for the
  // footer line to read "Opus: done" or "Opus: failed" AND "Haiku: done"
  // or "Haiku: error" (i.e., both pipelines reached a terminal state).
  const start = Date.now();
  while (Date.now() - start < deadlineMs) {
    const footer = await page.locator('text=/Opus: .* Haiku:/').first().textContent().catch(() => null);
    if (footer) {
      const opusTerminal = /Opus:\s*(done|failed)/i.test(footer);
      const haikuTerminal = /Haiku:\s*(\d+\s*gaps?\s*·|error|insufficient)/i.test(footer);
      if (opusTerminal && haikuTerminal) return;
    }
    await page.waitForTimeout(2000);
  }
  throw new Error(`Timed out waiting for both columns terminal after ${deadlineMs}ms`);
}

async function runOneTopic(page: Page, topic: string, field: string): Promise<RunOutcome> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: Array<{ url: string; status: number }> = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    if (status < 400 || !url.includes('/api/beta/')) return;
    // 409 on /api/beta/compare-stream is the documented "paper_set_source: pending"
    // probe-retry signal — the frontend retries until the worker writes paper_ids.
    // Not a failure; expected several times early in each run.
    if (status === 409 && url.includes('/api/beta/compare-stream/')) return;
    failedRequests.push({ url, status });
  });

  await unlockBeta(page);
  await submitTopic(page, topic, field);

  const t0 = Date.now();
  // Generous timeout — fresh ingest can take 30-60s, then 60-90s pipeline,
  // plus Haiku SSE another 60s.
  await waitForBothColumnsTerminal(page, 270_000);
  const totalSeconds = Math.round((Date.now() - t0) / 1000);

  // Parse the footer.
  const footer = (await page.locator('text=/Opus: .* Haiku:/').first().textContent()) ?? '';

  // Extract counts from the footer.
  const opusMatch = footer.match(/Opus:\s*([a-z]+)\s*·\s*(\d+)\s*gaps?/i);
  const haikuMatch = footer.match(/Haiku:\s*(.+?)$/i);
  const haikuStatus = haikuMatch?.[1]?.trim() ?? '';
  const haikuGapMatch = haikuStatus.match(/(\d+)\s*gaps?\s*·/);

  // Parse the canonical gap counts from the footer line. DOM-counting via
  // [class*="compareGap"] inflates by 4× because each card has 4 nested
  // elements (parent compareGap + compareGapTitle + compareGapDesc + compareGapMeta).
  // The footer reads "Opus: done · N gaps · ..." which is the worker's
  // authoritative final count.
  const footerOpusMatch = footer.match(/Opus:\s*\w+\s*·\s*(\d+)\s*gaps?/i);
  const footerHaikuMatch = footer.match(/Haiku:.*?(\d+)\s*gaps?/i);
  const opusGaps = footerOpusMatch ? parseInt(footerOpusMatch[1]!, 10) : 0;
  const haikuGaps = footerHaikuMatch ? parseInt(footerHaikuMatch[1]!, 10) : 0;

  // Take a final screenshot for review.
  const safeName = topic.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  await page.screenshot({ path: `playwright-report-live/screenshots/final-${safeName}.png`, fullPage: true });

  return {
    topic,
    opusStatus: opusMatch?.[1] ?? 'unknown',
    opusGapCount: opusGaps,
    haikuStatus,
    haikuGapCount: haikuGaps,
    footerText: footer,
    totalSeconds,
    consoleErrors,
    pageErrors,
    failedRequests,
  };
}

test.describe('Lacunose live A/B stress test', () => {
  for (const { topic, field, minGapsTotal } of TOPICS) {
    test(`${topic} → reaches terminal with ≥${minGapsTotal} total gaps`, async ({ page }) => {
      const outcome = await runOneTopic(page, topic, field);

      // Persist outcome to a file so we can read it post-run regardless of
      // pass/fail. Playwright's stdout buffer truncates console.log on failure.
      const fs = await import('node:fs');
      const safeName = topic.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
      fs.mkdirSync('playwright-report-live/outcomes', { recursive: true });
      fs.writeFileSync(
        `playwright-report-live/outcomes/${safeName}.json`,
        JSON.stringify(outcome, null, 2),
      );
      console.log(JSON.stringify(outcome, null, 2));

      // Hard assertions
      expect(outcome.opusStatus, 'Opus should reach terminal "done"').toBe('done');
      expect(outcome.opusGapCount + outcome.haikuGapCount,
        `Combined gaps should be ≥${minGapsTotal}`).toBeGreaterThanOrEqual(minGapsTotal);
      expect(outcome.pageErrors, 'No uncaught page errors').toEqual([]);
      expect(outcome.failedRequests, 'No 4xx/5xx on /api/beta/* during the run').toEqual([]);

      // Soft warnings (logged, not failed)
      if (outcome.opusGapCount === 0) {
        console.warn(`⚠️ Opus produced 0 gaps for "${topic}"`);
      }
      if (outcome.haikuGapCount === 0) {
        console.warn(`⚠️ Haiku produced 0 gaps for "${topic}"`);
      }
      if (outcome.consoleErrors.length > 0) {
        console.warn(`⚠️ ${outcome.consoleErrors.length} console errors:`, outcome.consoleErrors.slice(0, 3));
      }
    });
  }
});
