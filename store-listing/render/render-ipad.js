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

// Target sizes.
// 12.9-inch iPad Pro portrait: 2048 x 2732
const TARGETS = [
  { name: 'app-store-ipad-pro',  w: 2048, h: 2732, dir: 'app-store-ipad-pro' },
];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const t of TARGETS) fs.mkdirSync(path.join(OUT_DIR, t.dir), { recursive: true });

  // Render at logical 633x844 with deviceScaleFactor=4 -> ~2532x3376; then resize to 2048x2732.
  const DSF = 4;
  const WIDTH = 633;
  const HEIGHT = 844;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DSF,
  });
  const page = await ctx.newPage();

  for (const shot of SHOTS) {
    const url = `${RENDERER}?shot=${shot.n}`;
    console.log(`[${shot.slug}] loading ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Inject CSS to override width to match iPad aspect ratio
    await page.addStyleTag({
      content: `
        html, body, #root, .stage, .stage-screen { width: ${WIDTH}px !important; height: ${HEIGHT}px !important; }
      `
    });
    
    await page.waitForFunction(() => window.__READY__ === true, { timeout: 15000 });
    // Capture at the source resolution
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });

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
