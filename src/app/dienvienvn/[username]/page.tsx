import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicTalentProfile } from '@/components/dienvienvn/public-talents';
import { getPublicTalent } from '@/lib/dienvienvn/public-talents';
import { SITE_URL } from '@/lib/dienvienvn/hosts';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const t = await getPublicTalent(username);
  if (!t) return { title: 'Không tìm thấy diễn viên — DienVienVN', robots: { index: false } };
  const url = `${SITE_URL}/${t.username}`;
  const description = `Hồ sơ diễn viên ${t.name} trên DienVienVN${t.trainings[0] ? ` · ${t.trainings[0]}` : ''}.`;
  return {
    title: `${t.name} — Diễn viên | DienVienVN`,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${t.name} — DienVienVN`, description, url, type: 'profile', images: t.photos[0] ? [{ url: t.photos[0].url }] : undefined },
    twitter: { card: 'summary_large_image', title: `${t.name} — DienVienVN`, description, images: t.photos[0] ? [t.photos[0].url] : undefined }
  };
}

export default async function PublicTalentPage({ params }: Props) {
  const { username } = await params;
  const t = await getPublicTalent(username);
  if (!t) notFound();
  const url = `${SITE_URL}/${t.username}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: t.name,
    url,
    image: t.photos.map(p => p.url),
    jobTitle: 'Diễn viên',
    affiliation: { '@type': 'Organization', name: 'DienVienVN', url: `${SITE_URL}/` }
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicTalentProfile talent={t} shareUrl={url} />
    </>
  );
}
