/**
 * Generate a minimal transparent splash icon.
 * The native splash will just show a solid background color (#F1EEE8).
 * The real branded splash is handled by the React Native SplashView component.
 */

const sharp = require('sharp');
const path = require('path');

const RES_DIR = path.resolve(__dirname, '../android/app/src/main/res');
const ASSETS_DIR = path.resolve(__dirname, '../assets/images');

// A small transparent PNG to replace the old splash icon
const SPLASH_SIZE = 1;

async function generate() {
  // 1. Create a transparent 1x1 pixel splash-icon.png for app.json
  await sharp({
    create: {
      width: SPLASH_SIZE,
      height: SPLASH_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('✅ splash-icon.png (transparent)');

  // 2. Create transparent splash logos for all Android drawable densities
  const drawableDensities = {
    'drawable-mdpi': 48,
    'drawable-hdpi': 72,
    'drawable-xhdpi': 96,
    'drawable-xxhdpi': 144,
    'drawable-xxxhdpi': 192,
  };

  for (const [dir, size] of Object.entries(drawableDensities)) {
    const outPath = path.join(RES_DIR, dir, 'splashscreen_logo.png');
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .png()
      .toFile(outPath);
    console.log(`✅ ${dir}/splashscreen_logo.png (transparent ${size}px)`);
  }

  console.log('\n🎉 All splash assets generated!');
}

generate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
