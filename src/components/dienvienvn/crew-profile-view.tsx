'use client';

import { useState } from 'react';
import { ExternalLink, FileText, Mail, Phone } from 'lucide-react';
import {
  AVAILABILITY_STATUSES,
  BASE_CITIES,
  CREDIT_TYPES,
  CrewAttachments,
  CrewProfile,
  crewPrimaryRoleText,
  crewRoleText
} from '@/lib/dienvienvn/crew-profiles';
import { SENIORITY_LEVELS, labelOf } from '@/lib/dienvienvn/crew-taxonomy';

type Viewable = Omit<CrewProfile, 'auth_user_id' | 'review_status' | 'reviewed_at' | 'updated_at'> & { applied_at?: string };

const money = (n?: number | null) => (n ? `${n.toLocaleString('vi-VN')} VND` : '');
/** Ngày theo giờ Việt Nam: "2026-11-10" → "10/11/2026"; mốc thời gian đổi về múi giờ Việt Nam. */
const vnDate = (s?: string | null) => {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().map(Number).join('/');
  return new Date(s).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

/** Hồ sơ ekip (Form B) dạng đọc: cho NSX trong cổng đối tác và cho ACT trong CRM. */
export function CrewProfileDetails({ p, compact = false }: { p: Viewable; compact?: boolean }) {
  const secondary = (p.secondary_roles || []).map(crewRoleText).filter(Boolean);
  const availability =
    p.availability_status === 'busy_until' && p.busy_until
      ? `Bận đến ngày ${vnDate(p.busy_until)}`
      : labelOf(AVAILABILITY_STATUSES, p.availability_status).split(' (')[0];
  const rates = [p.day_rate ? `${money(p.day_rate)}/ngày quay` : '', p.project_rate ? `${money(p.project_rate)}/dự án` : '', p.rate_negotiable ? 'Thương lượng theo quy mô dự án' : '']
    .filter(Boolean)
    .join(' · ');
  const phone = (p.public_phone || '').replace(/[^\d+]/g, '');
  const links = [
    p.primary_showreel_url ? { label: 'Showreel', url: p.primary_showreel_url } : null,
    p.portfolio_url ? { label: 'Portfolio', url: p.portfolio_url } : null,
    p.social_link ? { label: 'Mạng xã hội', url: p.social_link } : null
  ].filter(Boolean) as { label: string; url: string }[];
  const row = 'text-[14px] leading-[1.5]';
  const muted = 'opacity-70';

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[18px] font-semibold leading-[1.3]">
          {p.full_name}
          {p.display_name ? <span className="font-normal"> · {p.display_name}</span> : null}
        </p>
        <p className={row}>
          {crewPrimaryRoleText(p)}
          {secondary.length ? <span className={muted}> · Vai trò phụ: {secondary.join(', ')}</span> : null}
        </p>
        <p className={`${row} ${muted}`}>
          {[
            labelOf(SENIORITY_LEVELS, p.years_of_experience).split(' (')[0],
            labelOf(BASE_CITIES, p.base_city),
            p.willing_to_travel ? 'Đi quay xa được' : '',
            p.applied_at ? `Ứng tuyển ${vnDate(p.applied_at)}` : ''
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <p className={row}>
        <span className="font-semibold">Nhận việc: </span>
        {availability}
        {rates ? <span className={muted}> · {rates}</span> : null}
      </p>

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[13px] font-medium hover:bg-black/5">
              {l.label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      )}

      {!compact && (p.filmography_credits || []).length > 0 && (
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider opacity-60">Dự án tiêu biểu</p>
          <ul className="mt-1 space-y-1">
            {p.filmography_credits.map((c, i) => (
              <li key={i} className={row}>
                <span className="font-medium">{c.project_name}</span>
                <span className={muted}>
                  {[c.year ? String(c.year) : '', labelOf(CREDIT_TYPES, c.type), c.role_in_project].filter(Boolean).map(x => ` · ${x}`)}
                </span>
                {c.project_link && (
                  <a href={c.project_link} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex items-center underline underline-offset-2">
                    Xem <ExternalLink className="ml-0.5 h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (p.software_skills || []).length > 0 && (
        <p className={row}>
          <span className="font-semibold">Phần mềm: </span>
          {p.software_skills.join(', ')}
        </p>
      )}
      {!compact && p.owned_gear && (
        <p className={`${row} whitespace-pre-line`}>
          <span className="font-semibold">Thiết bị sở hữu: </span>
          {p.owned_gear}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <a href={`mailto:${p.public_email}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#1d1d1f] px-3.5 py-1.5 text-[13px] font-semibold text-white">
          <Mail className="h-4 w-4" /> {p.public_email}
        </a>
        {phone && (
          <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold">
            <Phone className="h-4 w-4" /> {p.public_phone}
          </a>
        )}
      </div>
    </div>
  );
}

/** CV + cover letter gửi kèm 1 lượt ứng tuyển (link file PDF là link xem tạm có hạn: tải lại trang để lấy link mới). */
export function CrewAttachmentsBlock({ a }: { a: CrewAttachments | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!a || (!a.cv && !a.cover_letter && !a.cover_letter_url)) {
    return <p className="text-[13px] opacity-70">Không gửi kèm CV / cover letter.</p>;
  }
  const btn = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium hover:bg-black/5';
  const long = (a.cover_letter || '').length > 220;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {a.cv && (
          <a href={a.cv.url} target="_blank" rel="noopener noreferrer" className={`${btn} border-[#1d1d1f] bg-[#1d1d1f] text-white hover:bg-black`}>
            <FileText className="h-3.5 w-3.5" /> CV: {a.cv.title}
          </a>
        )}
        {a.cover_letter_url && (
          <a href={a.cover_letter_url} target="_blank" rel="noopener noreferrer" className={btn}>
            <FileText className="h-3.5 w-3.5" /> Cover letter (PDF)
          </a>
        )}
      </div>
      {a.cover_letter && (
        <div className="rounded-[12px] bg-black/[0.03] p-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider opacity-70">Cover letter</p>
          <p className={`mt-1 whitespace-pre-line text-[14px] leading-[1.5] ${long && !open ? 'line-clamp-4' : ''}`}>{a.cover_letter}</p>
          {long && (
            <button type="button" onClick={() => setOpen(v => !v)} className="mt-1 text-[13px] font-semibold underline underline-offset-2">
              {open ? 'Thu gọn' : 'Xem đầy đủ'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
