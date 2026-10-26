/**
 * Scales logo-mark.png down on a 1024×1024 canvas for Android adaptive icons.
 * Android masks clip foreground art outside the 66dp safe circle (of 108dp). The house's
 * corners reach furthest from the centre, so 72% keeps them inside a circular mask while
 * the icon still fills the launcher shape. (oq-agile-athletes uses 96% for a rounder logo.)
 *
 * Run: node scripts/generate-android-adaptive-foreground.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const source = join(root, 'assets/images/logo-mark.png');
const output = join(root, 'assets/images/android-adaptive-foreground.png');

const CANVAS = 1024;
const LOGO_SCALE = 0.72;

const logoSize = Math.round(CANVAS * LOGO_SCALE);
const inset = Math.round((CANVAS - logoSize) / 2);

const resized = await sharp(source)
  .resize(logoSize, logoSize, {
    fit: 'inside',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const meta = await sharp(resized).metadata();
const padTop = inset + Math.round((logoSize - (meta.height ?? logoSize)) / 2);
const padLeft = inset + Math.round((logoSize - (meta.width ?? logoSize)) / 2);
const padBottom = CANVAS - (meta.height ?? logoSize) - padTop;
const padRight = CANVAS - (meta.width ?? logoSize) - padLeft;

await sharp(resized)
  .extend({
    top: padTop,
    bottom: padBottom,
    left: padLeft,
    right: padRight,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(output);

console.log(`Wrote ${output} (logo at ${LOGO_SCALE * 100}% scale)`);
