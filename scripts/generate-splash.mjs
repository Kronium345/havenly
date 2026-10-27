/**
 * Renders the Havenly splash image from the brand SVGs:
 *   assets/images/splash-icon.png  the white house mark above the white "havenly"
 *                                  wordmark, on transparency. app.json's
 *                                  expo-splash-screen plugin centres it on the
 *                                  brand blue (#2962FF) at `imageWidth`.
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
await sharp({ create: { width: WIDTH, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: mark, left: Math.round((WIDTH - MARK) / 2), top: 0 },
    { input: wordmark, left: Math.round((WIDTH - WORDMARK) / 2), top: MARK + GAP },
  ])
  .png({ compressionLevel: 9 })
  .toFile(join(root, 'assets/images/splash-icon.png'));

console.log(`Wrote assets/images/splash-icon.png (${WIDTH}×${height})`);
