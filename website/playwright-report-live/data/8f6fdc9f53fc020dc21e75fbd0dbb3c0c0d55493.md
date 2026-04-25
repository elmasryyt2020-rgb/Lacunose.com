# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stress-test.spec.ts >> Lacunose live A/B stress test >> whole tooth regeneration → reaches terminal with ≥4 total gaps
- Location: e2e-live\stress-test.spec.ts:152:9

# Error details

```
Error: No 4xx/5xx on /api/beta/* during the run

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 6

- Array []
+ Array [
+   Object {
+     "status": 401,
+     "url": "https://lacunose.com/api/beta/analyze",
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
          - generic [ref=e13]: whole tooth regeneration
        - generic [ref=e14]:
          - button "Compare with Haiku" [ref=e15] [cursor=pointer]:
            - img [ref=e16]
            - text: Compare with Haiku
          - button "New analysis" [ref=e20] [cursor=pointer]
      - generic [ref=e21]:
        - generic [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e24]: Opus 4.7
            - generic [ref=e25]: $1.8171 · 60 calls
          - generic [ref=e26]: claude-opus-4-7
          - generic [ref=e27] [cursor=pointer]:
            - generic [ref=e29]: Methodology
            - generic [ref=e31]: Standardized success-rate benchmarking for orthotopic whole-tooth regeneration in large an
            - generic [ref=e32]: Across pig and other large-animal studies of bioengineered tooth bud implantation, eruption success rates are modest and protocols vary widely, but no standardized benchmarking framework exists. A systematic registry-style analysis could harmonize endpoints (eruption, crown/root morphology, occlusion) across heterogeneous protocols to identify which cell-reassociation and implantation parameters drive success.
            - generic [ref=e33]:
              - generic [ref=e34]: N 8/10
              - generic [ref=e35]: F 8/10
              - generic [ref=e36]: E 3
          - generic [ref=e37] [cursor=pointer]:
            - generic [ref=e39]: Intersection
            - generic [ref=e41]: Ameloblast cell source bottleneck for enamel layer in bioengineered whole teeth
            - generic [ref=e42]: Whole-tooth regeneration strategies produce dentin and pulp-like structures, but the enamel component remains constrained because existing ameloblast cell lines are inadequate. No published work integrates emerging ameloblast culture technologies with cell re-association or scaffold-based tooth bud constructs to test whether functional enamel can be generated in vivo.
            - generic [ref=e43]:
              - generic [ref=e44]: N 9/10
              - generic [ref=e45]: F 5/10
              - generic [ref=e46]: E 3
          - generic [ref=e47] [cursor=pointer]:
            - generic [ref=e49]: Contradiction
            - generic [ref=e51]: Head-to-head comparison of scaffold strategies for organized dentin/enamel formation
            - generic [ref=e52]: Decellularized tooth bud scaffolds with reseeded cells produce organized dental tissues, while acellular or BMP-only scaffolds do not, yet biomaterial reviews report no consensus on optimal scaffold/cell pairing. A direct comparative preclinical study could resolve which scaffold-cell combinations reliably yield organized dentin and enamel-like tissues.
            - generic [ref=e53]:
              - generic [ref=e54]: N 7/10
              - generic [ref=e55]: F 7/10
              - generic [ref=e56]: E 3
          - generic [ref=e57] [cursor=pointer]:
            - generic [ref=e59]: Intersection
            - generic [ref=e61]: "Crown morphology control: postnatal vs embryonic tooth bud cell potential"
            - generic [ref=e62]: Embryonic tooth bud cells confer greater control over crown shape than postnatal cells, yet clinical translation requires postnatal-derived sources, and challenges in controlling tooth size, color, and shape remain unresolved. A focused comparative study could identify signaling or co-culture interventions that recover crown-shape patterning capacity in postnatal cells.
            - generic [ref=e63]:
              - generic [ref=e64]: N 8/10
              - generic [ref=e65]: F 7/10
              - generic [ref=e66]: E 2
          - generic [ref=e67] [cursor=pointer]:
            - generic [ref=e69]: Future work
            - generic [ref=e71]: Long-term functional and immunological outcomes of regenerated teeth beyond short follow-u
            - generic [ref=e72]: Most preclinical whole-tooth and tooth-root regeneration studies report short-term outcomes (e.g., 3 months) and do not characterize long-term stability or immune rejection. A prospective long-duration animal study tracking occlusal function, structural integrity, and immune response would address a patient-important outcome gap blocking clinical translation.
            - generic [ref=e73]:
              - generic [ref=e74]: N 8/10
              - generic [ref=e75]: F 5/10
              - generic [ref=e76]: E 3
          - generic [ref=e77] [cursor=pointer]:
            - generic [ref=e79]: Coverage
            - generic [ref=e81]: "GelMA scaffolds for whole-tooth regeneration: absence of integrated in vivo studies"
            - generic [ref=e82]: Gelatin methacryloyl (GelMA) scaffolds have shown efficacy for individual tooth components and tooth germ regeneration, but no work has tested them in an integrated whole-tooth regeneration system. This leaves an open question about whether a single biomaterial platform can support concurrent regeneration of dentin, pulp, periodontal ligament, and cementum in vivo.
            - generic [ref=e83]:
              - generic [ref=e84]: N 8/10
              - generic [ref=e85]: F 5/10
              - generic [ref=e86]: E 3
          - generic [ref=e87] [cursor=pointer]:
            - generic [ref=e89]: Methodology
            - generic [ref=e91]: Defining human-relevant cell sources for epithelial–mesenchymal tooth regeneration
            - generic [ref=e92]: Existing tooth regeneration models rely on rodent or allogeneic swine cells, leaving unresolved which human-derived epithelial and mesenchymal cell sources are feasible and immunologically tolerated. A systematic review followed by an in vitro feasibility study could map candidate human cell sources before in vivo work.
            - generic [ref=e93]:
              - generic [ref=e94]: N 7/10
              - generic [ref=e95]: F 8/10
              - generic [ref=e96]: E 2
          - generic [ref=e97] [cursor=pointer]:
            - generic [ref=e99]: Methodology
            - generic [ref=e101]: Preventing ankylosis in bioengineered tooth germ transplants via PDL optimization
            - generic [ref=e102]: Whole-tooth regeneration studies in large animals report ankylosis and incomplete periodontal ligament (PDL) integration, while broader dental regeneration reviews note PDL outcomes remain unpredictable. No work has systematically compared scaffold or cell-seeding strategies aimed specifically at producing a functional, non-ankylotic PDL interface in regenerated teeth.
            - generic [ref=e103]:
              - generic [ref=e104]: N 8/10
              - generic [ref=e105]: F 4/10
              - generic [ref=e106]: E 2
          - generic [ref=e107] [cursor=pointer]:
            - generic [ref=e109]: Temporal
            - generic [ref=e111]: Long-term durability and patient-relevant outcomes of bioengineered teeth
            - generic [ref=e112]: Existing porcine and murine whole-tooth regeneration studies report short follow-up windows (3–6 months) focused on histology rather than masticatory function, periodontal stability, or root maturation. Long-term outcome data needed to support translational and eventual first-in-human evaluation are absent.
            - generic [ref=e113]:
              - generic [ref=e114]: N 7/10
              - generic [ref=e115]: F 4/10
              - generic [ref=e116]: E 2
        - generic [ref=e117]:
          - generic [ref=e118]:
            - generic [ref=e119]: Haiku 4.5
            - generic [ref=e120]: $0.2007 · 61 calls
          - generic [ref=e121]: claude-haiku-4-5-20251001
          - generic [ref=e122] [cursor=pointer]:
            - generic [ref=e124]: Future work
            - generic [ref=e126]: Morphological control and predictability of regenerated tooth size, shape, and color in bi
            - generic [ref=e127]: Current whole-tooth regeneration achieves functional tissues but lacks control over crown morphology, tooth size, and color—critical for clinical esthetics and function. Embryonic tooth buds show higher crown-shape regulation potential than postnatal buds, but mechanisms and optimization strategies remain unexplored. No studies report patient-acceptable esthetic outcomes or compare morphological fidelity to native teeth.
            - generic [ref=e128]:
              - generic [ref=e129]: N 9/10
              - generic [ref=e130]: F 6/10
              - generic [ref=e131]: E 2
          - generic [ref=e132] [cursor=pointer]:
            - generic [ref=e134]: Methodology
            - generic [ref=e136]: Standardized scaffold design and recellularization protocols for whole-tooth regeneration
            - generic [ref=e137]: Decellularized tooth bud scaffolds show promise only when recellularized with native cells, but acellular and BMP-seeded variants fail to produce organized dentin and enamel. Current protocols use porcine source material; translation to human tooth bud scaffolds and standardized recellularization methods across animal models is absent. Heterogeneity in developmental stages, cellular components, and scaffold materials prevents meta-analysis.
            - generic [ref=e138]:
              - generic [ref=e139]: N 8/10
              - generic [ref=e140]: F 7/10
              - generic [ref=e141]: E 2
          - generic [ref=e142] [cursor=pointer]:
            - generic [ref=e144]: Methodology
            - generic [ref=e146]: Comparative efficacy of embryonic vs. postnatal tooth bud cells in whole tooth regeneratio
            - generic [ref=e147]: While embryonic and postnatal tooth bud cells both show tooth-forming potential, the literature documents that "results from embryonic and postnatal tooth buds differ considerably" but does not provide head-to-head efficacy comparisons or define selection criteria for clinical application. A systematic comparison of cell source outcomes (differentiation rate, structural fidelity, immunogenicity) is absent.
            - generic [ref=e148]:
              - generic [ref=e149]: N 8/10
              - generic [ref=e150]: F 7/10
              - generic [ref=e151]: E 2
          - generic [ref=e152] [cursor=pointer]:
            - generic [ref=e154]: Population
            - generic [ref=e156]: "Tooth redevelopment signaling in adult mammals: closing the murine-to-human translational"
            - generic [ref=e157]: Early tooth development is well-characterized in murine models, but the molecular mechanisms driving tooth redevelopment and regeneration in adult mammals remain poorly understood. This gap prevents rational design of regenerative therapies that could reactivate dormant developmental pathways in humans.
            - generic [ref=e158]:
              - generic [ref=e159]: N 8/10
              - generic [ref=e160]: F 7/10
              - generic [ref=e161]: E 2
          - generic [ref=e162] [cursor=pointer]:
            - generic [ref=e164]: Temporal
            - generic [ref=e166]: Long-term functional integration of regenerated teeth in large animal models
            - generic [ref=e167]: Both decellularized tooth bud scaffolds and dental pulp stem cell sheet constructs have been evaluated only in short-term follow-up (3–6 months) in animal models. The durability of regenerated tooth structure, periodontal ligament formation, and masticatory function beyond 6 months remain unknown. This gap addresses whether regenerated teeth maintain structural integrity and functional integration over extended periods.
            - generic [ref=e168]:
              - generic [ref=e169]: N 8/10
              - generic [ref=e170]: F 6/10
              - generic [ref=e171]: E 2
          - generic [ref=e172] [cursor=pointer]:
            - generic [ref=e174]: Intersection
            - generic [ref=e176]: "Stem cell-mediated whole tooth regeneration: bridging developmental mechanisms to tissue e"
            - generic [ref=e177]: Stem cell-based approaches to whole tooth regeneration require deeper understanding of natural developmental mechanisms, but the specific signaling cues and temporal sequences needed to guide stem cells through complete odontogenesis remain undefined. This gap prevents optimization of tissue engineering scaffolds and differentiation protocols.
            - generic [ref=e178]:
              - generic [ref=e179]: N 7/10
              - generic [ref=e180]: F 7/10
              - generic [ref=e181]: E 2
      - generic [ref=e182]: "Opus: done · 9 gaps · $1.8171 · 60 calls · Haiku: 6 gaps · $0.2007 · 61 calls"
      - generic [ref=e183]: Same topic. Same corpus. Same pipeline. Different reasoning model.
  - alert [ref=e184]
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
  123 |   // Verify gap cards rendered in each column
  124 |   const opusCardCount = await page.locator('[class*="compareGap"]').nth(0).count().catch(() => 0);
  125 |   // Better: count the gap cards under each column. Use the columns themselves.
  126 |   const columns = page.locator('[class*="compareCol"]');
  127 |   const opusColumn = columns.first();
  128 |   const haikuColumn = columns.nth(1);
  129 |   const opusGaps = await opusColumn.locator('[class*="compareGap"]').count();
  130 |   const haikuGaps = await haikuColumn.locator('[class*="compareGap"]').count();
  131 | 
  132 |   // Take a final screenshot for review.
  133 |   const safeName = topic.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  134 |   await page.screenshot({ path: `playwright-report-live/screenshots/final-${safeName}.png`, fullPage: true });
  135 | 
  136 |   return {
  137 |     topic,
  138 |     opusStatus: opusMatch?.[1] ?? 'unknown',
  139 |     opusGapCount: opusGaps,
  140 |     haikuStatus,
  141 |     haikuGapCount: haikuGaps,
  142 |     footerText: footer,
  143 |     totalSeconds,
  144 |     consoleErrors,
  145 |     pageErrors,
  146 |     failedRequests,
  147 |   };
  148 | }
  149 | 
  150 | test.describe('Lacunose live A/B stress test', () => {
  151 |   for (const { topic, field, minGapsTotal } of TOPICS) {
  152 |     test(`${topic} → reaches terminal with ≥${minGapsTotal} total gaps`, async ({ page }) => {
  153 |       const outcome = await runOneTopic(page, topic, field);
  154 | 
  155 |       // Persist outcome to a file so we can read it post-run regardless of
  156 |       // pass/fail. Playwright's stdout buffer truncates console.log on failure.
  157 |       const fs = await import('node:fs');
  158 |       const safeName = topic.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  159 |       fs.mkdirSync('playwright-report-live/outcomes', { recursive: true });
  160 |       fs.writeFileSync(
  161 |         `playwright-report-live/outcomes/${safeName}.json`,
  162 |         JSON.stringify(outcome, null, 2),
  163 |       );
  164 |       console.log(JSON.stringify(outcome, null, 2));
  165 | 
  166 |       // Hard assertions
  167 |       expect(outcome.opusStatus, 'Opus should reach terminal "done"').toBe('done');
  168 |       expect(outcome.opusGapCount + outcome.haikuGapCount,
  169 |         `Combined gaps should be ≥${minGapsTotal}`).toBeGreaterThanOrEqual(minGapsTotal);
  170 |       expect(outcome.pageErrors, 'No uncaught page errors').toEqual([]);
> 171 |       expect(outcome.failedRequests, 'No 4xx/5xx on /api/beta/* during the run').toEqual([]);
      |                                                                                  ^ Error: No 4xx/5xx on /api/beta/* during the run
  172 | 
  173 |       // Soft warnings (logged, not failed)
  174 |       if (outcome.opusGapCount === 0) {
  175 |         console.warn(`⚠️ Opus produced 0 gaps for "${topic}"`);
  176 |       }
  177 |       if (outcome.haikuGapCount === 0) {
  178 |         console.warn(`⚠️ Haiku produced 0 gaps for "${topic}"`);
  179 |       }
  180 |       if (outcome.consoleErrors.length > 0) {
  181 |         console.warn(`⚠️ ${outcome.consoleErrors.length} console errors:`, outcome.consoleErrors.slice(0, 3));
  182 |       }
  183 |     });
  184 |   }
  185 | });
  186 | 
```