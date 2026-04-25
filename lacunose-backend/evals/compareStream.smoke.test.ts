/**
 * Smoke test for routes/compareStream.ts.
 *
 * Boots a minimal Fastify app with ONLY the SSE plugin registered. Mocks
 * supabaseAdmin (so we don't hit the network), hybridRetrieve (so we don't
 * touch Postgres), and runs the LLM provider in `mock` mode (deterministic
 * fake gaps). Verifies routing, auth gates, and that the streaming pipeline
 * actually emits a valid event sequence end-to-end.
 *
 * Run with:  npx vitest run evals/compareStream.smoke.test.ts
 */
import { describe, expect, it, vi, beforeAll } from 'vitest';

// Stub env BEFORE any src/ import. The env module fails fast on missing values.
process.env.NODE_ENV = 'test';
process.env.LLM_PROVIDER = 'mock';
process.env.SUPABASE_URL = 'http://localhost:9999';
process.env.SUPABASE_ANON_KEY = 'mock-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service';
process.env.SUPABASE_JWT_SECRET = 'mock-jwt-secret-must-be-32-chars-long';
process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
process.env.BETA_INVITE_CODE = 'lacunose-smoke-invite-12345';
process.env.ANTHROPIC_OPUS_MODEL = 'claude-opus-4-7';
process.env.ANTHROPIC_HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const ANALYSIS_ID = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'a'.repeat(32);
const PAPER_IDS = [
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
];

// Mode controlled by individual tests
let mockMode: 'happy' | 'wrong_token' | 'no_paper_ids' = 'happy';

const fakeAnalysis = {
  id: ANALYSIS_ID,
  topic: 'smoke test topic',
  field: 'medicine',
  structured_frame: null,
  status: 'done',
  is_anonymous: true,
  anonymous_claim_token: TOKEN,
  paper_ids: PAPER_IDS,
};

vi.mock('../src/lib/supabaseAdmin.js', () => ({
  supabaseAdmin: () => ({
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (table === 'gap_analyses') {
            const data =
              mockMode === 'wrong_token'
                ? { ...fakeAnalysis, anonymous_claim_token: 'something-else' }
                : mockMode === 'no_paper_ids'
                  ? { ...fakeAnalysis, paper_ids: null }
                  : fakeAnalysis;
            return { data, error: null };
          }
          return { data: null, error: null };
        },
      };
      return builder;
    },
  }),
}));

// Mock the Anthropic provider — the scoped LLM the SSE endpoint uses calls
// it directly, bypassing LLM_PROVIDER=mock. Returns deterministic shapes per
// model tier (caller passes 'map' | 'synth' | 'critique' on opts.model).
//
// IMPORTANT: the map+reduce phases enforce a verbatim-quote guardrail that
// drops any quote that isn't a substring of the source section text. So the
// mock pulls real substrings from the section text inside the user message.

const MAP_QUOTES_BY_SECTION: Record<string, string[]> = {
  s1: [
    'further studies are needed in elderly populations',
    'limitations include short follow-up',
    'long-term outcomes',
  ],
  s2: [
    'future work should focus on geriatric patients',
    'methodology relies on retrospective registry data',
    'reduced ejection fraction',
  ],
};

vi.mock('../src/llm/providers/anthropic.js', () => ({
  chat: async (opts: { model: string; messages: { role: string; content: string }[] }) => {
    const tier = opts.model;
    const userMsg = opts.messages.find((m) => m.role === 'user')?.content ?? '';
    let content = '[]';
    if (tier === 'map') {
      // Detect which section's text is in the user prompt and pick verbatim
      // substrings from THAT section so the verbatim guardrail accepts them.
      const sectionId = Object.keys(MAP_QUOTES_BY_SECTION).find(
        (id) => MAP_QUOTES_BY_SECTION[id]!.every((q) => userMsg.includes(q.split(' ')[0]!)),
      ) ?? 's1';
      const quotes = MAP_QUOTES_BY_SECTION[sectionId]!.filter((q) => userMsg.includes(q));
      content = JSON.stringify(
        quotes.map((q, i) => ({
          kind: ['future-work', 'limitation', 'methodology-hint'][i % 3],
          phrase: `mock signal ${i + 1} from ${sectionId}`,
          quote: q,
        })),
      );
    } else if (tier === 'synth') {
      // Reduce gets the cluster's signals embedded in the prompt; pull the
      // first verbatim quote we can find in the user message.
      const ev: { paper_id: string; section_id: string; quote: string }[] = [];
      for (const sectionId of ['s1', 's2'] as const) {
        for (const q of MAP_QUOTES_BY_SECTION[sectionId]!) {
          if (userMsg.includes(q)) {
            const paperId =
              sectionId === 's1'
                ? '22222222-2222-4222-8222-222222222222'
                : '33333333-3333-4333-8333-333333333333';
            ev.push({ paper_id: paperId, section_id: sectionId, quote: q });
          }
        }
      }
      // verifyCandidate requires ≥2 distinct paper_ids — bail with empty if not met.
      const distinctPapers = new Set(ev.map((e) => e.paper_id));
      if (distinctPapers.size < 2) {
        content = '[]';
      } else {
        content = JSON.stringify([
          {
            title: 'Long-term outcomes in elderly heart-failure cohorts',
            description: 'Evidence on long-term cardiovascular outcomes in patients over 75 with heart failure is sparse; a multi-site retrospective cohort using registry data would fill this gap.',
            category: 'population',
            novelty_score: 8,
            feasibility_score: 7,
            research_question: 'Among patients ≥75 with HF, what are 2-3y rates of all-cause mortality vs matched controls?',
            suggested_method: 'retrospective propensity-matched cohort registry analysis',
            evidence: ev.slice(0, 4),
          },
        ]);
      }
    } else if (tier === 'critique') {
      content = JSON.stringify({ grounded: true, rationale: 'mock' });
    }
    return {
      content,
      usage: { inputTokens: 100, outputTokens: 50, cachedInputTokens: 0 },
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      latencyMs: 1,
    };
  },
}));

vi.mock('../src/retrieval/hybrid.js', () => ({
  hybridRetrieve: async () => [
    {
      paper_id: PAPER_IDS[0]!,
      section_id: 's1',
      paper_title: 'Smoke Paper 1',
      paper_year: 2024,
      paper_venue: 'JSmoke',
      authors_short: 'Smoke A',
      section_kind: 'discussion',
      text:
        'further studies are needed in elderly populations to assess long-term outcomes. limitations include short follow-up.',
      score: 0.9,
    },
    {
      paper_id: PAPER_IDS[1]!,
      section_id: 's2',
      paper_title: 'Smoke Paper 2',
      paper_year: 2025,
      paper_venue: 'JSmoke2',
      authors_short: 'Smoke B',
      section_kind: 'limitation',
      text:
        'future work should focus on geriatric patients with reduced ejection fraction. methodology relies on retrospective registry data.',
      score: 0.85,
    },
  ],
}));

let app: Awaited<ReturnType<typeof buildApp>>;

async function buildApp() {
  const Fastify = (await import('fastify')).default;
  const { default: compareStreamPlugin } = await import('../src/edge/routes/compareStream.js');
  const fastify = Fastify({ logger: false });
  await fastify.register(compareStreamPlugin);
  return fastify;
}

beforeAll(async () => {
  app = await buildApp();
});

describe('GET /v1/beta/compare-stream/:id', () => {
  it('rejects requests without an invite header', async () => {
    const r = await app.inject({
      method: 'GET',
      url: `/v1/beta/compare-stream/${ANALYSIS_ID}?token=${TOKEN}`,
    });
    expect(r.statusCode).toBe(401);
    expect(JSON.parse(r.payload).error).toBe('invalid_invite');
  });

  it('rejects a wrong invite header', async () => {
    const r = await app.inject({
      method: 'GET',
      url: `/v1/beta/compare-stream/${ANALYSIS_ID}?token=${TOKEN}`,
      headers: { 'x-beta-invite': 'wrong-code-of-equal-length-12345' },
    });
    expect(r.statusCode).toBe(401);
  });

  it('rejects a non-uuid analysis id', async () => {
    const r = await app.inject({
      method: 'GET',
      url: `/v1/beta/compare-stream/not-a-uuid?token=${TOKEN}`,
      headers: { 'x-beta-invite': process.env.BETA_INVITE_CODE! },
    });
    expect(r.statusCode).toBe(400);
    expect(JSON.parse(r.payload).error).toBe('invalid_id');
  });

  it('rejects a request without a token', async () => {
    const r = await app.inject({
      method: 'GET',
      url: `/v1/beta/compare-stream/${ANALYSIS_ID}`,
      headers: { 'x-beta-invite': process.env.BETA_INVITE_CODE! },
    });
    expect(r.statusCode).toBe(401);
    expect(JSON.parse(r.payload).error).toBe('missing_token');
  });

  it('returns 404 on a wrong claim token', async () => {
    mockMode = 'wrong_token';
    const r = await app.inject({
      method: 'GET',
      url: `/v1/beta/compare-stream/${ANALYSIS_ID}?token=${TOKEN}`,
      headers: { 'x-beta-invite': process.env.BETA_INVITE_CODE! },
    });
    expect(r.statusCode).toBe(404);
  });

  it('returns 409 with paper_set_source=pending when paper_ids is null and no cited evidence', async () => {
    mockMode = 'no_paper_ids';
    const r = await app.inject({
      method: 'GET',
      url: `/v1/beta/compare-stream/${ANALYSIS_ID}?token=${TOKEN}`,
      headers: { 'x-beta-invite': process.env.BETA_INVITE_CODE! },
    });
    expect(r.statusCode).toBe(409);
    const body = JSON.parse(r.payload);
    expect(body.error).toBe('no_papers_for_analysis');
    expect(body.paper_set_source).toBe('pending');
  });

  it('streams a valid SSE event sequence end-to-end (mock LLM)', async () => {
    mockMode = 'happy';
    const r = await app.inject({
      method: 'GET',
      url: `/v1/beta/compare-stream/${ANALYSIS_ID}?token=${TOKEN}`,
      headers: { 'x-beta-invite': process.env.BETA_INVITE_CODE! },
    });
    expect(r.statusCode).toBe(200);
    expect(String(r.headers['content-type'])).toContain('text/event-stream');
    const body = r.payload;

    // Frame structure
    expect(body).toContain('event: meta');
    expect(body).toContain('event: phase');
    expect(body).toContain('event: done');

    // meta carries paper_set_source / paper_count / sections
    const metaIdx = body.indexOf('event: meta');
    const metaData = body.slice(metaIdx).match(/data: (\{[^\n]*\})/);
    expect(metaData).toBeTruthy();
    const meta = JSON.parse(metaData![1]!);
    expect(meta.paper_set_source).toBe('analysis_row');
    expect(meta.paper_count).toBe(PAPER_IDS.length);
    expect(meta.sections).toBeGreaterThan(0);

    // done carries gaps array + cost_usd + total_ms
    const doneIdx = body.lastIndexOf('event: done');
    const doneData = body.slice(doneIdx).match(/data: (\{[^\n]*\})/);
    expect(doneData).toBeTruthy();
    const done = JSON.parse(doneData![1]!);
    expect(Array.isArray(done.gaps)).toBe(true);
    expect(typeof done.cost_usd).toBe('number');
    expect(typeof done.total_ms).toBe('number');

    // With the anthropic chat mock providing valid candidates, we should also
    // see at least one gap event between meta and done — the headline feature.
    expect(body).toContain('event: gap');
    expect(done.gaps.length).toBeGreaterThan(0);
    expect(done.calls).toBeGreaterThan(0);
    // First gap should carry a title and evidence
    const firstGapIdx = body.indexOf('event: gap');
    const firstGapData = body.slice(firstGapIdx).match(/data: (\{[^\n]*\})/);
    expect(firstGapData).toBeTruthy();
    const firstGap = JSON.parse(firstGapData![1]!);
    expect(typeof firstGap.title).toBe('string');
    expect(Array.isArray(firstGap.evidence)).toBe(true);
    expect(firstGap.evidence.length).toBeGreaterThan(0);
  });
});
