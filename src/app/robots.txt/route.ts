import { NextRequest } from 'next/server';
import { SITE_URL, isPublicHost } from '@/lib/dienvienvn/hosts';

// robots.txt theo tên miền: dienvienvn.com cho index trang công khai (kể cả bot AI);
// tên miền Vercel / CRM chặn toàn bộ để không trùng nội dung và không lộ CRM.
export function GET(req: NextRequest) {
  const body = isPublicHost(req.headers)
    ? [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        'Disallow: /dang-nhap',
        'Disallow: /tao-mat-khau',
        'Disallow: /tai-khoan',
        'Disallow: /du-an/',
        'Disallow: /nsx/',
        '',
        '# Bot AI được phép đọc nội dung công khai',
        ...['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'].flatMap(
          bot => [`User-agent: ${bot}`, 'Allow: /', 'Disallow: /api/', 'Disallow: /tai-khoan', 'Disallow: /nsx/', '']
        ),
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        ''
      ].join('\n')
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
