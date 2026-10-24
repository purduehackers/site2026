/**
 * Bake the Show photos' existing SVG colour dither into static WebP assets.
 * Safari stalls when this filter is repainted under an animated SVG mask.
 * Re-run `bun run shows:dither` after replacing a source photo or changing
 * #ph-dither-color in DitherFilters.astro, then commit the generated images.
 * This runs offline, never during homepage rendering or in the browser.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const filters = await readFile(
  new URL('src/components/DitherFilters.astro', root),
  'utf8'
);
const filter = filters.match(
  /<filter\s+id="ph-dither-color"[\s\S]*?<\/filter>/
)?.[0];
if (!filter) throw new Error('Cannot find #ph-dither-color');

const directory = new URL('src/assets/shows/dithered/', root);
await mkdir(directory, { recursive: true });

for (const name of ['bento-dj', 'spill-robot', 'burst']) {
  const { data, info } = await sharp(
    fileURLToPath(new URL(`src/assets/shows/${name}.webp`, root))
  )
    .rotate()
    .resize({ width: 1920 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}">
    <defs>${filter}</defs>
    <image width="100%" height="100%" href="data:image/png;base64,${data.toString('base64')}" filter="url(#ph-dither-color)" />
  </svg>`;
  const output = fileURLToPath(new URL(`${name}.webp`, directory));
  await sharp(Buffer.from(svg)).webp({ quality: 92, effort: 6 }).toFile(output);
  console.log(`Dithered ${name}: ${info.width} × ${info.height}`);
}
