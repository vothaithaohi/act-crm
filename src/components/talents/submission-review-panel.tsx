'use client';

import React, { useEffect, useState } from 'react';
import { Check, Globe, RotateCcw, X } from 'lucide-react';
import { useCRM } from '@/lib/store/crm-context';
import { REVIEW_STATUS_DETAILS, TalentProfile, getReviewStatus } from '@/lib/types/crm';

/** Khối duyệt hồ sơ tự nộp từ dienvienvn.com, hiển thị trên trang chi tiết diễn viên. */
export function SubmissionReviewPanel({ talent }: { talent: TalentProfile }) {
  const { reviewTalent, can } = useCRM();
  const status = getReviewStatus(talent);
  const [notes, setNotes] = useState(talent.review_notes || '');
  const canReview = can('talents:write');

  useEffect(() => {
    setNotes(talent.review_notes || '');
  }, [talent.id, talent.review_notes]);

  const submittedAt = talent.submitted_at || talent.created_at;
  const submittedLabel = submittedAt
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(submittedAt))
    : '—';

  const notesChanged = (talent.review_notes || '') !== notes;

  return (
    <div className="bg-card rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="flex items-start gap-3 lg:w-80 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-sm text-foreground">Hồ sơ tự nộp từ DienVienVN</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${REVIEW_STATUS_DETAILS[status].badgeClass}`}>
              {REVIEW_STATUS_DETAILS[status].label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">Nộp lúc {submittedLabel} (giờ VN)</p>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={!canReview}
          rows={2}
          placeholder="Ghi chú nội bộ khi duyệt (VD: đã gọi xác nhận, phù hợp vai nữ 20–25 tuổi…)"
          className="w-full px-3 py-2 rounded-lg border bg-background text-xs outline-none focus:border-brand-500 resize-none disabled:opacity-60"
        />
      </div>

      {canReview && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {notesChanged && (
            <button
              onClick={() => reviewTalent(talent.id, status, notes)}
              className="px-3 py-2 rounded-lg border hover:bg-muted text-xs font-semibold"
            >
              Lưu ghi chú
            </button>
          )}
          {status !== 'approved' && (
            <button
              onClick={() => reviewTalent(talent.id, 'approved', notes)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Check className="w-3.5 h-3.5" /> Duyệt hồ sơ
            </button>
          )}
          {status !== 'rejected' && (
            <button
              onClick={() => reviewTalent(talent.id, 'rejected', notes)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border hover:bg-muted text-xs font-semibold text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" /> Từ chối
            </button>
          )}
          {status !== 'pending' && (
            <button
              onClick={() => reviewTalent(talent.id, 'pending', notes)}
              className="p-2 rounded-lg border hover:bg-muted text-muted-foreground"
              title="Chuyển về Chờ duyệt"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
