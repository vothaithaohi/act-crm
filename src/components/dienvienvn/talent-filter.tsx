'use client';

import { useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { PublicTalent } from '@/lib/dienvienvn/public-talents';

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

const ACT_LEVELS = [
  { id: 'ACT4', label: 'ACT 4', badge: 'Masterclass' },
  { id: 'ACT3', label: 'ACT 3', badge: 'Ống kính' },
  { id: 'ACT2', label: 'ACT 2', badge: 'Tâm lý' },
  { id: 'ACT1', label: 'ACT 1', badge: 'Căn bản' }
];

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

/** Nhóm kỹ năng (tên nhóm trùng skillGroups) → tiêu đề trong bộ lọc. */
const SKILL_SECTIONS: { group: string; title: string }[] = [
  { group: 'Giọng vùng miền', title: 'Giọng nói vùng miền' },
  { group: 'Ngoại ngữ', title: 'Ngoại ngữ diễn xuất' },
  { group: 'Võ thuật', title: 'Võ thuật & hành động' },
  { group: 'Nhạc cụ', title: 'Nhạc cụ biểu diễn' },
  { group: 'Nhảy', title: 'Kỹ năng vũ đạo & nhảy' },
  { group: 'Thể thao', title: 'Kỹ năng thể thao' },
  { group: 'Ca hát', title: 'Ca hát' }
];

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
  return list.filter(t => {
    if (f.gender !== 'all' && t.gender !== f.gender) return false;
    if (!inRange(t.age, f.ageMin, f.ageMax)) return false;
    if (!inRange(t.height_cm, f.hMin, f.hMax)) return false;
    if (!inRange(t.weight_kg, f.wMin, f.wMax)) return false;
    if (f.schools.length && !t.trainings.some(x => f.schools.includes(schoolOf(x)))) return false;
    if (f.actLevels.length && !f.actLevels.some(l => t.act_levels.includes(l))) return false;
    for (const [group, picked] of Object.entries(f.skills)) {
      if (!picked.length) continue;
      const items = t.skills.find(g => g.group === group)?.items || [];
      if (!picked.some(p => items.includes(p))) return false;
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
    f.actLevels.length +
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
  const schools = optionsOf(talents.map(t => t.trainings.map(schoolOf)));
  const cities = optionsOf(talents.map(t => t.work_cities));
  const skillSections = SKILL_SECTIONS.map(s => ({ ...s, options: optionsOf(talents.map(t => t.skills.find(g => g.group === s.group)?.items || [])) })).filter(s => s.options.length);
  const n = activeCount(value);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bộ lọc diễn viên"
        onClick={e => e.stopPropagation()}
        className="flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl"
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
          {schools.length > 0 && (
            <Section title="Nơi đào tạo diễn xuất">
              <Chips options={schools.map(s => ({ id: s, label: s }))} value={value.schools} onToggle={id => set({ schools: toggle(value.schools, id) })} />
            </Section>
          )}
          <Section title="Lớp ACT đã học">
            <Chips options={ACT_LEVELS} value={value.actLevels} onToggle={id => set({ actLevels: toggle(value.actLevels, id) })} />
          </Section>
          {skillSections.map(s => (
            <Section key={s.group} title={s.title}>
              <Chips
                options={s.options.map(o => ({ id: o, label: o }))}
                value={value.skills[s.group] || []}
                onToggle={id => set({ skills: { ...value.skills, [s.group]: toggle(value.skills[s.group] || [], id) } })}
              />
            </Section>
          ))}
          <Section title="Mức độ sẵn sàng cho vai diễn">
            <Chips options={WILLINGNESS} value={value.willingness} onToggle={id => set({ willingness: toggle(value.willingness, id) })} />
          </Section>
          {cities.length > 0 && (
            <Section title="Sẵn sàng quay tại tỉnh thành">
              <Chips options={cities.map(c => ({ id: c, label: c }))} value={value.cities} onToggle={id => set({ cities: toggle(value.cities, id) })} />
            </Section>
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
