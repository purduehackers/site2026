/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  safelist: ['font-inconsolata', 'font-silkscreen'],
  theme: {
    extend: {
      fontFamily: {
        whyte: [
          'var(--font-whyte)',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        inconsolata: ['var(--font-inconsolata)', 'monospace'],
        silkscreen: ['var(--font-silkscreen)', 'sans-serif'],
        polysans: ['var(--font-polysans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
