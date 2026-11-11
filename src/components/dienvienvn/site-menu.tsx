'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useDvvnHref } from './base-path';
import { Audience, LandingNav } from './landing-page';

/**
 * Menu trang chủ dùng cho các trang bên trong DienVienVN.
 * Cổng đối tác (đăng casting, tin tuyển ekip…) tô "Dành cho nhà sản xuất"; các trang khác tô "Dành cho diễn viên".
 * Bấm "Dành cho diễn viên / nhà sản xuất" thì về trang chủ đúng mục đó.
 */
export function SiteMenu() {
  const href = useDvvnHref();
  const router = useRouter();
  const path = usePathname() || '';
  const audience: Audience = /\/doi-tac(\/|$)/.test(path) ? 'hiring' : 'talent';
  return <LandingNav compact audience={audience} onAudience={a => router.push(a === 'hiring' ? `${href('/')}#nha-san-xuat` : href('/'))} />;
}
