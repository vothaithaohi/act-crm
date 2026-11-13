'use client';

import React from 'react';
import { CalendarDays, Clapperboard, Clock, Coins, MapPin, UsersRound } from 'lucide-react';
import type { PublicCrewJob } from '@/lib/dienvienvn/crew-jobs';
import { OTHER_ID, departmentOf, jobOptionText, roleLabel, splitIds } from '@/lib/dienvienvn/crew-taxonomy';
import { formatVnDate } from './projects-section';

// Hiển thị dùng chung cho tin tuyển ekip: tiêu đề tách phần trong ngoặc, các thông tin chính, JD tự định dạng.

type Field = Parameters<typeof jobOptionText>[0];
const opt = (job: PublicCrewJob, f: Field, id?: string | null) => jobOptionText(f, id, job.other_values, true);

/** Tiêu đề chính + dòng phụ: "CAMERA OPERATOR (KỸ THUẬT QUAY)" → "CAMERA OPERATOR" / "KỸ THUẬT QUAY". Giữ nguyên chữ hoa / thường người đăng nhập. */
export function jobTitle(job: PublicCrewJob): { main: string; sub: string } {
  const role = roleLabel(job.department, job.role_title, job.role_other);
  if (role && role.en) return { main: role.vi, sub: role.en };
  const text = (role?.vi || job.title || '').trim();
  const m = text.match(/^(.*?)\s*\((.+)\)\s*$/);
  return m && m[1].trim() ? { main: m[1].trim(), sub: m[2].trim() } : { main: text, sub: '' };
}

const fmtMoney = (n?: number | null) => (n ? n.toLocaleString('vi-VN') : '');

/** Thù lao theo Form A: "1.500.000 – 2.500.000 VND/ngày" hoặc "Thỏa thuận". */
export function salaryText(job: PublicCrewJob): string {
  if (!job.salary_type) return job.compensation || '';
  if (job.salary_type === 'negotiable') return 'Thỏa thuận theo năng lực';
  const other = job.salary_type === OTHER_ID ? jobOptionText('salary_type', OTHER_ID, job.other_values) : '';
  const unit = { per_day: 'VND/ngày', per_project: 'VND/dự án', per_month: 'VND/tháng' }[job.salary_type] || 'VND';
  const [lo, hi] = [fmtMoney(job.salary_min), fmtMoney(job.salary_max)];
  const range = lo && hi ? `${lo} – ${hi}` : lo ? `Từ ${lo}` : hi ? `Đến ${hi}` : '';
  if (other) return range ? `${range} VND · ${other}` : other;
  return range ? `${range} ${unit}` : jobOptionText('salary_type', job.salary_type, job.other_values);
}

export type JobFact = { key: string; icon: typeof MapPin; label: string; value: string };

/** Các thông tin chính của tin (chỉ những mục có dữ liệu). */
export function jobFacts(job: PublicCrewJob): JobFact[] {
  const formA = !!job.role_title;
  const dates = [job.start_date ? formatVnDate(job.start_date) : '', job.end_date ? formatVnDate(job.end_date) : ''].filter(Boolean).join(' → ');
  const project = [job.project_name || (job.project_type ? 'Dự án bảo mật' : ''), opt(job, 'project_type', job.project_type)].filter(Boolean).join(' · ');
  const list: (JobFact | null)[] = formA
    ? [
        project ? { key: 'project', icon: Clapperboard, label: 'Dự án', value: [project, opt(job, 'project_phase', job.project_phase)].filter(Boolean).join(' · ') } : null,
        dates || job.shooting_days
          ? { key: 'time', icon: CalendarDays, label: 'Thời gian', value: [dates, job.shooting_days ? `${job.shooting_days} ngày quay` : ''].filter(Boolean).join(' · ') }
          : null,
        job.city || job.location_detail
          ? { key: 'place', icon: MapPin, label: 'Địa điểm', value: [opt(job, 'city', job.city), job.location_detail].filter(Boolean).join(' · ') }
          : null,
        salaryText(job) ? { key: 'salary', icon: Coins, label: 'Thù lao', value: salaryText(job) } : null,
        job.quantity ? { key: 'quantity', icon: UsersRound, label: 'Số lượng', value: `Cần ${job.quantity} người` } : null,
        job.deadline ? { key: 'deadline', icon: Clock, label: 'Hạn nộp', value: formatVnDate(job.deadline) } : null
      ]
    : [
        job.location ? { key: 'place', icon: MapPin, label: 'Địa điểm', value: job.location } : null,
        job.work_time ? { key: 'time', icon: CalendarDays, label: 'Thời gian', value: job.work_time } : null,
        job.compensation ? { key: 'salary', icon: Coins, label: 'Thù lao', value: job.compensation } : null,
        job.deadline ? { key: 'deadline', icon: Clock, label: 'Hạn nộp', value: formatVnDate(job.deadline) } : null
      ];
  return list.filter(Boolean) as JobFact[];
}

/** Nhãn ngắn: bộ phận, cấp độ, hình thức, chế độ làm việc. */
export function jobTags(job: PublicCrewJob): string[] {
  if (!job.role_title) return job.positions || [];
  // Mỗi lựa chọn một nhãn riêng (ô chọn nhiều: "Junior", "Mid-Level"…)
  const each = (f: Field, v?: string | null) => splitIds(v).map(id => opt(job, f, id));
  return Array.from(
    new Set([
      job.department === OTHER_ID ? '' : departmentOf(job.department)?.label || '',
      ...each('seniority_level', job.seniority_level),
      ...each('employment_type', job.employment_type),
      ...each('work_mode', job.work_mode)
    ].filter(Boolean))
  );
}

export const companyLine = (job: PublicCrewJob) => [job.company, job.company_type ? opt(job, 'company_type', job.company_type) : ''].filter(Boolean).join(' · ');

/* ---------------- JD tự định dạng ---------------- */

type Block =
  | { t: 'h'; text: string }
  | { t: 'sh'; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul'; items: { text: string; depth: number }[] };

const BULLET = /^(\s*)(?:[-•*·–]|Bullet)\s+(.*)$/;

/** Dòng chữ JD người đăng dán vào → khối: tiêu đề mục ("1. MỤC TIÊU"), tiêu đề phụ ("2.1. …"), gạch đầu dòng, đoạn văn. */
export function parseJd(text: string): Block[] {
  const blocks: Block[] = [];
  let list: { text: string; depth: number }[] | null = null;
  const flush = () => {
    if (list?.length) blocks.push({ t: 'ul', items: list });
    list = null;
  };
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const md = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (md) {
      flush();
      const body = md[1].replace(/\*\*/g, '');
      blocks.push(/^\d+\.\d+/.test(body) ? { t: 'sh', text: body } : { t: 'h', text: body });
      continue;
    }
    if (/^\d+\.\d+\.?\s+\S/.test(trimmed)) {
      flush();
      blocks.push({ t: 'sh', text: trimmed });
      continue;
    }
    if (/^\d+\.\s+\S/.test(trimmed) && trimmed.length <= 80) {
      flush();
      blocks.push({ t: 'h', text: trimmed });
      continue;
    }
    const b = line.match(BULLET);
    if (b) {
      if (!list) list = [];
      list.push({ text: b[2], depth: b[1].length >= 2 ? 1 : 0 });
      continue;
    }
    flush();
    blocks.push({ t: 'p', text: trimmed });
  }
  flush();
  return blocks;
}

/** "**đậm**" trong JD → chữ đậm. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (/^\*\*[^*]+\*\*$/.test(p) ? <strong key={i} className="font-semibold text-[var(--dv-text)]">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </>
  );
}

export function JdText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = parseJd(text);
  return (
    <div className={`max-w-[70ch] space-y-3 text-[15px] leading-[1.65] text-[var(--dv-text-secondary)] ${className}`}>
      {blocks.map((b, i) =>
        b.t === 'h' ? (
          <h3 key={i} className={`text-[16px] font-semibold uppercase tracking-[0.02em] text-[var(--dv-text)] ${i ? 'pt-4' : ''}`}>
            <Inline text={b.text} />
          </h3>
        ) : b.t === 'sh' ? (
          <h4 key={i} className="pt-1 text-[15px] font-semibold text-[var(--dv-text)]">
            <Inline text={b.text} />
          </h4>
        ) : b.t === 'ul' ? (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className={`relative pl-5 ${it.depth ? 'ml-5' : ''}`}>
                <span className={`absolute left-1 top-[0.62em] h-[6px] w-[6px] rounded-full ${it.depth ? 'border border-[var(--dv-text-tertiary)]' : 'bg-[var(--dv-text)]'}`} aria-hidden="true" />
                <Inline text={it.text} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Inline text={b.text} />
          </p>
        )
      )}
    </div>
  );
}

/** Một câu tóm tắt cho thẻ tin: đoạn đầu dưới mục "Mục tiêu công việc", không thì đoạn văn đầu tiên. */
export function jdSummary(text?: string | null, max = 170): string {
  if (!text) return '';
  const blocks = parseJd(text);
  const goal = blocks.findIndex(b => b.t === 'h' && /mục tiêu|mo ta|mô tả|giới thiệu/i.test(b.text));
  const pick = (from: number) => blocks.slice(from).find(b => b.t === 'p') as { text: string } | undefined;
  const found = (goal >= 0 ? pick(goal + 1) : undefined) || pick(0);
  const s = (found?.text || '').replace(/\*\*/g, '');
  return s.length > max ? `${s.slice(0, max).replace(/\s+\S*$/, '')}…` : s;
}
