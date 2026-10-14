import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CastingApplication } from '@/components/dienvienvn/casting-application';
import { SITE_URL } from '@/lib/dienvienvn/hosts';

export const metadata: Metadata = {
  title: 'Nộp hồ sơ casting — DienVienVN',
  description: 'Nộp hồ sơ diễn viên trong 7 bước để được giới thiệu tới các dự án đang casting.',
  alternates: { canonical: `${SITE_URL}/nop-ho-so` },
  openGraph: {
    title: 'Nộp hồ sơ casting — DienVienVN',
    description: 'Nộp hồ sơ diễn viên trong 7 bước để được giới thiệu tới các dự án đang casting.',
    url: `${SITE_URL}/nop-ho-so`
  }
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Nộp hồ sơ casting', item: `${SITE_URL}/nop-ho-so` }
  ]
};

export default function CastingApplicationPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Suspense>
        <CastingApplication />
      </Suspense>
    </>
  );
}
