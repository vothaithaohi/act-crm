import { NextRequest } from 'next/server';
import { INDEXABLE_PATHS, SITE_URL, isPublicHost } from '@/lib/dienvienvn/hosts';
import { listPublicTalents } from '@/lib/dienvienvn/public-talents';
import { listPublishedPosts } from '@/lib/dienvienvn/academy-server';

export async function GET(req: NextRequest) {
  if (!isPublicHost(req.headers)) return new Response('Not found', { status: 404 });
  const lastmod = new Date().toISOString().slice(0, 10);
  const [talents, posts] = await Promise.all([listPublicTalents(), listPublishedPosts(1000)]);
  const paths = [...INDEXABLE_PATHS, ...posts.map(p => `/academy/${p.slug}`), ...talents.map(t => `/${t.username}`)];
  // Mỗi trang có 2 bản: tiếng Việt (gốc) và tiếng Anh (/en), khai báo hreflang cho nhau
  const urls = paths
    .flatMap(p => {
      const vi = `${SITE_URL}${p === '/' ? '/' : p}`;
      const en = `${SITE_URL}/en${p === '/' ? '' : p}`;
      const alt = `<xhtml:link rel="alternate" hreflang="vi" href="${vi}"/><xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="x-default" href="${vi}"/>`;
      const pr = p === '/' ? '1.0' : INDEXABLE_PATHS.includes(p) ? '0.8' : '0.6';
      return [vi, en].map(loc => `  <url><loc>${loc}</loc>${alt}<lastmod>${lastmod}</lastmod><priority>${pr}</priority></url>`);
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
