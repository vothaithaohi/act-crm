'use client';

import React from 'react';
import type { CrewJob } from '@/lib/dienvienvn/crew-jobs';
import {
  COMPANY_TYPES,
  CREW_PROJECT_TYPES,
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  Option,
  PROJECT_PHASES,
  SALARY_TYPES,
  SENIORITY_LEVELS,
  WORK_CITIES,
  WORK_MODES,
  departmentOf
} from '@/lib/dienvienvn/crew-taxonomy';

/** Dữ liệu Form A khi đang nhập (giá trị gửi lên API /crew-jobs). */
export interface CrewFormA {
  company_name: string;
  company_type: string;
  contact_email: string;
  contact_phone: string;
  project_name: string;
  project_hidden: boolean;
  project_type: string;
  project_phase: string;
  department: string;
  role_title: string;
  seniority_level: string;
  employment_type: string;
  start_date: string;
  end_date: string;
  shooting_days: string;
  city: string;
  location_detail: string;
  work_mode: string;
  salary_type: string;
  salary_min: string;
  salary_max: string;
}

export function crewFormFrom(j?: Partial<CrewJob> | null, fallbackCompany = ''): CrewFormA {
  const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  return {
    company_name: s(j?.company) || fallbackCompany,
    company_type: s(j?.company_type),
    contact_email: s(j?.contact_email),
    contact_phone: s(j?.contact_phone),
    project_name: s(j?.project_name),
    project_hidden: !!j?.project_hidden,
    project_type: s(j?.project_type),
    project_phase: s(j?.project_phase),
    department: s(j?.department),
    role_title: s(j?.role_title),
    seniority_level: s(j?.seniority_level),
    employment_type: s(j?.employment_type),
    start_date: s(j?.start_date),
    end_date: s(j?.end_date),
    shooting_days: s(j?.shooting_days),
    city: s(j?.city),
    location_detail: s(j?.location_detail),
    work_mode: s(j?.work_mode),
    salary_type: s(j?.salary_type),
    salary_min: s(j?.salary_min),
    salary_max: s(j?.salary_max)
  };
}

/** Kiểu giao diện: 'dv' (dienvienvn.com) hoặc 'crm' (admin). */
type Variant = 'dv' | 'crm';

const UI: Record<Variant, { input: string; label: string; section: string; title: string; hint: string; check: string }> = {
  dv: {
    input: 'dv-input',
    label: 'dv-field-label',
    section: 'dv-card space-y-5 p-6 md:p-8',
    title: 'text-[19px] font-semibold',
    hint: 'mt-1 text-[13px] text-[var(--dv-text-secondary)]',
    check: 'h-[18px] w-[18px] accent-[#1d1d1f]'
  },
  crm: {
    input: 'w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:border-brand-500',
    label: 'block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1',
    section: 'rounded-xl border p-4 space-y-4',
    title: 'text-sm font-bold',
    hint: 'mt-1 text-[11px] text-muted-foreground',
    check: 'h-4 w-4'
  }
};

function FieldLabel({ children, required, htmlFor, cls }: { children: React.ReactNode; required?: boolean; htmlFor?: string; cls: string }) {
  return (
    <label htmlFor={htmlFor} className={cls}>
      {children}
      {required && <span className="text-[#b00020]"> *</span>}
    </label>
  );
}

function SelectBox({ id, list, v, onPick, placeholder, cls }: { id: string; list: Option[]; v: string; onPick: (x: string) => void; placeholder: string; cls: string }) {
  return (
    <select id={id} className={cls} value={v} onChange={e => onPick(e.target.value)}>
      <option value="">{placeholder}</option>
      {list.map(o => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function CrewJobFields({ value, onChange, variant = 'dv' }: { value: CrewFormA; onChange: (v: CrewFormA) => void; variant?: Variant }) {
  const ui = UI[variant];
  const set = (patch: Partial<CrewFormA>) => onChange({ ...value, ...patch });
  const dept = departmentOf(value.department);
  const negotiable = value.salary_type === 'negotiable';

  const field = 'space-y-1.5';
  const grid = 'grid grid-cols-1 gap-4 sm:grid-cols-2';

  return (
    <div className="space-y-4">
      {/* 1. Thông tin đơn vị tuyển dụng */}
      <section className={ui.section}>
        <p className={ui.title}>1. Thông tin đơn vị tuyển dụng</p>
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor="cj-company">Tên đơn vị tuyển dụng</FieldLabel>
          <input id="cj-company" className={ui.input} value={value.company_name} onChange={e => set({ company_name: e.target.value })} placeholder="Production House, Agency hoặc tên NSX / Đạo diễn độc lập" />
        </div>
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor="cj-ctype">Loại hình đơn vị</FieldLabel>
          <SelectBox cls={ui.input} id="cj-ctype" list={COMPANY_TYPES} v={value.company_type} onPick={x => set({ company_type: x })} placeholder="Chọn loại hình đơn vị" />
        </div>
        <div>
          <p className={ui.label}>
            Thông tin liên hệ nhận hồ sơ<span className="text-[#b00020]"> *</span>
          </p>
          <div className={`${grid} mt-1.5`}>
            <div className={field}>
              <FieldLabel cls={ui.label} required htmlFor="cj-email">Email nhận CV/Showreel</FieldLabel>
              <input id="cj-email" type="email" inputMode="email" className={ui.input} value={value.contact_email} onChange={e => set({ contact_email: e.target.value })} placeholder="tuyendung@congty.vn" />
            </div>
            <div className={field}>
              <FieldLabel cls={ui.label} required htmlFor="cj-phone">Số điện thoại / Zalo</FieldLabel>
              <input id="cj-phone" type="tel" inputMode="tel" className={ui.input} value={value.contact_phone} onChange={e => set({ contact_phone: e.target.value })} placeholder="0901 234 567" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Thông tin dự án */}
      <section className={ui.section}>
        <p className={ui.title}>2. Thông tin dự án</p>
        <div className={field}>
          <FieldLabel cls={ui.label} htmlFor="cj-project">Tên dự án</FieldLabel>
          <input id="cj-project" className={ui.input} value={value.project_name} onChange={e => set({ project_name: e.target.value })} />
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[14px]">
            <input type="checkbox" className={ui.check} checked={value.project_hidden} onChange={e => set({ project_hidden: e.target.checked })} />
            Dự án bảo mật / Giữ kín tên
          </label>
        </div>
        <div className={grid}>
          <div className={field}>
            <FieldLabel cls={ui.label} required htmlFor="cj-ptype">Loại hình dự án</FieldLabel>
            <SelectBox cls={ui.input} id="cj-ptype" list={CREW_PROJECT_TYPES} v={value.project_type} onPick={x => set({ project_type: x })} placeholder="Chọn loại hình dự án" />
          </div>
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor="cj-phase">Giai đoạn dự án đang tuyển</FieldLabel>
            <SelectBox cls={ui.input} id="cj-phase" list={PROJECT_PHASES} v={value.project_phase} onPick={x => set({ project_phase: x })} placeholder="Chọn giai đoạn" />
          </div>
        </div>
      </section>

      {/* 3. Vị trí & yêu cầu chuyên môn */}
      <section className={ui.section}>
        <p className={ui.title}>3. Vị trí &amp; yêu cầu chuyên môn</p>
        <div className={grid}>
          <div className={field}>
            <FieldLabel cls={ui.label} required htmlFor="cj-dept">Phân nhóm chuyên môn</FieldLabel>
            <SelectBox cls={ui.input} id="cj-dept" list={DEPARTMENTS} v={value.department} onPick={x => set({ department: x, role_title: '' })} placeholder="Chọn phân nhóm" />
          </div>
          <div className={field}>
            <FieldLabel cls={ui.label} required htmlFor="cj-role">Vị trí cụ thể</FieldLabel>
            <select id="cj-role" className={ui.input} value={value.role_title} disabled={!dept} onChange={e => set({ role_title: e.target.value })}>
              <option value="">{dept ? 'Chọn vị trí' : 'Chọn phân nhóm trước'}</option>
              {dept?.roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.vi} ({r.en})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor="cj-senior">Cấp độ kinh nghiệm kỳ vọng</FieldLabel>
          <SelectBox cls={ui.input} id="cj-senior" list={SENIORITY_LEVELS} v={value.seniority_level} onPick={x => set({ seniority_level: x })} placeholder="Chọn cấp độ" />
        </div>
      </section>

      {/* 4. Thời gian & hình thức làm việc */}
      <section className={ui.section}>
        <p className={ui.title}>4. Thời gian &amp; hình thức làm việc</p>
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor="cj-emp">Hình thức hợp đồng</FieldLabel>
          <SelectBox cls={ui.input} id="cj-emp" list={EMPLOYMENT_TYPES} v={value.employment_type} onPick={x => set({ employment_type: x })} placeholder="Chọn hình thức" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor="cj-start">Ngày bắt đầu làm việc</FieldLabel>
            <input id="cj-start" type="date" className={ui.input} value={value.start_date} onChange={e => set({ start_date: e.target.value })} />
          </div>
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor="cj-end">Ngày kết thúc dự kiến</FieldLabel>
            <input id="cj-end" type="date" className={ui.input} value={value.end_date} onChange={e => set({ end_date: e.target.value })} />
          </div>
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor="cj-days">Số ngày quay dự kiến</FieldLabel>
            <input id="cj-days" inputMode="numeric" className={ui.input} value={value.shooting_days} onChange={e => set({ shooting_days: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="Nếu là On-set" />
          </div>
        </div>
        <div className={grid}>
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor="cj-city">Thành phố chính</FieldLabel>
            <SelectBox cls={ui.input} id="cj-city" list={WORK_CITIES} v={value.city} onPick={x => set({ city: x })} placeholder="Chọn thành phố" />
          </div>
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor="cj-mode">Chế độ làm việc</FieldLabel>
            <SelectBox cls={ui.input} id="cj-mode" list={WORK_MODES} v={value.work_mode} onPick={x => set({ work_mode: x })} placeholder="Chọn chế độ" />
          </div>
        </div>
        <div className={field}>
          <FieldLabel cls={ui.label} htmlFor="cj-locd">Địa điểm cụ thể / Đi quay xa</FieldLabel>
          <input id="cj-locd" className={ui.input} value={value.location_detail} onChange={e => set({ location_detail: e.target.value })} placeholder="VD: Quay tại Đà Lạt 5 ngày" />
        </div>
      </section>

      {/* 5. Ngân sách & thù lao */}
      <section className={ui.section}>
        <p className={ui.title}>5. Ngân sách &amp; thù lao</p>
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor="cj-stype">Cách tính thù lao</FieldLabel>
          <SelectBox cls={ui.input} id="cj-stype" list={SALARY_TYPES} v={value.salary_type} onPick={x => set({ salary_type: x })} placeholder="Chọn cách tính" />
        </div>
        {!negotiable && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={field}>
              <FieldLabel cls={ui.label} htmlFor="cj-smin">Mức tối thiểu</FieldLabel>
              <input id="cj-smin" inputMode="numeric" className={ui.input} value={value.salary_min} onChange={e => set({ salary_min: e.target.value.replace(/\D/g, '').slice(0, 12) })} placeholder="VD: 1500000" />
            </div>
            <div className={field}>
              <FieldLabel cls={ui.label} htmlFor="cj-smax">Mức tối đa</FieldLabel>
              <input id="cj-smax" inputMode="numeric" className={ui.input} value={value.salary_max} onChange={e => set({ salary_max: e.target.value.replace(/\D/g, '').slice(0, 12) })} placeholder="VD: 2500000" />
            </div>
            <div className={field}>
              <FieldLabel cls={ui.label} htmlFor="cj-cur">Đơn vị tiền tệ</FieldLabel>
              <input id="cj-cur" className={ui.input} value="VND" readOnly />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
