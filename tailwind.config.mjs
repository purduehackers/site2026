/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  safelist: ["font-inconsolata"],
  theme: {
    extend: {
      fontFamily: {
        whyte: ["whyte", "system-ui", "-apple-system", "sans-serif"],
        inconsolata: ['"Inconsolata"', "monospace"],
      },
    },
  },
  plugins: [],
};
