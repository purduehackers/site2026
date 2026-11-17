import type { APIRoute } from 'astro';
import { ROUTES, SITE_URL } from '../data/site';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ROUTES.map(
      (path) => `  <url><loc>${new URL(path, SITE_URL).href}</loc></url>`
    ).join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } }
  );
