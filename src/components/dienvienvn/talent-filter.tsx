'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, RotateCcw, X } from 'lucide-react';
import type { PublicTalent } from '@/lib/dienvienvn/public-talents';
import { ACCENT_OPTIONS, DANCE_OPTIONS, INSTRUMENT_OPTIONS, LANGUAGE_OPTIONS, MARTIAL_ARTS_OPTIONS, SPORT_OPTIONS } from '@/lib/dienvienvn/casting-form';

/**
 * Bộ lọc chi tiết cho trang Diễn viên (dienvienvn.com/dien-vien), theo kiểu Smart Casting Filter của CRM,
 * chỉ gồm các thông tin cấp công khai (không số đo, liên hệ, nơi ở).
 */
export interface TalentFilter {
  gender: 'all' | 'male' | 'female';
  ageMin: string;
  ageMax: string;
  hMin: string;
  hMax: string;
  wMin: string;
  wMax: string;
  schools: string[];
  actLevels: string[];
  skills: Record<string, string[]>;
  willingness: string[];
  cities: string[];
}

export const EMPTY_FILTER: TalentFilter = {
  gender: 'all',
  ageMin: '',
  ageMax: '',
  hMin: '',
  hMax: '',
  wMin: '',
  wMax: '',
  schools: [],
  actLevels: [],
  skills: {},
  willingness: [],
  cities: []
};


const WILLINGNESS = [
  { id: 'kissing_scene', label: 'Sẵn sàng cảnh hôn' },
  { id: 'swimsuit', label: 'Mặc đồ bơi / Bikini' },
  { id: 'lingerie', label: 'Trang phục nội y' },
  { id: 'partial_nudity', label: 'Bán khỏa thân nghệ thuật' },
  { id: 'hair_color', label: 'Sẵn sàng đổi màu tóc' },
  { id: 'cut_hair', label: 'Sẵn sàng cắt tóc ngắn' },
  { id: 'intimate_scene', label: 'Sẵn sàng cảnh nóng 18+' },
  { id: 'learn_new_skills', label: 'Sẵn sàng học ngoại ngữ / kỹ năng mới' }
];

/**
 * Nhóm kỹ năng (tên nhóm trùng skillGroups) → tiêu đề, theo thứ tự trong bộ lọc: Ngoại ngữ, Giọng nói, rồi các kỹ năng.
 * `preset`: lựa chọn do DienVienVN tạo (cùng danh sách của form nộp hồ sơ). Những gì diễn viên tự gõ thêm gom vào "Khác".
 * Ca hát chưa có danh sách chuẩn: giữ các thể loại nhiều người chọn nhất.
 */
const SKILL_SECTIONS: { group: string; title: string; preset?: string[] }[] = [
  { group: 'Ngoại ngữ', title: 'Ngoại ngữ', preset: LANGUAGE_OPTIONS },
  { group: 'Giọng vùng miền', title: 'Giọng nói vùng miền', preset: ACCENT_OPTIONS.map(a => `Giọng ${a}`) },
  { group: 'Võ thuật', title: 'Võ thuật & hành động', preset: MARTIAL_ARTS_OPTIONS },
  { group: 'Nhạc cụ', title: 'Nhạc cụ biểu diễn', preset: INSTRUMENT_OPTIONS },
  { group: 'Nhảy', title: 'Vũ đạo & nhảy', preset: DANCE_OPTIONS },
  { group: 'Thể thao', title: 'Thể thao', preset: SPORT_OPTIONS },
  { group: 'Ca hát', title: 'Ca hát' }
];

/** Mã của lựa chọn "Khác" trong mỗi nhóm kỹ năng. */
export const OTHER_SKILL = '__khac__';
const SINGING_TOP = 8;

/** Các lựa chọn hiện trong bộ lọc của một nhóm: lựa chọn chuẩn có diễn viên chọn (giữ thứ tự chuẩn) + "Khác". */
function sectionOptions(talents: PublicTalent[], group: string, preset?: string[]) {
  const values = talents.map(t => t.skills.find(g => g.group === group)?.items || []);
  const used = optionsOf(values);
  const main = preset ? preset.filter(o => used.includes(o)) : used.slice(0, SINGING_TOP);
  const hasOther = used.some(o => !main.includes(o));
  return { main, mainSet: new Set(main), hasOther };
}

/** Kỹ năng của diễn viên có thuộc lựa chọn đã chọn không ("Khác" = có ít nhất một kỹ năng ngoài danh sách chính). */
function skillMatches(items: string[], picked: string[], mainSet: Set<string>) {
  return picked.some(p => (p === OTHER_SKILL ? items.some(i => !mainSet.has(i)) : items.includes(p)));
}

/** "Trường X · Diễn viên (đang học)" → "Trường X" */
const schoolOf = (training: string) => training.split(' · ')[0].replace(/\s*\(đang học\)\s*$/, '').trim();

const inRange = (v: number | null, min: string, max: string) => {
  if (!min && !max) return true;
  if (v === null) return false;
  if (min && v < Number(min)) return false;
  if (max && v > Number(max)) return false;
  return true;
};

export function applyFilter(list: PublicTalent[], f: TalentFilter): PublicTalent[] {
  const mains = new Map(SKILL_SECTIONS.map(s => [s.group, sectionOptions(list, s.group, s.preset).mainSet]));
  return list.filter(t => {
    if (f.gender !== 'all' && t.gender !== f.gender) return false;
    if (!inRange(t.age, f.ageMin, f.ageMax)) return false;
    if (!inRange(t.height_cm, f.hMin, f.hMax)) return false;
    if (!inRange(t.weight_kg, f.wMin, f.wMax)) return false;
    if (f.schools.length && !t.trainings.some(x => f.schools.includes(schoolOf(x)))) return false;
    for (const [group, picked] of Object.entries(f.skills)) {
      if (!picked.length) continue;
      const items = t.skills.find(g => g.group === group)?.items || [];
      if (!skillMatches(items, picked, mains.get(group) || new Set())) return false;
    }
    if (f.willingness.length && !f.willingness.every(w => t.willingness.includes(w))) return false;
    if (f.cities.length && !f.cities.some(c => t.work_cities.includes(c))) return false;
    return true;
  });
}

export function activeCount(f: TalentFilter): number {
  return (
    (f.gender !== 'all' ? 1 : 0) +
    (f.ageMin || f.ageMax ? 1 : 0) +
    (f.hMin || f.hMax ? 1 : 0) +
    (f.wMin || f.wMax ? 1 : 0) +
    f.schools.length +
    Object.values(f.skills).reduce((n, v) => n + v.length, 0) +
    f.willingness.length +
    f.cities.length
  );
}

/** Các lựa chọn có thật trong kho (xếp theo số diễn viên). */
function optionsOf(values: string[][]): string[] {
  const count = new Map<string, number>();
  values.forEach(vs => Array.from(new Set(vs)).forEach(v => count.set(v, (count.get(v) || 0) + 1)));
  return Array.from(count.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))
    .map(([v]) => v);
}

const digits = (v: string, n: number) => v.replace(/\D/g, '').slice(0, n);
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#f0f0f2] py-5 last:border-0">
      <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{title}</p>
      {children}
    </div>
  );
}

/** Nhóm dạng xổ xuống: bấm vào tiêu đề mới hiện các lựa chọn (mở sẵn khi nhóm đang có lựa chọn). */
function Dropdown({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(count > 0);
  return (
    <div className="border-b border-[#f0f0f2] last:border-0">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 py-4 text-left">
        <span className="text-[15px] font-semibold">
          {title}
          {count > 0 && <span className="ml-2 rounded-full bg-[#1d1d1f] px-2 py-0.5 text-[12px] text-white">{count}</span>}
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--dv-text-secondary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

function Chips({ options, value, onToggle }: { options: { id: string; label: string; badge?: string }[]; value: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.id} type="button" className="dv-chip" aria-pressed={value.includes(o.id)} onClick={() => onToggle(o.id)}>
          {o.label}
          {o.badge && <span className="ml-1.5 text-[12px] opacity-60">{o.badge}</span>}
        </button>
      ))}
    </div>
  );
}

function Range({ min, max, onMin, onMax, unit, len }: { min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void; unit: string; len: number }) {
  const cls = 'dv-input !h-11 !py-0 text-[15px]';
  return (
    <div className="flex items-center gap-2">
      <input inputMode="numeric" value={min} onChange={e => onMin(digits(e.target.value, len))} placeholder="Từ" aria-label={`${unit} từ`} className={cls} />
      <span className="text-[var(--dv-text-tertiary)]">–</span>
      <input inputMode="numeric" value={max} onChange={e => onMax(digits(e.target.value, len))} placeholder="Đến" aria-label={`${unit} đến`} className={cls} />
      <span className="w-10 shrink-0 text-[14px] text-[var(--dv-text-secondary)]">{unit}</span>
    </div>
  );
}

export function TalentFilterPanel({
  talents,
  value,
  onChange,
  resultCount,
  onClose
}: {
  talents: PublicTalent[];
  value: TalentFilter;
  onChange: (f: TalentFilter) => void;
  resultCount: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const set = (patch: Partial<TalentFilter>) => onChange({ ...value, ...patch });
  // Nơi đào tạo: không tính lớp ACT (không nhắc lớp ACT ở trang này)
  const schools = optionsOf(talents.map(t => t.trainings.map(schoolOf))).filter(s => !/^ACT Academy$/i.test(s));
  const cities = optionsOf(talents.map(t => t.work_cities));
  const skillSections = SKILL_SECTIONS.map(s => ({ ...s, ...sectionOptions(talents, s.group, s.preset) })).filter(s => s.main.length || s.hasOther);
  const [allSchools, setAllSchools] = useState(false);
  const SCHOOLS_SHOWN = 8;
  const n = activeCount(value);

  return (
    <div className="fixed inset-0 z-[60] flex justify-start bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bộ lọc diễn viên"
        onClick={e => e.stopPropagation()}
        className="dv-slide-in-left flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f2] px-5 py-4">
          <div>
            <p className="text-[19px] font-semibold">Bộ lọc diễn viên</p>
            <p className="text-[13px] text-[var(--dv-text-secondary)]">
              Diễn viên phù hợp: <span className="font-semibold text-[var(--dv-text)]">{resultCount}</span> / {talents.length}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="-mr-1 rounded-full p-2 text-[var(--dv-text-secondary)] hover:bg-[var(--dv-bg-alt)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          <Section title="Giới tính diễn viên">
            <div className="flex rounded-full border border-[#d2d2d7] bg-white p-1">
              {(
                [
                  ['all', 'Tất cả'],
                  ['male', 'Nam'],
                  ['female', 'Nữ']
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set({ gender: id })}
                  className={`h-9 flex-1 rounded-full text-[14px] ${value.gender === id ? 'bg-[#1d1d1f] text-white' : 'text-[var(--dv-text-secondary)]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Section>
          <Section title="Độ tuổi">
            <Range min={value.ageMin} max={value.ageMax} onMin={v => set({ ageMin: v })} onMax={v => set({ ageMax: v })} unit="tuổi" len={2} />
          </Section>
          <Section title="Chiều cao">
            <Range min={value.hMin} max={value.hMax} onMin={v => set({ hMin: v })} onMax={v => set({ hMax: v })} unit="cm" len={3} />
          </Section>
          <Section title="Cân nặng">
            <Range min={value.wMin} max={value.wMax} onMin={v => set({ wMin: v })} onMax={v => set({ wMax: v })} unit="kg" len={3} />
          </Section>
          {skillSections.map(sec => {
            const picked = value.skills[sec.group] || [];
            return (
              <Dropdown key={sec.group} title={sec.title} count={picked.length}>
                <Chips
                  options={[...sec.main.map(o => ({ id: o, label: o })), ...(sec.hasOther ? [{ id: OTHER_SKILL, label: 'Khác' }] : [])]}
                  value={picked}
                  onToggle={id => set({ skills: { ...value.skills, [sec.group]: toggle(picked, id) } })}
                />
              </Dropdown>
            );
          })}
          <Dropdown title="Mức độ sẵn sàng cho vai diễn" count={value.willingness.length}>
            <Chips options={WILLINGNESS} value={value.willingness} onToggle={id => set({ willingness: toggle(value.willingness, id) })} />
          </Dropdown>
          {cities.length > 0 && (
            <Dropdown title="Sẵn sàng quay tại tỉnh thành" count={value.cities.length}>
              <Chips options={cities.map(c => ({ id: c, label: c }))} value={value.cities} onToggle={id => set({ cities: toggle(value.cities, id) })} />
            </Dropdown>
          )}
          {schools.length > 0 && (
            <Dropdown title="Nơi đào tạo diễn xuất" count={value.schools.length}>
              <Chips
                options={(allSchools ? schools : schools.slice(0, SCHOOLS_SHOWN)).map(x => ({ id: x, label: x }))}
                value={value.schools}
                onToggle={id => set({ schools: toggle(value.schools, id) })}
              />
              {schools.length > SCHOOLS_SHOWN && (
                <button type="button" onClick={() => setAllSchools(v => !v)} className="mt-3 text-[14px] font-semibold underline underline-offset-2">
                  {allSchools ? 'Thu gọn' : `Xem thêm ${schools.length - SCHOOLS_SHOWN} nơi đào tạo`}
                </button>
              )}
            </Dropdown>
          )}
        </div>

        <div className="flex gap-2 border-t border-[#f0f0f2] px-5 py-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => onChange(EMPTY_FILTER)} disabled={n === 0} className="dv-btn dv-btn-secondary disabled:opacity-40">
            <RotateCcw className="h-4 w-4" /> Xoá lọc
          </button>
          <button type="button" onClick={onClose} className="dv-btn dv-btn-primary flex-1">
            Xem {resultCount} diễn viên
          </button>
        </div>
      </div>
    </div>
  );
}
