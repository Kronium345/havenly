/**
 * Renders the Havenly splash image from the brand SVGs:
 *   assets/images/splash-icon.png  the white house mark above the white "havenly"
 *                                  wordmark, on a transparent square. app.json's
 *                                  expo-splash-screen plugin centres it on the
 *                                  brand blue (#2962FF) at `imageWidth`.
 *
 * Android 12+ shows the splash image through the system splash API, which fits it into
 * an `imageWidth`-dp box inside a 288 dp canvas and shows only a 192 dp circle in the
 * middle. A wide logo loses its corners (the "h" and the "y"), so the logo is scaled to
 * sit inside that circle with a margin. Keep IMAGE_WIDTH equal to app.json's imageWidth.
 *
 * Run: npm run generate:splash
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// White (`on-primary`) on the blue splash; the SVGs are drawn in ink.
const INK = '#0B0B1A';
const WHITE = '#FFFFFF';
const whiteSvg = (file) => Buffer.from(readFileSync(join(root, 'assets/brand', file), 'utf8').replaceAll(INK, WHITE));

const WIDTH = 1200;
const MARK = 600; // house mark, square
const WORDMARK = 1000; // wordmark width; height follows its viewBox
const GAP = 50;

const mark = await sharp(whiteSvg('havenly-mark.svg'), { density: 400 }).resize(MARK, MARK).png().toBuffer();
const wordmark = await sharp(whiteSvg('havenly-wordmark.svg'), { density: 400 }).resize({ width: WORDMARK }).png().toBuffer();
const { height: wordmarkHeight } = await sharp(wordmark).metadata();

const height = MARK + GAP + wordmarkHeight;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const logo = await sharp({ create: { width: WIDTH, height, channels: 4, background: transparent } })
  .composite([
    { input: mark, left: Math.round((WIDTH - MARK) / 2), top: 0 },
    { input: wordmark, left: Math.round((WIDTH - WORDMARK) / 2), top: MARK + GAP },
  ])
  .png()
  .toBuffer();

// The farthest visible logo pixel from the logo's centre decides how small it must be.
const { data, info } = await sharp(logo).raw().toBuffer({ resolveWithObject: true });
let reach = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] === 0) continue;
    reach = Math.max(reach, Math.hypot(x + 0.5 - info.width / 2, y + 0.5 - info.height / 2));
  }
}

// Android's visible circle is 96 dp of the IMAGE_WIDTH-dp box; keep 8% inside it.
const IMAGE_WIDTH = 200;
const SIZE = 1200; // square output
const radius = (96 / IMAGE_WIDTH) * SIZE * 0.92;
const scale = radius / reach;
const scaled = await sharp(logo)
  .resize(Math.round(info.width * scale), Math.round(info.height * scale))
  .png()
  .toBuffer();
const { width: w, height: h } = await sharp(scaled).metadata();

await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: transparent } })
  .composite([{ input: scaled, left: Math.round((SIZE - w) / 2), top: Math.round((SIZE - h) / 2) }])
  .png({ compressionLevel: 9 })
  .toFile(join(root, 'assets/images/splash-icon.png'));

console.log(`Wrote assets/images/splash-icon.png (${SIZE}×${SIZE}, logo ${w}×${h} inside Android's splash circle)`);
