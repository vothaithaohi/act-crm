import Link from 'next/link';
import { GlobalNav } from '@/components/dienvienvn/site-chrome';

// Trang 404 của DienVienVN. Không nói hồ sơ có tồn tại hay không (bảo vệ diễn viên chưa công khai).
export default function DienVienVNNotFound() {
  return (
    <>
      <GlobalNav />
      <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--dv-bg-alt)] px-4 text-center">
        <p className="text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--dv-text-tertiary)]">404</p>
        <h1 className="dv-display dv-headline mt-2">Không tìm thấy trang.</h1>
        <p className="dv-subhead mx-auto mt-3 max-w-[560px] text-[var(--dv-text-secondary)]">
          Đường dẫn chưa đúng, hoặc hồ sơ diễn viên này chưa được công khai.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="dv-btn dv-btn-primary">
            Về trang chủ
          </Link>
          <Link href="/dien-vien" className="dv-btn dv-btn-secondary">
            Xem diễn viên đã công khai
          </Link>
        </div>
      </main>
    </>
  );
}
