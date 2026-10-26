/**
 * Renders the Havenly app icon PNGs from assets/brand/havenly-mark.svg.
 *   assets/images/logo.png       1024×1024 full icon (brand yellow + mark), used by app.json `icon`
 *   assets/images/logo-mark.png  1024×1024 transparent mark, source for the Android adaptive
 *                                foreground and the monochrome (themed) icon
 *   assets/images/favicon.png    48×48 web favicon
 *
 * Then run scripts/generate-android-adaptive-foreground.mjs.
 *
 * Run: node scripts/generate-app-icon.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const markSvg = join(root, 'assets/brand/havenly-mark.svg');

const SIZE = 1024;
// Brand primary yellow (tailwind.config.js `primary`). Keep in step with app.json backgroundColor.
const BACKGROUND = '#FFC629';

const mark = await sharp(markSvg, { density: 300 }).resize(SIZE, SIZE).png().toBuffer();

await sharp(mark).toFile(join(root, 'assets/images/logo-mark.png'));

const icon = await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: BACKGROUND },
})
  .composite([{ input: mark }])
  // iOS rejects icons with transparency, so the full icon is flattened onto the yellow.
  .flatten({ background: BACKGROUND })
  .removeAlpha()
  .png()
  .toBuffer();

await sharp(icon).toFile(join(root, 'assets/images/logo.png'));
await sharp(icon).resize(48, 48).png().toFile(join(root, 'assets/images/favicon.png'));

console.log('Wrote assets/images/logo.png, logo-mark.png and favicon.png');
