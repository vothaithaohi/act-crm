import type { Metadata } from 'next';
import { DienVienVNHome } from '@/components/dienvienvn/home-page';
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

export default function DienVienVNHomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DienVienVNHome />
    </>
  );
}
