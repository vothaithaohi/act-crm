'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ProducerView } from '@/lib/projects/producer';
import { ProducerApplicants } from './producer-board';
import { GlobalNav } from './site-chrome';

type LinkProject = ProducerView & { id: string; status: string };
type LinkData = { partner: { name: string }; projects: LinkProject[] };

/** Link riêng của NSX: các dự án của họ + diễn viên đã nộp, không cần đăng nhập. */
export function PartnerLinkBoard({ token }: { token: string }) {
  const [data, setData] = useState<LinkData | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [active, setActive] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/dienvienvn/partner-link/${encodeURIComponent(token)}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.mode !== 'live') {
        setError(body.error || (body.mode === 'demo' ? 'Chế độ demo chưa hỗ trợ link này.' : 'Không tải được dữ liệu.'));
        return setData(null);
      }
      setData(body as LinkData);
      setActive((body as LinkData).projects[0]?.id || '');
    })().catch(() => {
      setError('Mất kết nối mạng. Vui lòng tải lại trang.');
      setData(null);
    });
  }, [token]);

  if (data === undefined) {
    return (
      <>
        <GlobalNav />
        <main className="flex min-h-[60vh] items-center justify-center bg-[var(--dv-bg-alt)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--dv-text-secondary)]" />
        </main>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <GlobalNav />
        <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--dv-bg-alt)] px-4 text-center">
          <h1 className="dv-display dv-headline">Link không khả dụng.</h1>
          <p className="dv-subhead mt-3 text-[var(--dv-text-secondary)]">{error}</p>
        </main>
      </>
    );
  }

  const project = data.projects.find(p => p.id === active) || data.projects[0];

  return (
    <>
      <div className="print:hidden">
        <GlobalNav />
      </div>
      <main className="min-h-screen bg-[var(--dv-bg-alt)] pb-20 print:bg-white print:pb-0">
        <div className="mx-auto max-w-[1200px] px-4 pt-8 md:px-6 lg:pt-12">
          <p className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">Dự án của {data.partner.name}</p>
          {data.projects.length === 0 ? (
            <p className="mt-6 text-[17px] text-[var(--dv-text-secondary)]">Chưa có dự án nào. Vui lòng liên hệ DienVienVN.</p>
          ) : (
            <>
              {data.projects.length > 1 && (
                <div className="dv-scroll-x -mx-4 mt-3 mb-8 flex gap-2 overflow-x-auto px-4 print:hidden md:mx-0 md:flex-wrap md:px-0">
                  {data.projects.map(p => (
                    <button key={p.id} type="button" className="dv-chip shrink-0" aria-pressed={p.id === project.id} onClick={() => setActive(p.id)}>
                      {p.project.code} · {p.project.title} ({p.applicants.length})
                    </button>
                  ))}
                </div>
              )}
              <div className={data.projects.length > 1 ? '' : 'mt-3'}>
                <ProducerApplicants key={project.id} view={project} />
              </div>
            </>
          )}
          <p className="mt-10 text-center text-[12px] text-[var(--dv-text-tertiary)]">
            Tài liệu nội bộ do DienVienVN cung cấp cho nhà sản xuất. Vui lòng không chia sẻ công khai.
          </p>
        </div>
      </main>
    </>
  );
}
