import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${new URL('/', site).href}</loc></url>
</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
