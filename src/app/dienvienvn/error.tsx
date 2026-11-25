'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { isStaleBuildError, reloadOnce, reportClientError } from '@/components/dienvienvn/client-guard';

// Trang gặp lỗi: thay cho trang trắng "Application error". Trang cũ sau khi cập nhật web → tự tải lại.
export default function DienVienVNError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error);
    if (isStaleBuildError(error.message)) reloadOnce();
  }, [error]);
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center bg-[#f5f5f7] px-6 text-center">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">DienVienVN</p>
      <h1 className="mt-2 text-[28px] font-semibold leading-tight text-[#1d1d1f]">Trang chưa tải được.</h1>
      <p className="mt-3 max-w-[420px] text-[16px] leading-[1.5] text-[#6e6e73]">
        Có thể web vừa được cập nhật. Bấm tải lại để mở bản mới nhất. Nếu đang bật dịch trang tự động, hãy tắt dịch rồi thử lại. Bản nháp hồ sơ của bạn vẫn được lưu trên máy.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => window.location.reload()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1d1d1f] px-6 text-[15px] font-semibold text-white">
          <RotateCw className="h-4 w-4" /> Tải lại trang
        </button>
        <button type="button" onClick={reset} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d2d2d7] bg-white px-6 text-[15px] font-semibold text-[#1d1d1f]">
          Thử lại
        </button>
      </div>
    </main>
  );
}
