import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Playwright smoke test for /app. Covers the full gate → entry → results →
 * compare flow with mocked backend responses.
 *
 * Important: the webServer in playwright.config.ts points LACUNOSE_BACKEND_URL
 * at an unreachable address, so any upstream fetch the Next route tries to
 * make will fail. We intercept the /api/beta/* routes via page.route to
 * serve canned responses BEFORE the Next.js route handler runs — page.route
 * matches browser-originated fetches, which is exactly what our UI does.
 */

const INVITE_CODE = 'test-invite-code-123';

type MockGap = {
  rank: number;
  title: string;
  description: string;
  category: string;
  novelty_score: number;
  feasibility_score: number;
  evidence_density: number;
  research_question: string;
  suggested_method: string;
  suggested_n: number | null;
  suggested_duration_months: number | null;
  evidence: Array<{ paper_id: string; quote: string; paper_title?: string; paper_year?: number | null; paper_venue?: string | null; paper_authors?: string; section_kind?: string }>;
};

function mockGap(rank: number, title: string): MockGap {
  return {
    rank,
    title,
    description: `A plausible-looking description for gap #${rank}. Medium length. Highlights a specific unmet need in the literature.`,
    category: ['future-work', 'methodology', 'population', 'contradiction', 'temporal', 'coverage'][rank % 6]!,
    novelty_score: 7 + (rank % 3),
    feasibility_score: 6 + (rank % 4),
    evidence_density: 6 + (rank % 3),
    research_question: `What would a follow-up study measure for gap #${rank}?`,
    suggested_method: 'Prospective cohort study with registry linkage',
    suggested_n: 400 + rank * 50,
    suggested_duration_months: 24,
    evidence: [
      {
        paper_id: `paper-${rank}-a`,
        quote: 'Prior work has not examined this subgroup in any head-to-head trial.',
        paper_title: `Representative citation for gap ${rank}`,
        paper_year: 2023,
        paper_venue: 'JAMA',
        paper_authors: 'Smith et al.',
        section_kind: 'discussion',
      },
      {
        paper_id: `paper-${rank}-b`,
        quote: 'Long-term outcomes beyond 24 months remain unknown.',
        paper_title: `Second citation for gap ${rank}`,
        paper_year: 2024,
        paper_venue: 'NEJM',
        paper_authors: 'Doe et al.',
        section_kind: 'conclusions',
      },
    ],
  };
}

async function routeBackendMocks(page: Page, opts: {
  initialStatus?: 'queued' | 'running';
  finalGapCount?: number;
  compareMode?: 'normal' | 'haiku-error';
} = {}) {
  const finalGapCount = opts.finalGapCount ?? 6;

  let pollCount = 0;

  await page.route('**/api/beta/verify', async (route) => {
    const body = route.request().postDataJSON() as { code?: string };
    if (body?.code === INVITE_CODE) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': `beta_session=${INVITE_CODE}; Path=/; HttpOnly; SameSite=Lax`,
        },
        body: JSON.stringify({ ok: true }),
      });
    } else {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_code' }) });
    }
  });

  await page.route('**/api/beta/analyze', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { topic?: string };
      // Empty/probe POSTs return 401 so the bootstrap probe stays on gate screen.
      // (No session cookie is set before the user completes the gate flow.)
      if (!body?.topic) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'unauthorized' }) });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '11111111-1111-4111-8111-111111111111',
          status: 'queued',
          claim_token: 'test-claim-token-abcdef1234567890',
          claim_expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/beta/analyze/*', async (route) => {
    pollCount += 1;
    const status = pollCount < 2 ? 'running' : 'done';
    const gaps = status === 'done'
      ? Array.from({ length: finalGapCount }, (_, i) => mockGap(i + 1, `Mock gap ${i + 1}: some specific unmet need`))
      : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysis: {
          id: '11111111-1111-4111-8111-111111111111',
          topic: 'mock topic for playwright',
          field: 'medicine',
          status,
          created_at: new Date().toISOString(),
          completed_at: status === 'done' ? new Date().toISOString() : null,
          cost_tokens: status === 'done' ? { input: 42_000, output: 12_000, cached: 0, calls: 24, cost_usd: 0.93 } : null,
        },
        gaps,
      }),
    });
  });

  await page.route('**/api/beta/compare', async (route) => {
    const opusGaps = Array.from({ length: finalGapCount }, (_, i) => mockGap(i + 1, `Opus gap ${i + 1}: specific unmet need with precise population`));
    const haikuGaps = opts.compareMode === 'haiku-error'
      ? []
      : Array.from({ length: Math.max(1, finalGapCount - 2) }, (_, i) => mockGap(i + 1, `Haiku gap ${i + 1}: more research needed on this topic`));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysis_id: '11111111-1111-4111-8111-111111111111',
        topic: 'mock topic for playwright',
        field: 'medicine',
        opus: {
          model: 'claude-opus-4-7',
          gaps: opusGaps,
          cost_usd: 0.93,
          cost_tokens: { input: 42_000, output: 12_000, cached: 0, calls: 24, cost_usd: 0.93 },
        },
        haiku: {
          model: 'claude-haiku-4-5-20251001',
          gaps: haikuGaps,
          cost_usd: 0.12,
          cost_tokens: { input: 40_000, output: 11_500, cached: 0, calls: 24, models: ['claude-haiku-4-5-20251001'] },
          error: opts.compareMode === 'haiku-error' ? 'insufficient-signal' : null,
        },
      }),
    });
  });
}

test.describe('/app — beta web app', () => {
  test('rejects a wrong invite code', async ({ page }) => {
    await routeBackendMocks(page);
    await page.goto('/app');
    await expect(page.getByRole('heading', { level: 1 }).or(page.getByText(/Lacunose beta/i).first())).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder('invite code').fill('wrong-code');
    await page.getByRole('button', { name: /unlock/i }).click();
    await expect(page.getByText(/didn.?t work/i)).toBeVisible();
  });

  test('gate → entry → results → compare happy path', async ({ page }) => {
    await routeBackendMocks(page);
    await page.goto('/app');

    // Gate
    await page.getByPlaceholder('invite code').fill(INVITE_CODE);
    await page.getByRole('button', { name: /unlock/i }).click();

    // Entry — topic + field
    await expect(page.getByText(/What area of/i)).toBeVisible();
    await page.locator('textarea').fill('long-term cardiovascular outcomes of semaglutide in elderly patients');

    // Field picker — medicine is default; click it to confirm active state stays
    await page.getByRole('button', { name: 'Medicine', exact: true }).click();

    // Start analysis
    await page.getByRole('button', { name: /Find gaps/i }).click();

    // Results — progress appears then gap cards render
    await expect(page.getByText(/Analysis · Medicine/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Mock gap 1/i)).toBeVisible({ timeout: 15_000 });
    // At least a few cards rendered
    await expect(page.getByText(/Mock gap 3/i)).toBeVisible();

    // Compare toggle
    const compareBtn = page.getByRole('button', { name: /Compare with Haiku/i });
    await compareBtn.click();

    await expect(page.getByText('Haiku 4.5', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Opus 4.7', { exact: true })).toBeVisible();

    // The Opus column shows sharper titles; Haiku column shows generic "more research needed" titles
    await expect(page.getByText(/Opus gap 1/i)).toBeVisible();
    await expect(page.getByText(/Haiku gap 1/i)).toBeVisible();

    // Click a gap to open detail modal
    await page.getByText(/Opus gap 1/i).first().click();
    await expect(page.getByText('Research question').first()).toBeVisible();
    await expect(page.getByText(/Suggested method/i)).toBeVisible();

    // Close modal via escape
    await page.keyboard.press('Escape');
    await expect(page.getByText('Research question').first()).toBeHidden();
  });

  test('compare handles insufficient-signal Haiku gracefully', async ({ page }) => {
    await routeBackendMocks(page, { compareMode: 'haiku-error' });
    await page.goto('/app');

    await page.getByPlaceholder('invite code').fill(INVITE_CODE);
    await page.getByRole('button', { name: /unlock/i }).click();
    await page.locator('textarea').fill('a niche topic the model might struggle with');
    await page.getByRole('button', { name: /Find gaps/i }).click();

    await expect(page.getByText(/Mock gap 1/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Compare with Haiku/i }).click();

    await expect(page.getByText('Haiku 4.5', { exact: true })).toBeVisible({ timeout: 10_000 });
    // Haiku error pill renders inside its column
    await expect(page.getByText(/insufficient-signal/i)).toBeVisible();
    // Opus column still shows its gaps
    await expect(page.getByText(/Opus gap 1/i)).toBeVisible();
  });
});
