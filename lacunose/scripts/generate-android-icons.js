/**
 * Generate Android adaptive icon assets from the Lacunose logo.
 * 
 * Replaces the default Expo "A" chevron icons with the proper Lacunose logo.
 */

const sharp = require('sharp');
const path = require('path');

const LOGO_PATH = path.resolve(__dirname, '../../Logo/_lacunose Logo.png');
const RES_DIR = path.resolve(__dirname, '../android/app/src/main/res');

// Android mipmap density sizes
const densities = {
  mdpi:    { launcher: 48,  adaptive: 108 },
  hdpi:    { launcher: 72,  adaptive: 162 },
  xhdpi:   { launcher: 96,  adaptive: 216 },
  xxhdpi:  { launcher: 144, adaptive: 324 },
  xxxhdpi: { launcher: 192, adaptive: 432 },
};

async function generateIcons() {
  for (const [density, sizes] of Object.entries(densities)) {
    const mipmapDir = path.join(RES_DIR, `mipmap-${density}`);
    const safeZone = Math.round(sizes.adaptive * 0.66);
    const totalPad = sizes.adaptive - safeZone;
    const padTop = Math.floor(totalPad / 2);
    const padBottom = sizes.adaptive - safeZone - padTop;
    const padLeft = padTop;
    const padRight = padBottom;

    // 1. ic_launcher.webp — full icon baked
    await sharp(LOGO_PATH)
      .resize(sizes.launcher, sizes.launcher)
      .webp({ quality: 90 })
      .toFile(path.join(mipmapDir, 'ic_launcher.webp'));

    // 2. ic_launcher_round.webp — same as launcher
    await sharp(LOGO_PATH)
      .resize(sizes.launcher, sizes.launcher)
      .webp({ quality: 90 })
      .toFile(path.join(mipmapDir, 'ic_launcher_round.webp'));

    // 3. ic_launcher_foreground.webp — logo in safe zone with transparent padding
    await sharp(LOGO_PATH)
      .resize(safeZone, safeZone)
      .extend({
        top: padTop,
        bottom: padBottom,
        left: padLeft,
        right: padRight,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .webp({ quality: 90 })
      .toFile(path.join(mipmapDir, 'ic_launcher_foreground.webp'));

    // 4. ic_launcher_background.webp — solid dark background
    await sharp({
      create: {
        width: sizes.adaptive,
        height: sizes.adaptive,
        channels: 3,
        background: { r: 14, g: 14, b: 12 } // #0E0E0C
      }
    })
      .webp({ quality: 90 })
      .toFile(path.join(mipmapDir, 'ic_launcher_background.webp'));

    // 5. ic_launcher_monochrome.webp — greyscale version
    await sharp(LOGO_PATH)
      .resize(safeZone, safeZone)
      .greyscale()
      .extend({
        top: padTop,
        bottom: padBottom,
        left: padLeft,
        right: padRight,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .webp({ quality: 90 })
      .toFile(path.join(mipmapDir, 'ic_launcher_monochrome.webp'));

    console.log(`✅ ${density}: launcher=${sizes.launcher}px, adaptive=${sizes.adaptive}px`);
  }

  console.log('\n🎉 All Android mipmap icons regenerated with Lacunose logo!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
