import { Loader2 } from 'lucide-react';
import { GlobalNav } from '@/components/dienvienvn/site-chrome';
import { serverTr } from '@/lib/dienvienvn/i18n/server';

/** Hiện ngay khi bấm chuyển trang (trong lúc máy chủ chuẩn bị trang mới), để không có cảm giác bấm không ăn. */
export default async function DienVienVNLoading() {
  const tr = await serverTr();
  return (
    <>
      <GlobalNav />
      <main className="flex min-h-[calc(100vh-44px)] items-center justify-center bg-[var(--dv-bg-alt)]" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" aria-label={tr('Đang tải')} />
      </main>
    </>
  );
}
