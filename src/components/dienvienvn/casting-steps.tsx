'use client';

import { Plus, Trash2 } from 'lucide-react';
import { EXTERNAL_PROGRAM_LABELS, ExternalProgramType } from '@/lib/types/crm';
import {
  ACCENT_OPTIONS,
  ACT_LEVEL_OPTIONS,
  CITY_OPTIONS,
  CastingDraft,
  DANCE_OPTIONS,
  ENROLLMENT_STATUS_OPTIONS,
  ExperienceEntry,
  ExperienceKind,
  FILM_ROLE_OPTIONS,
  INSTRUMENT_OPTIONS,
  LANGUAGE_OPTIONS,
  MARTIAL_ARTS_OPTIONS,
  ROLE_WILLINGNESS_OPTIONS,
  SPORT_OPTIONS,
  StepErrors,
  TATTOO_OPTIONS,
  TrainingEntry,
  ageFromDob,
  newId
} from '@/lib/dienvienvn/casting-form';
import { ACT_ACADEMY_SCHOOL, ART_SCHOOLS, OTHER_SCHOOL, SCHOOL_REGION_LABELS, SchoolRegion } from '@/lib/dienvienvn/schools';
import { ABROAD, ALL_PROVINCES, VN_CITIES, VN_PROVINCES, provinceLabel } from '@/lib/dienvienvn/provinces';
import { CheckOption, ChipGroup, Field, PhotoUpload, SectionTitle, SelectInput, TextInput } from './form-fields';

/** Danh sách 34 tỉnh/thành, nhóm theo thành phố trực thuộc trung ương / tỉnh. */
function ProvinceOptions({ exclude = [] }: { exclude?: string[] }) {
  return (
    <>
      <optgroup label="Thành phố trực thuộc trung ương">
        {VN_CITIES.filter(p => !exclude.includes(p.value)).map(p => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Tỉnh">
        {VN_PROVINCES.filter(p => !exclude.includes(p.value)).map(p => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </optgroup>
    </>
  );
}

export interface StepProps {
  draft: CastingDraft;
  update: (patch: Partial<CastingDraft>) => void;
  errors: StepErrors;
}

const Divider = () => <div className="h-px bg-[#e8e8ed]" />;

/* ---------------- Bước 1 ---------------- */
export function StepPersonal({ draft, update, errors }: StepProps) {
  const age = ageFromDob(draft.dob);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Họ và tên / Nghệ danh" required error={errors.full_name} htmlFor="full_name">
          <TextInput
            id="full_name"
            autoComplete="name"
            placeholder="VD: Trương Ngọc Ánh"
            value={draft.full_name}
            invalid={!!errors.full_name}
            onChange={e => update({ full_name: e.target.value })}
          />
        </Field>
        <Field label="Giới tính" required htmlFor="gender">
          <SelectInput id="gender" value={draft.gender} onChange={e => update({ gender: e.target.value as CastingDraft['gender'] })}>
            <option value="female">Nữ</option>
            <option value="male">Nam</option>
            <option value="other">Khác</option>
          </SelectInput>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Ngày tháng năm sinh"
          required
          htmlFor="dob"
          error={errors.dob}
          hint={age !== null && age >= 0 ? `Độ tuổi hiện tại: ${age} tuổi` : undefined}
        >
          <TextInput
            id="dob"
            type="date"
            max={today}
            min="1930-01-01"
            value={draft.dob}
            invalid={!!errors.dob}
            onChange={e => update({ dob: e.target.value })}
          />
        </Field>
        <Field label="Tỉnh / Thành phố hiện tại" required htmlFor="city" error={errors.city}>
          <SelectInput
            id="city"
            autoComplete="address-level1"
            value={draft.city}
            invalid={!!errors.city}
            onChange={e => update({ city: e.target.value })}
            className={draft.city ? '' : 'text-[#a1a1a6]'}
          >
            <option value="" disabled>
              Chọn tỉnh / thành phố
            </option>
            {draft.city && draft.city !== ABROAD && !ALL_PROVINCES.some(p => p.value === draft.city) && (
              <option value={draft.city}>{draft.city}</option>
            )}
            <ProvinceOptions />
            <option value={ABROAD}>{ABROAD}</option>
          </SelectInput>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Số điện thoại di động" required htmlFor="phone" error={errors.phone} hint="Đội ngũ casting sẽ liên hệ qua số này.">
          <TextInput
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0912 345 678"
            value={draft.phone}
            invalid={!!errors.phone}
            onChange={e => update({ phone: e.target.value })}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <TextInput
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="ban@email.com"
            value={draft.email}
            invalid={!!errors.email}
            onChange={e => update({ email: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Địa chỉ thường trú / tạm trú" htmlFor="address">
        <TextInput
          id="address"
          autoComplete="street-address"
          placeholder="Số nhà, tên đường, phường/xã…"
          value={draft.address}
          onChange={e => update({ address: e.target.value })}
        />
      </Field>

      {age !== null && age < 18 && (
        <div className="rounded-[14px] bg-[#fff8e6] p-4">
          <Field
            label="Phụ huynh / Người giám hộ (diễn viên dưới 18 tuổi)"
            required
            htmlFor="guardian"
            error={errors.parent_guardian_name}
          >
            <TextInput
              id="guardian"
              placeholder="Họ tên phụ huynh – Số điện thoại"
              value={draft.parent_guardian_name}
              invalid={!!errors.parent_guardian_name}
              onChange={e => update({ parent_guardian_name: e.target.value })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

/* ---------------- Bước 2 ---------------- */
function NumberField({
  id,
  label,
  unit,
  required,
  value,
  error,
  placeholder,
  onChange
}: {
  id: string;
  label: string;
  unit?: string;
  required?: boolean;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} required={required} htmlFor={id} error={error}>
      <div className="relative">
        <TextInput
          id={id}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          invalid={!!error}
          onChange={e => onChange(e.target.value.replace(',', '.').replace(/[^\d.]/g, '').slice(0, 5))}
          className={unit ? 'pr-12' : ''}
        />
        {unit && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-[var(--dv-text-secondary)]">{unit}</span>}
      </div>
    </Field>
  );
}

export function StepBody({ draft, update, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
        <NumberField id="height" label="Chiều cao" unit="cm" required placeholder="170" value={draft.height_cm} error={errors.height_cm} onChange={v => update({ height_cm: v })} />
        <NumberField id="weight" label="Cân nặng" unit="kg" required placeholder="55" value={draft.weight_kg} error={errors.weight_kg} onChange={v => update({ weight_kg: v })} />
        <NumberField id="shoe" label="Size giày" placeholder="38" value={draft.shoe_size} onChange={v => update({ shoe_size: v })} />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <NumberField id="chest" label="Vòng 1 · Ngực" unit="cm" placeholder="84" value={draft.chest_cm} error={errors.chest_cm} onChange={v => update({ chest_cm: v })} />
        <NumberField id="waist" label="Vòng 2 · Eo" unit="cm" placeholder="64" value={draft.waist_cm} error={errors.waist_cm} onChange={v => update({ waist_cm: v })} />
        <NumberField id="hip" label="Vòng 3 · Hông" unit="cm" placeholder="90" value={draft.hip_cm} error={errors.hip_cm} onChange={v => update({ hip_cm: v })} />
      </div>
      <Divider />
      <div>
        <p className="dv-field-label">Hình xăm & xỏ khuyên</p>
        <ChipGroup
          label="Vị trí hình xăm và xỏ khuyên"
          options={TATTOO_OPTIONS}
          exclusive="none"
          value={draft.tattoos_piercings}
          onChange={v => update({ tattoos_piercings: v })}
        />
      </div>
    </div>
  );
}

/* ---------------- Bước 3 ---------------- */
const EXPERIENCE_SECTIONS: { kind: ExperienceKind; title: string; titleLabel: string; titlePh: string; extraLabel: string; extraPh: string }[] = [
  { kind: 'feature_films', title: 'Phim điện ảnh', titleLabel: 'Tên phim', titlePh: 'VD: Mai, Lật Mặt 7…', extraLabel: 'Tên nhân vật', extraPh: 'VD: Sâu' },
  { kind: 'web_dramas', title: 'Web drama & phim ngắn', titleLabel: 'Tên dự án', titlePh: 'Tên web drama / phim ngắn', extraLabel: 'Tên nhân vật', extraPh: 'Nhân vật' },
  { kind: 'tv_shows', title: 'Phim truyền hình', titleLabel: 'Tên phim', titlePh: 'Tên phim truyền hình', extraLabel: 'Tên nhân vật', extraPh: 'Nhân vật' },
  { kind: 'commercials', title: 'Quảng cáo (TVC)', titleLabel: 'Thương hiệu', titlePh: 'VD: Vinamilk, Shopee…', extraLabel: 'Ghi chú', extraPh: 'Chiến dịch / vai trò' },
  { kind: 'music_videos', title: 'MV ca nhạc', titleLabel: 'Tên bài hát', titlePh: 'Tên MV', extraLabel: 'Ca sĩ', extraPh: 'Tên ca sĩ' }
];

export function StepExperience({ draft, update }: StepProps) {
  const setList = (kind: ExperienceKind, list: ExperienceEntry[]) => update({ experience: { ...draft.experience, [kind]: list } });
  const total = Object.values(draft.experience).reduce((n, l) => n + l.length, 0);

  return (
    <div className="space-y-6">
      {total === 0 && (
        <p className="rounded-[14px] bg-[var(--dv-bg-alt)] p-4 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">
          Chưa có kinh nghiệm? Không sao — bạn có thể bỏ qua bước này. Nhiều dự án đang tìm gương mặt mới.
        </p>
      )}
      {EXPERIENCE_SECTIONS.map((sec, si) => {
        const list = draft.experience[sec.kind];
        return (
          <div key={sec.kind} className="space-y-4">
            {si > 0 && <Divider />}
            <SectionTitle
              title={sec.title}
              action={
                <button
                  type="button"
                  className="dv-link shrink-0 text-[15px]"
                  onClick={() => setList(sec.kind, [...list, { id: newId(), title: '', role: 'supporting', character: '', year: '' }])}
                >
                  <Plus className="h-4 w-4" /> Thêm
                </button>
              }
            />
            {list.map((item, idx) => {
              const patch = (p: Partial<ExperienceEntry>) => setList(sec.kind, list.map((x, i) => (i === idx ? { ...x, ...p } : x)));
              return (
                <div key={item.id} className="rounded-[14px] bg-[var(--dv-bg-alt)] p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <Field label={sec.titleLabel} htmlFor={`${item.id}-t`}>
                      <TextInput id={`${item.id}-t`} placeholder={sec.titlePh} value={item.title} onChange={e => patch({ title: e.target.value })} />
                    </Field>
                    <Field label={sec.extraLabel} htmlFor={`${item.id}-c`}>
                      <TextInput id={`${item.id}-c`} placeholder={sec.extraPh} value={item.character} onChange={e => patch({ character: e.target.value })} />
                    </Field>
                  </div>
                  <div className="mt-3 grid grid-cols-[minmax(0,1fr)_96px_auto] items-end gap-3">
                    <Field label="Vai trò" htmlFor={`${item.id}-r`}>
                      <SelectInput id={`${item.id}-r`} value={item.role} onChange={e => patch({ role: e.target.value as ExperienceEntry['role'] })}>
                        {FILM_ROLE_OPTIONS.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Năm" htmlFor={`${item.id}-y`}>
                      <TextInput
                        id={`${item.id}-y`}
                        inputMode="numeric"
                        placeholder="2025"
                        value={item.year}
                        onChange={e => patch({ year: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      />
                    </Field>
                    <button
                      type="button"
                      aria-label="Xoá dòng này"
                      onClick={() => setList(sec.kind, list.filter((_, i) => i !== idx))}
                      className="flex h-12 w-12 items-center justify-center rounded-[12px] text-[var(--dv-text-secondary)] transition-colors hover:bg-white hover:text-[var(--dv-red)]"
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Bước 4 ---------------- */
export function StepSkills({ draft, update }: StepProps) {
  const groups: { key: keyof CastingDraft; label: string; options: string[]; format?: (s: string) => string }[] = [
    { key: 'accents', label: 'Giọng nói vùng miền', options: ACCENT_OPTIONS, format: s => `Giọng ${s}` },
    { key: 'languages', label: 'Ngoại ngữ', options: LANGUAGE_OPTIONS },
    { key: 'martial_arts', label: 'Võ thuật & Cascadeur', options: MARTIAL_ARTS_OPTIONS },
    { key: 'instruments', label: 'Nhạc cụ biểu diễn', options: INSTRUMENT_OPTIONS },
    { key: 'dancing', label: 'Vũ đạo', options: DANCE_OPTIONS },
    { key: 'sports', label: 'Thể thao', options: SPORT_OPTIONS }
  ];
  return (
    <div className="space-y-6">
      {groups.map((g, i) => (
        <div key={g.key} className="space-y-3">
          {i > 0 && <Divider />}
          <p className="dv-field-label !mb-0 pt-1">{g.label}</p>
          <ChipGroup
            label={g.label}
            options={g.options.map(o => ({ id: o, label: g.format ? g.format(o) : o }))}
            value={draft[g.key] as string[]}
            onChange={v => update({ [g.key]: v } as Partial<CastingDraft>)}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Bước 5 ---------------- */
export function StepWillingness({ draft, update }: StepProps) {
  const cities = draft.willing_work_cities;
  // Chip hiển thị: địa bàn mặc định + các tỉnh/thành người điền đã thêm
  const extraCities = cities.filter(c => !CITY_OPTIONS.includes(c));
  const chipOptions = [...CITY_OPTIONS, ...extraCities].map(c => ({ id: c, label: provinceLabel(c) }));

  const isChecked = (ids: string[]) => ids.every(id => draft.role_willingness.includes(id));
  const toggle = (ids: string[]) =>
    update({
      role_willingness: isChecked(ids)
        ? draft.role_willingness.filter(x => !ids.includes(x))
        : Array.from(new Set([...draft.role_willingness, ...ids]))
    });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="dv-field-label !mb-0">Sẵn sàng quay tại</p>
        <div className="flex flex-wrap items-center gap-2">
          <ChipGroup
            label="Địa bàn sẵn sàng quay"
            options={chipOptions}
            value={cities}
            onChange={next => {
              // Tỉnh/thành thêm vào mà bị bỏ chọn thì ẩn khỏi danh sách chip
              update({ willing_work_cities: next });
            }}
          />
          <label className="dv-chip relative !gap-1.5 !pr-4 text-[var(--dv-blue)]">
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            <span>Thêm tỉnh / thành</span>
            <select
              aria-label="Thêm tỉnh / thành phố sẵn sàng quay"
              value=""
              onChange={e => {
                const v = e.target.value;
                if (v && !cities.includes(v)) update({ willing_work_cities: [...cities, v] });
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              <option value="">Chọn tỉnh / thành phố</option>
              <ProvinceOptions exclude={[...CITY_OPTIONS, ...cities]} />
            </select>
          </label>
        </div>
      </div>
      <Divider />
      <div className="space-y-3">
        <div>
          <p className="dv-field-label !mb-1">Mức độ cởi mở với các phân cảnh đặc biệt</p>
          <p className="dv-field-hint !mt-0">Chỉ chọn những gì bạn thật sự thoải mái. Thông tin này chỉ dùng để ghép vai phù hợp.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ROLE_WILLINGNESS_OPTIONS.map(o => (
            <CheckOption key={o.key} checked={isChecked(o.ids)} onChange={() => toggle(o.ids)}>
              {o.label}
            </CheckOption>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Bước 6 ---------------- */
export function StepMedia({ draft, update, errors }: StepProps) {
  const socials: { key: keyof CastingDraft['social_links']; label: string; ph: string }[] = [
    { key: 'facebook', label: 'Facebook', ph: 'https://facebook.com/…' },
    { key: 'instagram', label: 'Instagram', ph: 'https://instagram.com/…' },
    { key: 'tiktok', label: 'TikTok', ph: 'https://tiktok.com/@…' },
    { key: 'showreel_url', label: 'Showreel (YouTube / Drive)', ph: 'https://youtube.com/watch?v=…' }
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
        <PhotoUpload kind="headshot" label="Chân dung / Portrait" hint="Góc thẳng, rõ mặt, không filter" required value={draft.headshot_url} error={errors.headshot_url} onChange={url => update({ headshot_url: url })} />
        <PhotoUpload kind="fullbody" label="Toàn thân / Full-body" hint="Đứng thẳng, thấy rõ dáng người" required value={draft.fullbody_url} error={errors.fullbody_url} onChange={url => update({ fullbody_url: url })} />
        <div className="col-span-2 sm:col-span-1">
          <div className="mx-auto max-w-[50%] sm:max-w-none">
            <PhotoUpload kind="compcard" label="Góc nghiêng / Comp-card" hint="Không bắt buộc" value={draft.compcard_url} onChange={url => update({ compcard_url: url })} />
          </div>
        </div>
      </div>
      <p className="text-[12px] leading-[1.33] text-[var(--dv-text-secondary)]">
        Ảnh JPG, PNG hoặc ảnh chụp từ điện thoại. Ảnh sẽ được tự động tối ưu dung lượng trước khi tải lên.
      </p>
      <Divider />
      <SectionTitle title="Mạng xã hội & Showreel" desc="Giúp đạo diễn xem thêm hình ảnh và khả năng diễn xuất của bạn." />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {socials.map(s => (
          <Field key={s.key} label={s.label} htmlFor={`social-${s.key}`}>
            <TextInput
              id={`social-${s.key}`}
              type="url"
              inputMode="url"
              placeholder={s.ph}
              value={draft.social_links[s.key]}
              onChange={e => update({ social_links: { ...draft.social_links, [s.key]: e.target.value } })}
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Bước 7 ---------------- */
function emptyTraining(school: string): TrainingEntry {
  return {
    id: newId(),
    school,
    custom_school: '',
    act_level: 'ACT1',
    program_type: school === ACT_ACADEMY_SCHOOL ? 'short_course' : 'university',
    major: '',
    class_code: '',
    term_name: '',
    start_date: '',
    end_date: '',
    status: 'completed',
    instructor: '',
    evaluation: ''
  };
}

const REGIONS: SchoolRegion[] = ['north', 'central', 'south'];

function SchoolSelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <SelectInput id={id} value={value} onChange={e => onChange(e.target.value)}>
      <option value={ACT_ACADEMY_SCHOOL}>ACT Academy</option>
      {REGIONS.map(region => (
        <optgroup key={region} label={SCHOOL_REGION_LABELS[region]}>
          {ART_SCHOOLS.filter(s => s.region === region).map(s => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
      <option value={OTHER_SCHOOL}>{OTHER_SCHOOL}</option>
    </SelectInput>
  );
}

function TrainingCard({
  item,
  index,
  errors,
  onChange,
  onRemove
}: {
  item: TrainingEntry;
  index: number;
  errors: StepErrors;
  onChange: (p: Partial<TrainingEntry>) => void;
  onRemove: () => void;
}) {
  const isAct = item.school === ACT_ACADEMY_SCHOOL;
  const isCustom = item.school === OTHER_SCHOOL;
  const school = ART_SCHOOLS.find(s => s.name === item.school);
  const pid = item.id;

  return (
    <div className="rounded-[18px] border border-[#e8e8ed] bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[14px] font-semibold text-[var(--dv-text-secondary)]">Khóa học {index + 1}</span>
        <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-[14px] text-[var(--dv-text-secondary)] hover:text-[var(--dv-red)]">
          <Trash2 className="h-4 w-4" /> Xoá
        </button>
      </div>

      <div className="space-y-4">
        <Field label="Nơi đào tạo" required htmlFor={`${pid}-school`} hint={school ? `${school.group} · ${school.city}` : undefined}>
          <SchoolSelect id={`${pid}-school`} value={item.school} onChange={v => onChange({ school: v, program_type: v === ACT_ACADEMY_SCHOOL ? 'short_course' : item.program_type })} />
        </Field>

        {isCustom && (
          <Field label="Tên cơ sở đào tạo" required htmlFor={`${pid}-custom`} error={errors[`training_${index}_school`]}>
            <TextInput
              id={`${pid}-custom`}
              placeholder="Lớp tư nhân, workshop, trường khác…"
              value={item.custom_school}
              invalid={!!errors[`training_${index}_school`]}
              onChange={e => onChange({ custom_school: e.target.value })}
            />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {isAct ? (
            <Field label="Cấp độ khóa học" required htmlFor={`${pid}-level`}>
              <SelectInput id={`${pid}-level`} value={item.act_level} onChange={e => onChange({ act_level: e.target.value as TrainingEntry['act_level'] })}>
                {ACT_LEVEL_OPTIONS.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : (
            <Field label="Hệ đào tạo" required htmlFor={`${pid}-program`}>
              <SelectInput id={`${pid}-program`} value={item.program_type} onChange={e => onChange({ program_type: e.target.value as ExternalProgramType })}>
                {(Object.keys(EXTERNAL_PROGRAM_LABELS) as ExternalProgramType[]).map(k => (
                  <option key={k} value={k}>
                    {EXTERNAL_PROGRAM_LABELS[k]}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          <Field label={isAct ? 'Mã lớp học' : 'Mã lớp / Chuyên ngành'} required={isAct} htmlFor={`${pid}-class`} error={errors[`training_${index}_class`]}>
            <TextInput
              id={`${pid}-class`}
              placeholder={isAct ? 'VD: ACT1-37B, ACT2-38B…' : 'VD: Diễn viên kịch – điện ảnh'}
              value={isAct ? item.class_code : item.major}
              invalid={!!errors[`training_${index}_class`]}
              onChange={e => onChange(isAct ? { class_code: e.target.value } : { major: e.target.value })}
            />
          </Field>
          <Field label={isAct ? 'Tên Term / Khóa' : 'Niên khóa / Khóa'} htmlFor={`${pid}-term`}>
            <TextInput
              id={`${pid}-term`}
              placeholder={isAct ? 'VD: Khóa 37B (11/2025)' : 'VD: K42 (2020–2024)'}
              value={item.term_name}
              onChange={e => onChange({ term_name: e.target.value })}
            />
          </Field>
        </div>

        <div className={`grid grid-cols-2 gap-4 ${isAct ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <Field label="Ngày bắt đầu" htmlFor={`${pid}-start`}>
            <TextInput id={`${pid}-start`} type="date" value={item.start_date} onChange={e => onChange({ start_date: e.target.value })} />
          </Field>
          <Field label="Ngày kết thúc" htmlFor={`${pid}-end`}>
            <TextInput id={`${pid}-end`} type="date" min={item.start_date || undefined} value={item.end_date} onChange={e => onChange({ end_date: e.target.value })} />
          </Field>
          <Field label="Trạng thái" htmlFor={`${pid}-status`} className={isAct ? '' : 'col-span-2 sm:col-span-1'}>
            <SelectInput id={`${pid}-status`} value={item.status} onChange={e => onChange({ status: e.target.value as TrainingEntry['status'] })}>
              {ENROLLMENT_STATUS_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          {isAct && (
            <Field label="Giảng viên phụ trách" htmlFor={`${pid}-instructor`}>
              <TextInput id={`${pid}-instructor`} placeholder="VD: Đạo diễn Vũ Trần" value={item.instructor} onChange={e => onChange({ instructor: e.target.value })} />
            </Field>
          )}
        </div>

        <Field label={isAct ? 'Đánh giá / Nhận xét chuyên môn của giảng viên' : 'Đánh giá / Thành tích nổi bật'} htmlFor={`${pid}-eval`}>
          <TextInput
            id={`${pid}-eval`}
            placeholder={isAct ? 'VD: Nắm vững kỹ thuật đài từ, biểu cảm tốt trước ống kính…' : 'VD: Tốt nghiệp loại Giỏi, vai chính vở diễn tốt nghiệp…'}
            value={item.evaluation}
            onChange={e => onChange({ evaluation: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

export function StepTraining({ draft, update, errors }: StepProps) {
  const setTrainings = (t: TrainingEntry[]) => update({ trainings: t });
  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
        Khai báo các khóa diễn xuất bạn đã hoặc đang theo học — tại ACT Academy hoặc các trường nghệ thuật khác. Bạn có thể thêm
        nhiều nơi đào tạo. Nếu chưa từng học, có thể bỏ qua bước này.
      </p>

      {draft.trainings.map((t, i) => (
        <TrainingCard
          key={t.id}
          item={t}
          index={i}
          errors={errors}
          onChange={p => setTrainings(draft.trainings.map(x => (x.id === t.id ? { ...x, ...p } : x)))}
          onRemove={() => setTrainings(draft.trainings.filter(x => x.id !== t.id))}
        />
      ))}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTrainings([...draft.trainings, emptyTraining(ACT_ACADEMY_SCHOOL)])}
          className="flex min-h-[64px] items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#c7c7cc] text-[15px] font-medium text-[var(--dv-blue)] transition-colors hover:border-[var(--dv-blue)] hover:bg-[rgba(0,113,227,0.04)]"
        >
          <Plus className="h-4 w-4" /> Đã học tại ACT Academy
        </button>
        <button
          type="button"
          onClick={() => setTrainings([...draft.trainings, emptyTraining(ART_SCHOOLS[0].name)])}
          className="flex min-h-[64px] items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#c7c7cc] text-[15px] font-medium text-[var(--dv-blue)] transition-colors hover:border-[var(--dv-blue)] hover:bg-[rgba(0,113,227,0.04)]"
        >
          <Plus className="h-4 w-4" /> Đã học tại trường khác
        </button>
      </div>
    </div>
  );
}
