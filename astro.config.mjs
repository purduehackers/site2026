// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), react()],
  experimental: {
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
    ],
  },
});
