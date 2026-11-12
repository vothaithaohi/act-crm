'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CREW_MAX_POSITIONS, type CrewJob } from '@/lib/dienvienvn/crew-jobs';
import { DEPARTMENT_OPTIONS, JOB_OPTIONS, JobOtherField, OTHER_ID, Option, departmentOf } from '@/lib/dienvienvn/crew-taxonomy';

/** Chữ tự ghi khi chọn "Khác" ở các ô chọn. */
type Others = Partial<Record<JobOtherField, string>>;
const POSITION_OTHER_FIELDS: JobOtherField[] = ['seniority_level', 'salary_type'];

/** Phần riêng của từng vị trí tuyển (một dự án tuyển được nhiều vị trí). */
export interface CrewPositionForm {
  department: string;
  role_title: string;
  role_other: string;
  description: string;
  seniority_level: string;
  salary_type: string;
  salary_min: string;
  salary_max: string;
  /** Số lượng cần tuyển */
  quantity: string;
  /** "Khác" của cấp độ / cách tính thù lao */
  other_values: Others;
}

/** Dữ liệu Form A khi đang nhập: thông tin chung của dự án + danh sách vị trí. */
export interface CrewFormA {
  company_name: string;
  company_type: string;
  contact_email: string;
  contact_phone: string;
  project_name: string;
  project_hidden: boolean;
  project_type: string;
  project_phase: string;
  requires_cv: boolean;
  positions: CrewPositionForm[];
  employment_type: string;
  start_date: string;
  end_date: string;
  shooting_days: string;
  city: string;
  location_detail: string;
  work_mode: string;
  /** "Khác" của các ô chọn chung (loại hình đơn vị, dự án, giai đoạn, hình thức, thành phố, chế độ) */
  other_values: Others;
}

export const emptyCrewPosition = (): CrewPositionForm => ({
  department: '',
  role_title: '',
  role_other: '',
  description: '',
  seniority_level: '',
  salary_type: '',
  salary_min: '',
  salary_max: '',
  quantity: '1',
  other_values: {}
});

/** Dữ liệu gửi API: đăng mới gửi cả danh sách vị trí; sửa một tin thì gửi đúng một vị trí. */
export function crewFormPayload(form: CrewFormA, single: boolean) {
  const { positions, ...shared } = form;
  if (single) return { ...shared, ...positions[0], other_values: { ...shared.other_values, ...positions[0]?.other_values } };
  return { ...shared, positions };
}

export function crewFormFrom(j?: Partial<CrewJob> | null, fallbackCompany = ''): CrewFormA {
  const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  const all = (j?.other_values || {}) as Others;
  const pick = (own: boolean) =>
    Object.fromEntries(Object.entries(all).filter(([k]) => POSITION_OTHER_FIELDS.includes(k as JobOtherField) === own)) as Others;
  return {
    company_name: s(j?.company) || fallbackCompany,
    company_type: s(j?.company_type),
    contact_email: s(j?.contact_email),
    contact_phone: s(j?.contact_phone),
    project_name: s(j?.project_name),
    project_hidden: !!j?.project_hidden,
    project_type: s(j?.project_type),
    project_phase: s(j?.project_phase),
    requires_cv: !!j?.requires_cv,
    positions: [
      {
        department: s(j?.department),
        role_title: s(j?.role_title),
        role_other: s(j?.role_other),
        description: s(j?.description),
        seniority_level: s(j?.seniority_level),
        salary_type: s(j?.salary_type),
        salary_min: s(j?.salary_min),
        salary_max: s(j?.salary_max),
        quantity: s(j?.quantity) || '1',
        other_values: pick(true)
      }
    ],
    employment_type: s(j?.employment_type),
    start_date: s(j?.start_date),
    end_date: s(j?.end_date),
    shooting_days: s(j?.shooting_days),
    city: s(j?.city),
    location_detail: s(j?.location_detail),
    work_mode: s(j?.work_mode),
    other_values: pick(false)
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

/**
 * Ô JD: đang điền thì tự xổ ra theo nội dung (không phải cuộn trong ô), bấm sang ô khác / ra ngoài thì thu gọn lại.
 * Không giới hạn số chữ.
 */
function JdBox({ id, cls, value, onChange }: { id: string; cls: string; value: string; onChange: (v: string) => void }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = React.useState(false);
  const COLLAPSED = 110;
  const fit = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(COLLAPSED, el.scrollHeight + 2)}px`;
  }, []);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) fit();
    else el.style.height = `${COLLAPSED}px`;
  }, [open, value, fit]);
  return (
    <textarea
      ref={ref}
      id={id}
      className={`${cls} resize-none py-2.5`}
      style={{ height: COLLAPSED, overflowY: open ? 'hidden' : 'auto' }}
      value={value}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onChange={e => onChange(e.target.value)}
      placeholder="Công việc cụ thể, yêu cầu, quyền lợi…"
    />
  );
}

/** Ô chọn có "Khác (tự ghi)": chọn "Khác" thì hiện ô ghi ngay bên dưới. */
function OtherSelect({
  id,
  field,
  v,
  others,
  onPick,
  onOther,
  placeholder,
  ui
}: {
  id: string;
  field: JobOtherField;
  v: string;
  others: Others;
  onPick: (x: string) => void;
  onOther: (text: string) => void;
  placeholder: string;
  ui: { input: string };
}) {
  return (
    <>
      <SelectBox cls={ui.input} id={id} list={JOB_OPTIONS[field]} v={v} onPick={onPick} placeholder={placeholder} />
      {v === OTHER_ID && (
        <input
          id={`${id}-other`}
          className={`${ui.input} mt-2`}
          value={others[field] || ''}
          maxLength={120}
          onChange={e => onOther(e.target.value)}
          placeholder="Ghi rõ lựa chọn khác *"
          aria-label="Ghi rõ lựa chọn khác"
        />
      )}
    </>
  );
}

/** Một vị trí tuyển: phân nhóm, vị trí cụ thể (hoặc "Khác" tự nhập), cấp độ, thù lao. */
function PositionCard({
  index,
  value,
  onChange,
  onRemove,
  ui,
  numbered
}: {
  index: number;
  value: CrewPositionForm;
  onChange: (v: CrewPositionForm) => void;
  onRemove?: () => void;
  ui: (typeof UI)[Variant];
  numbered: boolean;
}) {
  const set = (patch: Partial<CrewPositionForm>) => onChange({ ...value, ...patch });
  const setOther = (f: JobOtherField, text: string) => set({ other_values: { ...value.other_values, [f]: text } });
  const dept = departmentOf(value.department);
  const isOtherDept = value.department === OTHER_ID;
  const negotiable = value.salary_type === 'negotiable';
  const id = (k: string) => `cj-${k}-${index}`;
  const field = 'space-y-1.5';
  const grid = 'grid grid-cols-1 gap-4 sm:grid-cols-2';
  return (
    <div className={numbered ? 'space-y-4 rounded-[14px] border border-[#e5e5ea] p-4' : 'space-y-4'}>
      {numbered && (
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold">Vị trí {index + 1}</p>
          {onRemove && (
            <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-[13px] text-[#b00020] hover:underline">
              <Trash2 className="h-4 w-4" /> Xoá vị trí
            </button>
          )}
        </div>
      )}
      <div className={grid}>
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor={id('dept')}>Phân nhóm chuyên môn</FieldLabel>
          <SelectBox
            cls={ui.input}
            id={id('dept')}
            list={DEPARTMENT_OPTIONS}
            v={value.department}
            onPick={x => set({ department: x, role_title: x === OTHER_ID ? OTHER_ID : '', role_other: x === OTHER_ID ? value.role_other : '' })}
            placeholder="Chọn phân nhóm"
          />
        </div>
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor={id('role')}>Vị trí cụ thể</FieldLabel>
          <select id={id('role')} className={ui.input} value={value.role_title} disabled={!dept} onChange={e => set({ role_title: e.target.value })}>
            <option value="">{dept ? 'Chọn vị trí' : 'Chọn phân nhóm trước'}</option>
            {dept?.roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.vi} ({r.en})
              </option>
            ))}
            {dept && <option value={OTHER_ID}>Khác (tự nhập)</option>}
          </select>
        </div>
      </div>
      {value.role_title === OTHER_ID && (
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor={id('other')}>Tên vị trí</FieldLabel>
          <input
            id={id('other')}
            className={ui.input}
            value={value.role_other}
            maxLength={120}
            onChange={e => set({ role_other: e.target.value })}
            placeholder={isOtherDept ? 'VD: Điều phối diễn viên quần chúng' : 'Nhập vị trí không có trong danh sách'}
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor={id('senior')}>Cấp độ kinh nghiệm kỳ vọng</FieldLabel>
          <OtherSelect
            ui={ui}
            id={id('senior')}
            field="seniority_level"
            v={value.seniority_level}
            others={value.other_values}
            onPick={x => set({ seniority_level: x })}
            onOther={t => setOther('seniority_level', t)}
            placeholder="Chọn cấp độ"
          />
        </div>
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor={id('qty')}>Số lượng cần tuyển</FieldLabel>
          <input
            id={id('qty')}
            inputMode="numeric"
            className={ui.input}
            value={value.quantity}
            onChange={e => set({ quantity: e.target.value.replace(/\D/g, '').slice(0, 3) })}
            placeholder="1"
          />
        </div>
      </div>
      <div className={field}>
        <FieldLabel cls={ui.label} htmlFor={id('jd')}>Mô tả công việc (JD)</FieldLabel>
        <JdBox id={id('jd')} cls={ui.input} value={value.description} onChange={v => set({ description: v })} />
      </div>
      <div className={field}>
        <FieldLabel cls={ui.label} required htmlFor={id('stype')}>Cách tính thù lao</FieldLabel>
        <OtherSelect
          ui={ui}
          id={id('stype')}
          field="salary_type"
          v={value.salary_type}
          others={value.other_values}
          onPick={x => set({ salary_type: x })}
          onOther={t => setOther('salary_type', t)}
          placeholder="Chọn cách tính"
        />
      </div>
      {!negotiable && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor={id('smin')}>Mức tối thiểu</FieldLabel>
            <input id={id('smin')} inputMode="numeric" className={ui.input} value={value.salary_min} onChange={e => set({ salary_min: e.target.value.replace(/\D/g, '').slice(0, 12) })} placeholder="VD: 1500000" />
          </div>
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor={id('smax')}>Mức tối đa</FieldLabel>
            <input id={id('smax')} inputMode="numeric" className={ui.input} value={value.salary_max} onChange={e => set({ salary_max: e.target.value.replace(/\D/g, '').slice(0, 12) })} placeholder="VD: 2500000" />
          </div>
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor={id('cur')}>Đơn vị tiền tệ</FieldLabel>
            <input id={id('cur')} className={ui.input} value="VND" readOnly />
          </div>
        </div>
      )}
    </div>
  );
}

/** Form A. `multi`: cho thêm nhiều vị trí (khi đăng mới); khi sửa một tin chỉ có một vị trí. */
export function CrewJobFields({ value, onChange, variant = 'dv', multi = false }: { value: CrewFormA; onChange: (v: CrewFormA) => void; variant?: Variant; multi?: boolean }) {
  const ui = UI[variant];
  const set = (patch: Partial<CrewFormA>) => onChange({ ...value, ...patch });
  const others = value.other_values || {};
  const setOther = (f: JobOtherField, text: string) => set({ other_values: { ...others, [f]: text } });
  const sel = (f: JobOtherField, htmlId: string, placeholder: string) => (
    <OtherSelect
      ui={ui}
      id={htmlId}
      field={f}
      v={value[f as keyof CrewFormA] as string}
      others={others}
      onPick={x => set({ [f]: x } as Partial<CrewFormA>)}
      onOther={t => setOther(f, t)}
      placeholder={placeholder}
    />
  );
  const positions = value.positions.length ? value.positions : [emptyCrewPosition()];
  const setPosition = (i: number, p: CrewPositionForm) => set({ positions: positions.map((x, j) => (j === i ? p : x)) });
  const numbered = multi || positions.length > 1;

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
          {sel('company_type', 'cj-ctype', 'Chọn loại hình đơn vị')}
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
            {sel('project_type', 'cj-ptype', 'Chọn loại hình dự án')}
          </div>
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor="cj-phase">Giai đoạn dự án đang tuyển</FieldLabel>
            {sel('project_phase', 'cj-phase', 'Chọn giai đoạn')}
          </div>
        </div>
      </section>

      {/* 3. Vị trí & yêu cầu chuyên môn (một dự án tuyển được nhiều vị trí) */}
      <section className={ui.section}>
        <div>
          <p className={ui.title}>3. Vị trí, yêu cầu chuyên môn &amp; thù lao</p>
          {multi && <p className={ui.hint}>Một dự án tuyển được nhiều vị trí. Mỗi vị trí hiện thành một tin riêng trên trang tuyển dụng.</p>}
        </div>
        {positions.map((p, i) => (
          <PositionCard
            key={i}
            index={i}
            value={p}
            ui={ui}
            numbered={numbered}
            onChange={v => setPosition(i, v)}
            onRemove={positions.length > 1 ? () => set({ positions: positions.filter((_, j) => j !== i) }) : undefined}
          />
        ))}
        {multi && positions.length < CREW_MAX_POSITIONS && (
          <button
            type="button"
            onClick={() => set({ positions: [...positions, emptyCrewPosition()] })}
            className={variant === 'dv' ? 'dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]' : 'h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold hover:bg-muted'}
          >
            <Plus className="h-4 w-4" /> Thêm vị trí
          </button>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-[14px]">
          <input type="checkbox" className={ui.check} checked={value.requires_cv} onChange={e => set({ requires_cv: e.target.checked })} />
          Yêu cầu gửi kèm portfolio/CV
        </label>
      </section>

      {/* 4. Thời gian & hình thức làm việc */}
      <section className={ui.section}>
        <p className={ui.title}>4. Thời gian &amp; hình thức làm việc</p>
        <div className={field}>
          <FieldLabel cls={ui.label} required htmlFor="cj-emp">Hình thức hợp đồng</FieldLabel>
          {sel('employment_type', 'cj-emp', 'Chọn hình thức')}
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
            {sel('city', 'cj-city', 'Chọn thành phố')}
          </div>
          <div className={field}>
            <FieldLabel cls={ui.label} htmlFor="cj-mode">Chế độ làm việc</FieldLabel>
            {sel('work_mode', 'cj-mode', 'Chọn chế độ')}
          </div>
        </div>
        <div className={field}>
          <FieldLabel cls={ui.label} htmlFor="cj-locd">Địa điểm cụ thể / Đi quay xa</FieldLabel>
          <input id="cj-locd" className={ui.input} value={value.location_detail} onChange={e => set({ location_detail: e.target.value })} placeholder="VD: Quay tại Đà Lạt 5 ngày" />
        </div>
      </section>

    </div>
  );
}
