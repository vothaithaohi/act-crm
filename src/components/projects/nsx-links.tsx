'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { authedFetch } from '@/lib/supabase/authed-fetch';
import { publicSiteBase } from '@/lib/projects/use-projects';
import type { PartnerAccount } from '@/lib/dienvienvn/partners';

export const partnerLinkUrl = (token: string) => `${publicSiteBase()}/doi-tac/link/${token}`;

/** Link gửi NSX (gộp link shortlist + link đối tác): mỗi NSX 1 link riêng, không cần đăng nhập, không hết hạn. */
export function NsxLinks({ projectId, ownerId, isNew }: { projectId: string; ownerId: string | null; isNew: boolean }) {
  const [partners, setPartners] = useState<PartnerAccount[] | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await authedFetch('/api/admin/partners', { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (body.mode === 'demo') return setProblem('Chế độ demo chưa hỗ trợ link NSX.');
      if (!res.ok) return setProblem(body.error || 'Không tải được danh sách đối tác.');
      setPartners(((body.partners || []) as PartnerAccount[]).filter(x => (x.project_ids || []).includes(projectId) || x.id === ownerId));
    })().catch(() => setProblem('Mất kết nối mạng. Vui lòng tải lại trang.'));
  }, [projectId, ownerId, isNew]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã sao chép link NSX');
    } catch {
      toast.info(text);
    }
  };

  return (
    <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">Link gửi NSX</span>
        <span className="text-[10px] text-muted-foreground">Không cần đăng nhập · không hết hạn</span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Mỗi NSX có 1 link riêng: thấy các dự án của họ và diễn viên đã nộp (trừ &ldquo;Loại&rdquo;, hồ sơ đã duyệt) theo cấp NSX (tên, tuổi, số đo, SĐT,
        email). Link ngừng khi khoá tài khoản đối tác.
      </p>
      {isNew ? (
        <p className="text-[11px] text-muted-foreground">Lưu dự án rồi gắn NSX ở mục Tài khoản đối tác.</p>
      ) : problem ? (
        <p className="text-[11px] text-destructive">{problem}</p>
      ) : !partners ? (
        <p className="text-[11px] text-muted-foreground">Đang tải…</p>
      ) : (
        <>
          {partners.length === 0 && <p className="text-[11px] text-amber-700">Dự án chưa gắn NSX nào.</p>}
          {partners.map(x => {
            const url = x.link_token ? partnerLinkUrl(x.link_token) : '';
            return (
              <div key={x.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-semibold sm:w-44 truncate" title={x.email}>
                  {x.company || x.full_name}
                  {x.status !== 'active' && <span className="ml-1 text-[10px] text-destructive">(đã khoá / chờ duyệt)</span>}
                </span>
                {url ? (
                  <>
                    <input readOnly value={url} className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-[11px] outline-none" onFocus={e => e.target.select()} />
                    <button type="button" onClick={() => copy(url)} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold">
                      <Copy className="w-3.5 h-3.5" /> Sao chép
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-destructive">Hãy chạy migration 20261111_partner_link.sql trong Supabase.</span>
                )}
              </div>
            );
          })}
          <Link href="/admin/partners" className="inline-flex px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted">
            Gắn / tạo NSX
          </Link>
        </>
      )}
    </div>
  );
}
