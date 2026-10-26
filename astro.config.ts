// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import {
  IMAGE_WIDTHS,
  astroRemotePatterns,
  vercelRemotePatterns,
} from './src/lib/images';

const analyticsAstro = fileURLToPath(
  new URL(
    './node_modules/@vercel/analytics/dist/astro/index.astro',
    import.meta.url
  )
);

// https://astro.build/config
export default defineConfig({
  output: 'server',
  image: { remotePatterns: astroRemotePatterns },
  adapter: vercel({
    // Optimize images through Vercel's Image Optimization CDN in production
    // instead of running sharp inside the serverless function.
    imageService: true,
    imagesConfig: {
      sizes: IMAGE_WIDTHS,
      // Explicitly pass the Vercel patterns: this adapter version drops Astro
      // patterns that specify a protocol when copying them into Build Output.
      remotePatterns: vercelRemotePatterns,
      // Serve AVIF when the browser supports it, falling back to WebP.
      formats: ['image/avif', 'image/webp'],
      // Remote blog art can change at the same URL. Keep its minimum to a day;
      // local /_astro sources retain their longer, immutable upstream lifetime.
      minimumCacheTTL: 60 * 60 * 24,
    },
    // Incremental Static Regeneration. The homepage is server-rendered and reads
    // the latest "ship" from Turso, but it isn't personalized — so let Vercel
    // serve a cached render from the edge and regenerate it at most once an hour.
    // The function then only runs on a cache miss instead of on every request.
    isr: {
      expiration: 60 * 60,
      // This fragment has its own one-minute CDN cache for fresh Discord posts.
      exclude: ['/api/community-feed'],
      // For on-demand revalidation (e.g. right after a new ship is posted), add a
      // `bypassToken` here and hit the route with a matching `x-prerender-revalidate`
      // header. Omitted for now, so regeneration is purely time-based.
    },
  }),
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
