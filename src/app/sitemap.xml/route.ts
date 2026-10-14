import { NextRequest } from 'next/server';
import { INDEXABLE_PATHS, SITE_URL, isPublicHost } from '@/lib/dienvienvn/hosts';

export function GET(req: NextRequest) {
  if (!isPublicHost(req.headers)) return new Response('Not found', { status: 404 });
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = INDEXABLE_PATHS.map(
    p => `  <url><loc>${SITE_URL}${p === '/' ? '/' : p}</loc><lastmod>${lastmod}</lastmod><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`
  ).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
