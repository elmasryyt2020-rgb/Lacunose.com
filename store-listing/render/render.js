/* Renders each Shot in renderer.html at App Store / Play Store sizes. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const sharp = require('sharp');

const RENDERER = 'file:///' + path.resolve(__dirname, 'renderer.html').replace(/\\/g, '/');
const OUT_DIR  = path.resolve(__dirname, '..', 'output');

const SHOTS = [
  { n: 1, slug: '01-hero' },
  { n: 2, slug: '02-analyze' },
  { n: 3, slug: '03-results' },
  { n: 4, slug: '04-evidence' },
  { n: 5, slug: '05-library' },
];

// Target sizes. The design is 390x844 (≈ 1:2.164).
// iPhone 6.7" required by App Store: 1290x2796 (≈ 1:2.167) — accepted by Play Store too.
// iPhone 6.5" optional fallback:    1242x2688 (≈ 1:2.164) — exact aspect match.
// Google Play phone (square-ish allowed too); 1290x2796 is well within Play's range so we share it.
const TARGETS = [
  { name: 'app-store-6.7',  w: 1290, h: 2796, dir: 'app-store-iphone-6.7' },
  { name: 'app-store-6.5',  w: 1242, h: 2688, dir: 'app-store-iphone-6.5' },
  { name: 'google-play',    w: 1290, h: 2796, dir: 'google-play-phone' },
];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const t of TARGETS) fs.mkdirSync(path.join(OUT_DIR, t.dir), { recursive: true });

  // Render at logical 390x844 with deviceScaleFactor=4 → ~1560x3376; then resize to each target.
  // Higher DSF = sharper text/icons before downscale.
  const DSF = 4;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: DSF,
  });
  const page = await ctx.newPage();

  for (const shot of SHOTS) {
    const url = `${RENDERER}?shot=${shot.n}`;
    console.log(`[${shot.slug}] loading ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__READY__ === true, { timeout: 15000 });
    // Capture at the source resolution
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 390, height: 844 } });

    for (const t of TARGETS) {
      const outPath = path.join(OUT_DIR, t.dir, `${shot.slug}.png`);
      await sharp(buf)
        .resize(t.w, t.h, { fit: 'fill', kernel: 'lanczos3' })
        .png({ compressionLevel: 9 })
        .toFile(outPath);
      const stat = fs.statSync(outPath);
      console.log(`  → ${t.dir}/${shot.slug}.png  (${t.w}x${t.h}, ${(stat.size/1024).toFixed(0)} KB)`);
    }
  }

  await browser.close();
  console.log('\nDone. Output in:', OUT_DIR);
})().catch(e => { console.error(e); process.exit(1); });
