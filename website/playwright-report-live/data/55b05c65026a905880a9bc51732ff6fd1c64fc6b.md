# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stress-test.spec.ts >> Lacunose live A/B stress test >> attention mechanism interpretability in small language models → reaches terminal with ≥3 total gaps
- Location: e2e-live\stress-test.spec.ts:152:9

# Error details

```
Error: No 4xx/5xx on /api/beta/* during the run

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 10

- Array []
+ Array [
+   Object {
+     "status": 401,
+     "url": "https://lacunose.com/api/beta/analyze",
+   },
+   Object {
+     "status": 502,
+     "url": "https://lacunose.com/api/beta/analyze/45195d52-785c-4849-b1ed-f368ee1ffbaa?token=14327f56a26bec77341954e16a4abfd6",
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - navigation [ref=e4]:
        - link "Lacunose Lacunose" [ref=e5] [cursor=pointer]:
          - /url: /
          - img "Lacunose" [ref=e6]
          - generic [ref=e7]: Lacunose
        - generic [ref=e9]: Beta
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: Analysis · Medicine
          - generic [ref=e13]: attention mechanism interpretability in small language models
        - generic [ref=e14]:
          - button "Compare with Haiku" [ref=e15] [cursor=pointer]:
            - img [ref=e16]
            - text: Compare with Haiku
          - button "New analysis" [ref=e20] [cursor=pointer]
      - generic [ref=e21]:
        - generic [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e24]: Opus 4.7
            - generic [ref=e25]: $1.5402 · 58 calls
          - generic [ref=e26]: claude-opus-4-7
          - generic [ref=e27] [cursor=pointer]:
            - generic [ref=e29]: Population
            - generic [ref=e31]: Interpretability of attention mechanisms in clinical SLMs for non-English radiology report
            - generic [ref=e32]: Small language models deployed for clinical text classification are increasingly used in non-English settings, yet attention-based interpretability has been validated almost exclusively on English corpora and on label-attention schemes that highlight extraneous tokens. No study has systematically evaluated whether attention or dictionary-learning interpretability methods faithfully identify clinically relevant tokens in non-English radiology or coding workflows.
            - generic [ref=e33]:
              - generic [ref=e34]: N 8/10
              - generic [ref=e35]: F 8/10
              - generic [ref=e36]: E 3
          - generic [ref=e37] [cursor=pointer]:
            - generic [ref=e39]: Future work
            - generic [ref=e41]: Mechanistic circuits for multi-token prediction behaviors in small LMs
            - generic [ref=e42]: Existing mechanistic interpretability work has identified circuits primarily for single-token predictions, with multi-token behaviors only beginning to be explored. Extending circuit-level analysis to a broader range of multi-token tasks in small language models would close a clear methodological gap.
            - generic [ref=e43]:
              - generic [ref=e44]: N 8/10
              - generic [ref=e45]: F 7/10
              - generic [ref=e46]: E 3
          - generic [ref=e47] [cursor=pointer]:
            - generic [ref=e49]: Methodology
            - generic [ref=e51]: Scaling faithfulness of mechanistic explanations beyond GPT-2 Small
            - generic [ref=e52]: Existing causally grounded interpretability methods report faithfulness on a single small model (GPT-2 Small, 124M), and circuit discovery for logical reasoning has likewise been bounded to that model. Whether the same faithfulness metrics and identified circuits hold under modest scaling (e.g., to other small open models) remains unaddressed.
            - generic [ref=e53]:
              - generic [ref=e54]: N 7/10
              - generic [ref=e55]: F 8/10
              - generic [ref=e56]: E 2
          - generic [ref=e57] [cursor=pointer]:
            - generic [ref=e59]: Coverage
            - generic [ref=e61]: Scaling laws for circuit persistence between toy and deployed SLMs
            - generic [ref=e62]: Symbolic IOI circuits in attention-only transformers and binary-reasoning circuits in GPT-2 have been described independently, but no work tracks whether the same circuit motifs persist as model size and training data scale toward deployable SLMs. This temporal/scaling gap limits the external validity of mechanistic interpretability claims.
            - generic [ref=e63]:
              - generic [ref=e64]: N 7/10
              - generic [ref=e65]: F 7/10
              - generic [ref=e66]: E 2
        - generic [ref=e67]:
          - generic [ref=e68]:
            - generic [ref=e69]: Haiku 4.5
            - generic [ref=e70]: $0.1733 · 49 calls
          - generic [ref=e71]: claude-haiku-4-5-20251001
          - generic [ref=e72] [cursor=pointer]:
            - generic [ref=e74]: Contradiction
            - generic [ref=e76]: "Layer-wise attention performance inconsistency in small LMs: mechanistic causes"
            - generic [ref=e77]: Small language models exhibit unexplained performance variation across attention layers (e.g., layer 4 and layers 8–11 underperform in document attribution tasks), yet no mechanistic study has characterized why specific layers fail or succeed. This gap addresses the contradiction between layer-wise attention utility and lack of interpretability into layer-specific failure modes.
            - generic [ref=e78]:
              - generic [ref=e79]: N 8/10
              - generic [ref=e80]: F 8/10
              - generic [ref=e81]: E 2
          - generic [ref=e82] [cursor=pointer]:
            - generic [ref=e84]: Population
            - generic [ref=e86]: Generalization of toy-model interpretability findings to small production models
            - generic [ref=e87]: Mechanistic interpretability research has successfully identified interpretable attention patterns (e.g., successor heads, IOI circuits) in small toy models, but these insights have not yet been validated in small production models or shown to scale to natural language. This gap addresses the external validity limitation between controlled toy tasks and real-world small LM behavior.
            - generic [ref=e88]:
              - generic [ref=e89]: N 8/10
              - generic [ref=e90]: F 7/10
              - generic [ref=e91]: E 2
      - generic [ref=e92]: "Opus: done · 4 gaps · $1.5402 · 58 calls · Haiku: 2 gaps · $0.1733 · 49 calls"
      - generic [ref=e93]: Same topic. Same corpus. Same pipeline. Different reasoning model.
  - alert [ref=e94]
```

# Test source

```ts
  71  |   // or "Haiku: error" (i.e., both pipelines reached a terminal state).
  72  |   const start = Date.now();
  73  |   while (Date.now() - start < deadlineMs) {
  74  |     const footer = await page.locator('text=/Opus: .* Haiku:/').first().textContent().catch(() => null);
  75  |     if (footer) {
  76  |       const opusTerminal = /Opus:\s*(done|failed)/i.test(footer);
  77  |       const haikuTerminal = /Haiku:\s*(\d+\s*gaps?\s*·|error|insufficient)/i.test(footer);
  78  |       if (opusTerminal && haikuTerminal) return;
  79  |     }
  80  |     await page.waitForTimeout(2000);
  81  |   }
  82  |   throw new Error(`Timed out waiting for both columns terminal after ${deadlineMs}ms`);
  83  | }
  84  | 
  85  | async function runOneTopic(page: Page, topic: string, field: string): Promise<RunOutcome> {
  86  |   const consoleErrors: string[] = [];
  87  |   const pageErrors: string[] = [];
  88  |   const failedRequests: Array<{ url: string; status: number }> = [];
  89  | 
  90  |   page.on('console', (msg) => {
  91  |     if (msg.type() === 'error') consoleErrors.push(msg.text());
  92  |   });
  93  |   page.on('pageerror', (err) => pageErrors.push(err.message));
  94  |   page.on('response', (res) => {
  95  |     const url = res.url();
  96  |     const status = res.status();
  97  |     if (status < 400 || !url.includes('/api/beta/')) return;
  98  |     // 409 on /api/beta/compare-stream is the documented "paper_set_source: pending"
  99  |     // probe-retry signal — the frontend retries until the worker writes paper_ids.
  100 |     // Not a failure; expected several times early in each run.
  101 |     if (status === 409 && url.includes('/api/beta/compare-stream/')) return;
  102 |     failedRequests.push({ url, status });
  103 |   });
  104 | 
  105 |   await unlockBeta(page);
  106 |   await submitTopic(page, topic, field);
  107 | 
  108 |   const t0 = Date.now();
  109 |   // Generous timeout — fresh ingest can take 30-60s, then 60-90s pipeline,
  110 |   // plus Haiku SSE another 60s.
  111 |   await waitForBothColumnsTerminal(page, 270_000);
  112 |   const totalSeconds = Math.round((Date.now() - t0) / 1000);
  113 | 
  114 |   // Parse the footer.
  115 |   const footer = (await page.locator('text=/Opus: .* Haiku:/').first().textContent()) ?? '';
  116 | 
  117 |   // Extract counts from the footer.
  118 |   const opusMatch = footer.match(/Opus:\s*([a-z]+)\s*·\s*(\d+)\s*gaps?/i);
  119 |   const haikuMatch = footer.match(/Haiku:\s*(.+?)$/i);
  120 |   const haikuStatus = haikuMatch?.[1]?.trim() ?? '';
  121 |   const haikuGapMatch = haikuStatus.match(/(\d+)\s*gaps?\s*·/);
  122 | 
  123 |   // Parse the canonical gap counts from the footer line. DOM-counting via
  124 |   // [class*="compareGap"] inflates by 4× because each card has 4 nested
  125 |   // elements (parent compareGap + compareGapTitle + compareGapDesc + compareGapMeta).
  126 |   // The footer reads "Opus: done · N gaps · ..." which is the worker's
  127 |   // authoritative final count.
  128 |   const footerOpusMatch = footer.match(/Opus:\s*\w+\s*·\s*(\d+)\s*gaps?/i);
  129 |   const footerHaikuMatch = footer.match(/Haiku:.*?(\d+)\s*gaps?/i);
  130 |   const opusGaps = footerOpusMatch ? parseInt(footerOpusMatch[1]!, 10) : 0;
  131 |   const haikuGaps = footerHaikuMatch ? parseInt(footerHaikuMatch[1]!, 10) : 0;
  132 | 
  133 |   // Take a final screenshot for review.
  134 |   const safeName = topic.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  135 |   await page.screenshot({ path: `playwright-report-live/screenshots/final-${safeName}.png`, fullPage: true });
  136 | 
  137 |   return {
  138 |     topic,
  139 |     opusStatus: opusMatch?.[1] ?? 'unknown',
  140 |     opusGapCount: opusGaps,
  141 |     haikuStatus,
  142 |     haikuGapCount: haikuGaps,
  143 |     footerText: footer,
  144 |     totalSeconds,
  145 |     consoleErrors,
  146 |     pageErrors,
  147 |     failedRequests,
  148 |   };
  149 | }
  150 | 
  151 | test.describe('Lacunose live A/B stress test', () => {
  152 |   for (const { topic, field, minGapsTotal } of TOPICS) {
  153 |     test(`${topic} → reaches terminal with ≥${minGapsTotal} total gaps`, async ({ page }) => {
  154 |       const outcome = await runOneTopic(page, topic, field);
  155 | 
  156 |       // Persist outcome to a file so we can read it post-run regardless of
  157 |       // pass/fail. Playwright's stdout buffer truncates console.log on failure.
  158 |       const fs = await import('node:fs');
  159 |       const safeName = topic.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  160 |       fs.mkdirSync('playwright-report-live/outcomes', { recursive: true });
  161 |       fs.writeFileSync(
  162 |         `playwright-report-live/outcomes/${safeName}.json`,
  163 |         JSON.stringify(outcome, null, 2),
  164 |       );
  165 |       console.log(JSON.stringify(outcome, null, 2));
  166 | 
  167 |       // Hard assertions
  168 |       expect(outcome.opusStatus, 'Opus should reach terminal "done"').toBe('done');
  169 |       expect(outcome.opusGapCount + outcome.haikuGapCount,
  170 |         `Combined gaps should be ≥${minGapsTotal}`).toBeGreaterThanOrEqual(minGapsTotal);
> 171 |       expect(outcome.pageErrors, 'No uncaught page errors').toEqual([]);
      |                                                                                  ^ Error: No 4xx/5xx on /api/beta/* during the run
  172 |       expect(outcome.failedRequests, 'No 4xx/5xx on /api/beta/* during the run').toEqual([]);
  173 | 
  174 |       // Soft warnings (logged, not failed)
  175 |       if (outcome.opusGapCount === 0) {
  176 |         console.warn(`⚠️ Opus produced 0 gaps for "${topic}"`);
  177 |       }
  178 |       if (outcome.haikuGapCount === 0) {
  179 |         console.warn(`⚠️ Haiku produced 0 gaps for "${topic}"`);
  180 |       }
  181 |       if (outcome.consoleErrors.length > 0) {
  182 |         console.warn(`⚠️ ${outcome.consoleErrors.length} console errors:`, outcome.consoleErrors.slice(0, 3));
  183 |       }
  184 |     });
  185 |   }
  186 | });
  187 | 
```