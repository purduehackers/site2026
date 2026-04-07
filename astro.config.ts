// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

const analyticsAstro = fileURLToPath(
  new URL(
    './node_modules/@vercel/analytics/dist/astro/index.astro',
    import.meta.url
  )
);

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        '@vercel/analytics/astro': analyticsAstro,
      },
    },
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'whyte',
      cssVariable: '--font-whyte',
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            src: ['./src/assets/fonts/Whyte.woff2'],
          },
        ],
      },
    },
    {
      provider: fontProviders.google(),
      name: 'Inconsolata',
      cssVariable: '--font-inconsolata',
    },
    {
      provider: fontProviders.google(),
      name: 'Silkscreen',
      cssVariable: '--font-silkscreen',
    },
    {
      provider: fontProviders.local(),
      name: 'PixelHackers',
      cssVariable: '--font-pixel-hackers',
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            src: ['./src/assets/fonts/PixelHackers.woff2'],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'PolySans',
      cssVariable: '--font-polysans',
      options: {
        variants: [
          {
            weight: 300,
            style: 'normal',
            src: ['./src/assets/fonts/PolySans-Slim.woff2'],
          },
          {
            weight: 300,
            style: 'italic',
            src: ['./src/assets/fonts/PolySans-SlimItalic.woff2'],
          },
          {
            weight: 400,
            style: 'normal',
            src: ['./src/assets/fonts/PolySans-Neutral.woff2'],
          },
          {
            weight: 400,
            style: 'italic',
            src: ['./src/assets/fonts/PolySans-NeutralItalic.woff2'],
          },
          {
            weight: 500,
            style: 'normal',
            src: ['./src/assets/fonts/PolySans-Median.woff2'],
          },
          {
            weight: 500,
            style: 'italic',
            src: ['./src/assets/fonts/PolySans-MedianItalic.woff2'],
          },
          {
            weight: 600,
            style: 'normal',
            src: ['./src/assets/fonts/PolySans-Relax.woff2'],
          },
          {
            weight: 600,
            style: 'italic',
            src: ['./src/assets/fonts/PolySans-RelaxItalic.woff2'],
          },
          {
            weight: 700,
            style: 'normal',
            src: ['./src/assets/fonts/PolySans-Bulky.woff2'],
          },
          {
            weight: 700,
            style: 'italic',
            src: ['./src/assets/fonts/PolySans-BulkyItalic.woff2'],
          },
          {
            weight: 900,
            style: 'normal',
            src: ['./src/assets/fonts/PolySans-Inky.woff2'],
          },
          {
            weight: 900,
            style: 'italic',
            src: ['./src/assets/fonts/PolySans-InkyItalic.woff2'],
          },
        ],
      },
    },
  ],
});
