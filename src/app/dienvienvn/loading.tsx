import { Loader2 } from 'lucide-react';
import { GlobalNav } from '@/components/dienvienvn/site-chrome';

/** Hiện ngay khi bấm chuyển trang (trong lúc máy chủ chuẩn bị trang mới), để không có cảm giác bấm không ăn. */
export default function DienVienVNLoading() {
  return (
    <>
      <GlobalNav />
      <main className="flex min-h-[calc(100vh-44px)] items-center justify-center bg-[var(--dv-bg-alt)]" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" aria-label="Đang tải" />
      </main>
    </>
  );
}
