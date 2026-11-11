import type { Metadata } from 'next';
import { DienVienVNLandingV2 } from '@/components/dienvienvn/landing-v2';
import { getHomeStats } from '@/lib/dienvienvn/home-stats';
import { SITE_URL } from '@/lib/dienvienvn/hosts';

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/` }
};

// Dữ liệu cấu trúc cho Google: tổ chức + website
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'DienVienVN',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/dienvienvn/apple-icon.png`,
      slogan: 'Đúng người. Đúng vai.',
      description: 'Nền tảng hồ sơ diễn viên kết nối diễn viên Việt Nam với đạo diễn và nhà sản xuất.'
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'DienVienVN',
      url: `${SITE_URL}/`,
      inLanguage: 'vi-VN',
      publisher: { '@id': `${SITE_URL}/#organization` }
    }
  ]
};

// Trang chủ chính = trang chủ mới 02 (ra mắt 11/11/2026). Bản cũ vẫn ở components/dienvienvn/home-page.tsx.
export const revalidate = 300;

export default async function DienVienVNHomePage() {
  const stats = await getHomeStats();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DienVienVNLandingV2 stats={stats} />
    </>
  );
}
