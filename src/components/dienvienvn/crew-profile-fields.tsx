'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  AVAILABILITY_STATUSES,
  BASE_CITIES,
  CREDIT_TYPES,
  CREW_MAX_CREDITS,
  CREW_MAX_SECONDARY,
  CrewProfile,
  SHOWREEL_REQUIRED_ROLES,
  SOFTWARE_SUGGESTIONS
} from '@/lib/dienvienvn/crew-profiles';
import { DEPARTMENT_OPTIONS, OTHER_ID, Option, SENIORITY_LEVELS, departmentOf } from '@/lib/dienvienvn/crew-taxonomy';
import { CheckOption, Field, SelectInput, TextInput } from './form-fields';

export interface RoleForm {
  department: string;
  role_title: string;
  role_other: string;
}
export interface CreditForm {
  project_name: string;
  year: string;
  type: string;
  role_in_project: string;
  project_link: string;
}

/** Dữ liệu Form B khi đang nhập (gửi lên API /crew/profile). */
export interface CrewFormB {
  full_name: string;
  display_name: string;
  base_city: string;
  willing_to_travel: boolean;
  primary_department: string;
  primary_role: string;
  primary_role_other: string;
  secondary_roles: RoleForm[];
  years_of_experience: string;
  primary_showreel_url: string;
  portfolio_url: string;
  filmography_credits: CreditForm[];
  software_skills: string[];
  owned_gear: string;
  availability_status: string;
  busy_until: string;
  day_rate: string;
  project_rate: string;
  rate_negotiable: boolean;
  public_email: string;
  public_phone: string;
  phone_verified_only: boolean;
  social_link: string;
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export function crewFormBFrom(p?: Partial<CrewProfile> | null, email = ''): CrewFormB {
  return {
    full_name: s(p?.full_name),
    display_name: s(p?.display_name),
    base_city: s(p?.base_city),
    willing_to_travel: !!p?.willing_to_travel,
    primary_department: s(p?.primary_department),
    primary_role: s(p?.primary_role),
    primary_role_other: s(p?.primary_role_other),
    secondary_roles: (p?.secondary_roles || []).map(r => ({ department: s(r.department), role_title: s(r.role_title), role_other: s(r.role_other) })),
    years_of_experience: s(p?.years_of_experience),
    primary_showreel_url: s(p?.primary_showreel_url),
    portfolio_url: s(p?.portfolio_url),
    filmography_credits: (p?.filmography_credits || []).map(c => ({
      project_name: s(c.project_name),
      year: s(c.year),
      type: s(c.type),
      role_in_project: s(c.role_in_project),
      project_link: s(c.project_link)
    })),
    software_skills: p?.software_skills || [],
    owned_gear: s(p?.owned_gear),
    availability_status: s(p?.availability_status),
    busy_until: s(p?.busy_until),
    day_rate: s(p?.day_rate),
    project_rate: s(p?.project_rate),
    rate_negotiable: !!p?.rate_negotiable,
    public_email: s(p?.public_email) || email,
    public_phone: s(p?.public_phone),
    phone_verified_only: !!p?.phone_verified_only,
    social_link: s(p?.social_link)
  };
}

function Options({ list, placeholder }: { list: Option[]; placeholder: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {list.map(o => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </>
  );
}

/** Phân nhóm → vị trí cụ thể (cùng danh mục với form đăng tuyển), có "Khác" để tự nhập. */
function RolePicker({ id, value, onChange, required }: { id: string; value: RoleForm; onChange: (v: RoleForm) => void; required?: boolean }) {
  const dept = departmentOf(value.department);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Phân nhóm chuyên môn" required={required} htmlFor={`${id}-dept`}>
          <SelectInput
            id={`${id}-dept`}
            value={value.department}
            onChange={e => {
              const d = e.target.value;
              onChange({ department: d, role_title: d === OTHER_ID ? OTHER_ID : '', role_other: d === OTHER_ID ? value.role_other : '' });
            }}
          >
            <Options list={DEPARTMENT_OPTIONS} placeholder="Chọn phân nhóm" />
          </SelectInput>
        </Field>
        <Field label="Vị trí" required={required} htmlFor={`${id}-role`}>
          <SelectInput id={`${id}-role`} value={value.role_title} disabled={!dept} onChange={e => onChange({ ...value, role_title: e.target.value })}>
            <option value="">{dept ? 'Chọn vị trí' : 'Chọn phân nhóm trước'}</option>
            {dept?.roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.vi} ({r.en})
              </option>
            ))}
            {dept && <option value={OTHER_ID}>Khác (tự nhập)</option>}
          </SelectInput>
        </Field>
      </div>
      {value.role_title === OTHER_ID && (
        <Field label="Tên vị trí" required={required} htmlFor={`${id}-other`}>
          <TextInput id={`${id}-other`} maxLength={120} value={value.role_other} onChange={e => onChange({ ...value, role_other: e.target.value })} placeholder="Nhập vị trí không có trong danh sách" />
        </Field>
      )}
    </div>
  );
}

const digits = (v: string, max = 12) => v.replace(/\D/g, '').slice(0, max);

/** Form B: Hồ sơ ứng viên / Ekip Freelancer — đúng 5 mục trong tài liệu Trang tuyển dụng. */
export function CrewProfileFields({ value, onChange, emailLocked = false }: { value: CrewFormB; onChange: (v: CrewFormB) => void; emailLocked?: boolean }) {
  const set = (patch: Partial<CrewFormB>) => onChange({ ...value, ...patch });
  const [skill, setSkill] = useState('');
  const addSkill = (raw: string) => {
    const v = raw.trim();
    if (!v || value.software_skills.some(x => x.toLowerCase() === v.toLowerCase())) return setSkill('');
    set({ software_skills: [...value.software_skills, v].slice(0, 30) });
    setSkill('');
  };
  const showreelRequired = SHOWREEL_REQUIRED_ROLES.includes(value.primary_role);
  const section = 'dv-card space-y-5 p-6 md:p-8';
  const title = 'text-[19px] font-semibold';
  const grid = 'grid grid-cols-1 gap-4 sm:grid-cols-2';

  return (
    <div className="space-y-4">
      {/* 1. Thông tin cá nhân & nghệ danh */}
      <section className={section}>
        <p className={title}>1. Thông tin cá nhân &amp; nghệ danh</p>
        <div className={grid}>
          <Field label="Họ và tên thật" required htmlFor="cb-name">
            <TextInput id="cb-name" value={value.full_name} onChange={e => set({ full_name: e.target.value })} autoComplete="name" />
          </Field>
          <Field label="Nghệ danh / Tên hiển thị làm nghề" htmlFor="cb-display">
            <TextInput id="cb-display" value={value.display_name} onChange={e => set({ display_name: e.target.value })} placeholder="VD: Tuấn Colorist, Alex D.O.P" />
          </Field>
        </div>
        <Field label="Khu vực hoạt động chính" required htmlFor="cb-city">
          <SelectInput id="cb-city" value={value.base_city} onChange={e => set({ base_city: e.target.value })}>
            <Options list={BASE_CITIES} placeholder="Chọn khu vực" />
          </SelectInput>
        </Field>
        <CheckOption checked={value.willing_to_travel} onChange={() => set({ willing_to_travel: !value.willing_to_travel })}>
          Có thể đi tỉnh / ngoại cảnh (đi quay xa)
        </CheckOption>
      </section>

      {/* 2. Định vị chuyên môn chính */}
      <section className={section}>
        <p className={title}>2. Chuyên môn chính</p>
        <div>
          <p className="dv-field-label">
            Vai trò chính<span className="ml-0.5 text-[var(--dv-red)]">*</span>
          </p>
          <RolePicker
            id="cb-primary"
            required
            value={{ department: value.primary_department, role_title: value.primary_role, role_other: value.primary_role_other }}
            onChange={r => set({ primary_department: r.department, primary_role: r.role_title, primary_role_other: r.role_other })}
          />
        </div>
        <div className="space-y-3">
          <p className="dv-field-label">Vai trò phụ (tối đa {CREW_MAX_SECONDARY})</p>
          {value.secondary_roles.map((r, i) => (
            <div key={i} className="rounded-[14px] border border-[#e5e5ea] p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[14px] font-semibold">Vai trò phụ {i + 1}</p>
                <button type="button" onClick={() => set({ secondary_roles: value.secondary_roles.filter((_, j) => j !== i) })} className="inline-flex items-center gap-1 text-[13px] text-[#b00020] hover:underline">
                  <Trash2 className="h-4 w-4" /> Xoá
                </button>
              </div>
              <RolePicker id={`cb-sec-${i}`} value={r} onChange={v => set({ secondary_roles: value.secondary_roles.map((x, j) => (j === i ? v : x)) })} />
            </div>
          ))}
          {value.secondary_roles.length < CREW_MAX_SECONDARY && (
            <button
              type="button"
              onClick={() => set({ secondary_roles: [...value.secondary_roles, { department: '', role_title: '', role_other: '' }] })}
              className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]"
            >
              <Plus className="h-4 w-4" /> Thêm vai trò phụ
            </button>
          )}
        </div>
        <Field label="Số năm kinh nghiệm" required htmlFor="cb-years">
          <SelectInput id="cb-years" value={value.years_of_experience} onChange={e => set({ years_of_experience: e.target.value })}>
            <Options list={SENIORITY_LEVELS} placeholder="Chọn mức kinh nghiệm" />
          </SelectInput>
        </Field>
      </section>

      {/* 3. Năng lực & Showreel Portfolio */}
      <section className={section}>
        <p className={title}>3. Năng lực &amp; showreel / portfolio</p>
        <Field
          label="Link showreel chính"
          required={showreelRequired}
          htmlFor="cb-reel"
          hint="Vimeo / YouTube / Behance / Google Drive. Bắt buộc với Đạo diễn, D.O.P, Dựng phim, Chỉnh màu, VFX."
        >
          <TextInput id="cb-reel" type="url" inputMode="url" value={value.primary_showreel_url} onChange={e => set({ primary_showreel_url: e.target.value })} placeholder="https://" />
        </Field>
        <Field label="Portfolio / Trang cá nhân" htmlFor="cb-portfolio" hint="Website riêng, ArtStation…">
          <TextInput id="cb-portfolio" type="url" inputMode="url" value={value.portfolio_url} onChange={e => set({ portfolio_url: e.target.value })} placeholder="https://" />
        </Field>

        <div className="space-y-3">
          <p className="dv-field-label">Dự án tiêu biểu</p>
          {value.filmography_credits.map((c, i) => {
            const setC = (patch: Partial<CreditForm>) => set({ filmography_credits: value.filmography_credits.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="space-y-3 rounded-[14px] border border-[#e5e5ea] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold">Dự án {i + 1}</p>
                  <button type="button" onClick={() => set({ filmography_credits: value.filmography_credits.filter((_, j) => j !== i) })} className="inline-flex items-center gap-1 text-[13px] text-[#b00020] hover:underline">
                    <Trash2 className="h-4 w-4" /> Xoá
                  </button>
                </div>
                <div className={grid}>
                  <Field label="Tên dự án" required htmlFor={`cb-cr-name-${i}`}>
                    <TextInput id={`cb-cr-name-${i}`} value={c.project_name} onChange={e => setC({ project_name: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Năm sản xuất" htmlFor={`cb-cr-year-${i}`}>
                      <TextInput id={`cb-cr-year-${i}`} inputMode="numeric" value={c.year} onChange={e => setC({ year: digits(e.target.value, 4) })} placeholder="2025" />
                    </Field>
                    <Field label="Loại hình" htmlFor={`cb-cr-type-${i}`}>
                      <SelectInput id={`cb-cr-type-${i}`} value={c.type} onChange={e => setC({ type: e.target.value })}>
                        <Options list={CREDIT_TYPES} placeholder="Chọn" />
                      </SelectInput>
                    </Field>
                  </div>
                  <Field label="Vai trò đảm nhiệm" htmlFor={`cb-cr-role-${i}`}>
                    <TextInput id={`cb-cr-role-${i}`} value={c.role_in_project} onChange={e => setC({ role_in_project: e.target.value })} />
                  </Field>
                  <Field label="Link xem sản phẩm" htmlFor={`cb-cr-link-${i}`}>
                    <TextInput id={`cb-cr-link-${i}`} type="url" inputMode="url" value={c.project_link} onChange={e => setC({ project_link: e.target.value })} placeholder="https://" />
                  </Field>
                </div>
              </div>
            );
          })}
          {value.filmography_credits.length < CREW_MAX_CREDITS && (
            <button
              type="button"
              onClick={() => set({ filmography_credits: [...value.filmography_credits, { project_name: '', year: '', type: '', role_in_project: '', project_link: '' }] })}
              className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]"
            >
              <Plus className="h-4 w-4" /> Thêm dự án
            </button>
          )}
        </div>

        <div>
          <p className="dv-field-label">Phần mềm sử dụng thành thạo</p>
          {value.software_skills.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {value.software_skills.map(x => (
                <span key={x} className="inline-flex items-center gap-1 rounded-full bg-[var(--dv-bg-alt)] px-3 py-1 text-[13px] font-medium">
                  {x}
                  <button type="button" aria-label={`Bỏ ${x}`} onClick={() => set({ software_skills: value.software_skills.filter(y => y !== x) })}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <TextInput
              id="cb-skill"
              list="cb-skill-list"
              value={skill}
              onChange={e => setSkill(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addSkill(skill);
                }
              }}
              placeholder="VD: DaVinci Resolve — Enter để thêm"
            />
            <button type="button" onClick={() => addSkill(skill)} className="dv-btn dv-btn-secondary !h-[44px] shrink-0 !py-0 text-[14px]">
              Thêm
            </button>
          </div>
          <datalist id="cb-skill-list">
            {SOFTWARE_SUGGESTIONS.map(x => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </div>
        <Field label="Thiết bị cá nhân sở hữu" htmlFor="cb-gear" hint="D.O.P, Gaffer, Sound Recordist: ghi rõ body máy, ống kính, combo mic boom, sound recorder, monitor cân màu, đèn…">
          <textarea id="cb-gear" rows={3} className="dv-input min-h-[96px] py-3" value={value.owned_gear} onChange={e => set({ owned_gear: e.target.value })} />
        </Field>
      </section>

      {/* 4. Tình trạng nhận việc & Thù lao kỳ vọng */}
      <section className={section}>
        <p className={title}>4. Tình trạng nhận việc &amp; thù lao kỳ vọng</p>
        <div className={grid}>
          <Field label="Trạng thái nhận dự án" required htmlFor="cb-avail">
            <SelectInput id="cb-avail" value={value.availability_status} onChange={e => set({ availability_status: e.target.value })}>
              <Options list={AVAILABILITY_STATUSES} placeholder="Chọn trạng thái" />
            </SelectInput>
          </Field>
          {value.availability_status === 'busy_until' && (
            <Field label="Bận đến ngày" required htmlFor="cb-busy">
              <TextInput id="cb-busy" type="date" value={value.busy_until} onChange={e => set({ busy_until: e.target.value })} />
            </Field>
          )}
        </div>
        <div className={grid}>
          <Field label="Rate theo ngày quay (VND/ngày)" htmlFor="cb-day">
            <TextInput id="cb-day" inputMode="numeric" value={value.day_rate} onChange={e => set({ day_rate: digits(e.target.value) })} placeholder="VD: 1500000" />
          </Field>
          <Field label="Rate dự án trung bình (VND/project)" htmlFor="cb-project">
            <TextInput id="cb-project" inputMode="numeric" value={value.project_rate} onChange={e => set({ project_rate: digits(e.target.value) })} placeholder="VD: 15000000" />
          </Field>
        </div>
        <CheckOption checked={value.rate_negotiable} onChange={() => set({ rate_negotiable: !value.rate_negotiable })}>
          Thương lượng theo quy mô dự án
        </CheckOption>
      </section>

      {/* 5. Kênh liên hệ cho tuyển dụng */}
      <section className={section}>
        <div>
          <p className={title}>5. Kênh liên hệ cho tuyển dụng</p>
          <p className="mt-1 text-[13px] text-[var(--dv-text-secondary)]">Chỉ nhà tuyển dụng của tin bạn ứng tuyển và DienVienVN xem được.</p>
        </div>
        <div className={grid}>
          <Field label="Email công việc" required htmlFor="cb-email" hint={emailLocked ? 'Email đăng nhập, không đổi được tại đây.' : 'Dùng làm email đăng nhập DienVienVN.'}>
            <TextInput id="cb-email" type="email" inputMode="email" autoComplete="email" value={value.public_email} readOnly={emailLocked} onChange={e => set({ public_email: e.target.value })} placeholder="ban@email.com" />
          </Field>
          <Field label="Số điện thoại / Zalo" htmlFor="cb-phone">
            <TextInput id="cb-phone" type="tel" inputMode="tel" autoComplete="tel" value={value.public_phone} onChange={e => set({ public_phone: e.target.value })} placeholder="0901 234 567" />
          </Field>
        </div>
        <CheckOption checked={value.phone_verified_only} onChange={() => set({ phone_verified_only: !value.phone_verified_only })}>
          Chỉ hiển thị số điện thoại cho nhà tuyển dụng đã xác minh
        </CheckOption>
        <Field label="Link mạng xã hội / Nhắn tin nhanh" htmlFor="cb-social" hint="Facebook / Telegram / Instagram profile">
          <TextInput id="cb-social" type="url" inputMode="url" value={value.social_link} onChange={e => set({ social_link: e.target.value })} placeholder="https://" />
        </Field>
      </section>
    </div>
  );
}
