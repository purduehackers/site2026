/**
 * Normalizes the sponsor logos so they carry the same optical weight next to
 * each other — the "logo soup" problem:
 * https://www.sanity.io/engineering/the-logo-soup-problem
 *
 * Sizing every logo to one fixed height makes wide wordmarks (Kleiner Perkins)
 * bulldoze compact ones (Zed, Paper), and dense marks (Walmart, Roblox) shout
 * over airy ones (Neuralink, The Browser Company). Instead each logo gets a
 * width of `(aspectRatio ** SCALE_FACTOR) * BASE_SIZE`, then a nudge up or down
 * based on how much ink it actually puts on the page.
 *
 * The measuring pass rasterizes each SVG, so it needs @napi-rs/canvas. Rather
 * than pay that on every render (the homepage is ISR'd, so the page module runs
 * in the serverless function), it runs here and commits its output. Re-run it
 * whenever src/data/sponsors.json changes or a logo file is replaced:
 *
 *   bun run logos:normalize
 *
 * Must run under node, not bun: bun resolves the logo-soup module through its
 * install cache, where the @napi-rs/canvas peer dep isn't visible.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  createNormalizedLogo,
  getVisualCenterTransform,
  measureImages,
} from '@sanity-labs/logo-soup/node';

// Nominal size in px that every logo is normalized around. The rendered size is
// this scaled by --logo-base in the stylesheet, so this is a unit, not a pixel
// budget — keep it at the library default and tune the CSS variable instead.
const BASE_SIZE = 48;
// 0 = every logo the same width, 1 = every logo the same height. Halfway is the
// blog post's recommendation and keeps both extremes in the set readable.
const SCALE_FACTOR = 0.5;
// How hard to correct for ink coverage. 0 = off, 1 = full.
const DENSITY_FACTOR = 0.5;
// Vertical-only optical centering. Horizontal centering fights the flex layout.
const ALIGN_BY = 'visual-center-y';

const root = new URL('../', import.meta.url);
const inputPath = new URL('src/data/sponsors.json', root);
const outputPath = new URL('src/data/sponsors.normalized.json', root);

const sponsors = JSON.parse(await readFile(inputPath, 'utf8'));

const measurements = await measureImages(
  sponsors.map((sponsor) =>
    fileURLToPath(new URL(`public${sponsor.src}`, root))
  ),
  // No backgroundColor: every logo here is a transparent SVG, so the library
  // falls back to measuring coverage from the alpha channel alone. That is what
  // we want — the grid recolors each logo to flat white in CSS, so the artwork's
  // own colors say nothing about how heavy it looks on the page.
  { densityAware: true }
);

const normalized = sponsors.map((sponsor, index) => {
  const logo = createNormalizedLogo(
    { src: sponsor.src, alt: sponsor.name },
    measurements[index],
    BASE_SIZE,
    SCALE_FACTOR,
    DENSITY_FACTOR
  );

  // The library hands back an absolute-px transform sized against BASE_SIZE.
  // The grid renders in em so it can scale at breakpoints, so re-express the
  // nudge in the same unit — otherwise the correction drifts as the soup grows.
  const transform = (getVisualCenterTransform(logo, ALIGN_BY) ?? null)?.replace(
    /(-?[\d.]+)px/g,
    (_, px) => `${Number((px / BASE_SIZE).toFixed(4))}em`
  );

  return {
    name: sponsor.name,
    src: sponsor.src,
    url: sponsor.url ?? null,
    width: logo.normalizedWidth,
    height: logo.normalizedHeight,
    transform: transform ?? null,
  };
});

await writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`);

const label = (value) => String(value).padEnd(32);
console.log(
  `base ${BASE_SIZE}px · scale ${SCALE_FACTOR} · density ${DENSITY_FACTOR}\n`
);
for (const logo of normalized) {
  console.log(
    `${label(logo.name)}${logo.width} × ${logo.height}${logo.transform ? `  ${logo.transform}` : ''}`
  );
}
console.log(`\nwrote ${fileURLToPath(outputPath)}`);
