'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useDvvnHref } from './base-path';
import { LandingNav, NavAudience } from './landing-page';

/**
 * Menu trang chủ dùng cho các trang bên trong DienVienVN.
 * Cổng đối tác (đăng casting, tin tuyển ekip…) tô "Dành cho nhà sản xuất"; trang việc làm / tài khoản ekip tô "Dành cho ekip";
 * các trang khác tô "Dành cho diễn viên".
 * Bấm "Dành cho diễn viên / nhà sản xuất" thì về trang chủ đúng mục đó.
 */
export function SiteMenu() {
  const href = useDvvnHref();
  const router = useRouter();
  const path = usePathname() || '';
  const audience: NavAudience = /\/(ekip|tai-khoan\/ekip|tuyen-dung\/ung-tuyen)(\/|$)/.test(path)
    ? 'crew'
    : /\/(doi-tac|tuyen-dung)(\/|$)/.test(path)
    ? 'hiring'
    : 'talent';
  return <LandingNav compact audience={audience} onAudience={a => router.push(a === 'hiring' ? `${href('/')}#nha-san-xuat` : href('/'))} />;
}
