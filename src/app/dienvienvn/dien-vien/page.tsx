import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { TalentDirectory } from '@/components/dienvienvn/public-talents';
import { listPublicTalents } from '@/lib/dienvienvn/public-talents';
import { SITE_URL } from '@/lib/dienvienvn/hosts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Diễn viên — DienVienVN',
  description: 'Danh sách hồ sơ diễn viên đã được duyệt trên DienVienVN: ảnh, kinh nghiệm, kỹ năng và đào tạo diễn xuất.',
  alternates: { canonical: `${SITE_URL}/dien-vien` },
  openGraph: { title: 'Diễn viên — DienVienVN', url: `${SITE_URL}/dien-vien` }
};

// Danh sách diễn viên lưu tạm 60 giây: mở trang nhanh, hồ sơ mới duyệt hiện sau tối đa 1 phút
const cachedTalents = unstable_cache(listPublicTalents, ['dvvn-public-talents'], { revalidate: 60 });

export default async function TalentDirectoryPage() {
  const talents = await cachedTalents();
  return <TalentDirectory talents={talents} />;
}
