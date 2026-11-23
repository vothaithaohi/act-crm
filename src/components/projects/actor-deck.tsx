'use client';

import React, { useMemo } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { TalentProfile } from '@/lib/types/crm';

// Deck hồ sơ diễn viên theo mẫu "Actor Profile Template": mỗi diễn viên 1 trang ngang 16:9.
// Tự điền tên, tuổi, chiều cao, cân nặng, phim đã đóng, tiếng Anh, ảnh; các ô đánh giá gõ trực tiếp trên trang rồi In / Lưu PDF.

const LEVEL_EN: Record<string, string> = { native: 'Native', fluent: 'Fluent', conversational: 'Conversational', basic: 'Basic', 'Bản ngữ': 'Native', 'Giao tiếp': 'Conversational', 'Cơ bản': 'Basic' };

function ageOf(dob?: string): string {
  if (!dob) return '';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a > 0 && a < 120 ? String(a) : '';
}
const heightText = (cm?: number) => (cm ? `${Math.floor(cm / 100)}m${String(cm % 100).padStart(2, '0')}` : '');

/** "Movie "A", "B"; TV series "C"; TVC "Vinamilk"…" */
function credits(t: TalentProfile): string {
  const e = t.acting_experience || ({} as TalentProfile['acting_experience']);
  const q = (s?: string) => (s && s.trim() ? `“${s.trim()}”` : '');
  const group = (label: string, items: string[]) => (items.filter(Boolean).length ? `${label} ${items.filter(Boolean).join(', ')}` : '');
  return [
    group('Movie', (e.feature_films || []).map(f => q(f.title))),
    group('TV series', (e.tv_shows || []).map(f => q(f.title))),
    group('Web drama', (e.web_dramas || []).map(f => q(f.title))),
    group('Short film', (e.short_films || []).map(f => q(f.title))),
    group('TVC', (e.commercials || []).map(c => q(c.brand))),
    group('MV', (e.music_videos || []).map(m => q([m.song, m.artist].filter(Boolean).join(' – '))))
  ]
    .filter(Boolean)
    .join('; ');
}

function english(t: TalentProfile): string {
  const l = (t.languages || []).find(x => /anh|english/i.test(x?.language || ''));
  if (!l) return '';
  const v = (l.level || '').toLowerCase();
  if (LEVEL_EN[l.level]) return LEVEL_EN[l.level];
  if (/bản ngữ|native/.test(v)) return 'Native';
  if (/trôi chảy|thành thạo|fluent|advanced/.test(v)) return 'Fluent';
  if (/giao tiếp|conversational|intermediate|khá/.test(v)) return 'Conversational';
  if (/cơ bản|basic|beginner/.test(v)) return 'Basic';
  return l.level || 'Yes';
}

function photos(t: TalentProfile): string[] {
  const list = [t.headshot_url, t.fullbody_url, t.compcard_url, ...(t.gallery || []).map(g => g?.url)].filter((u): u is string => !!u);
  return Array.from(new Set(list)).slice(0, 8);
}

/** Ô chữ gõ trực tiếp (để trống thì hiện [text] như mẫu). */
function Edit({ value, className = '' }: { value?: string; className?: string }) {
  return (
    <span contentEditable suppressContentEditableWarning className={`deck-edit outline-none ${className}`} data-ph="[text]">
      {value || ''}
    </span>
  );
}

function Slot({ src }: { src?: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[4px] border border-[#b5b5b5] bg-[#d9d9d9]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] text-[#777]">[Photo]</span>
      )}
    </div>
  );
}

function Page({ t }: { t: TalentProfile }) {
  const ph = photos(t);
  return (
    <section className="deck-page relative mx-auto bg-white text-[#111]" style={{ width: 1000, height: 562.5 }}>
      {/* Thông tin */}
      <div className="absolute left-[27px] top-[18px] w-[620px]">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.01em]">{t.full_name}</h1>
        <p className="mt-1 text-[12.5px]">
          <b>Age:</b> <Edit value={ageOf(t.dob)} /> <span className="mx-1">|</span> <b>Height:</b> <Edit value={heightText(t.height_cm)} /> <span className="mx-1">|</span>{' '}
          <b>Weight:</b> <Edit value={t.weight_kg ? `${t.weight_kg}kg` : ''} />
        </p>
        <div className="mt-1.5 border-t border-[#ccc] pt-1.5 text-[11px] leading-[1.45] text-[#444]">
          <b>Achievements, Credits:</b> <Edit value={credits(t)} />
        </div>
      </div>
      <div className="absolute left-[27px] top-[148px] flex w-[620px] text-[11px] leading-[1.7]">
        <div className="w-1/2 border-r border-[#ccc] pr-3 text-[#444]">
          <p>
            <b>Occupation:</b> <Edit className="font-semibold text-[#111]" />
          </p>
          <p>
            <b>English Proficiency:</b> <Edit className="font-semibold text-[#111]" value={english(t)} />
          </p>
          <p>
            <b>Personality Traits:</b> <Edit className="font-semibold text-[#111]" />
          </p>
        </div>
        <div className="w-1/2 pl-3">
          <p className="font-semibold text-[#444]">Rating (character compatibility)</p>
          <p>
            <b>English:</b> <Edit />
            /3 <span className="text-[#bbb]">|</span> <b>Personality:</b> <Edit />
            /3 <span className="text-[#bbb]">|</span> <b>Look:</b> <Edit />
            /3
          </p>
        </div>
      </div>
      {/* Ảnh: 2 ô trên phải + 6 ô hàng dưới */}
      <div className="absolute left-[670px] top-[8px] grid h-[226px] w-[316px] grid-cols-2 gap-[8px]">
        <Slot src={ph[0]} />
        <Slot src={ph[1]} />
      </div>
      <div className="absolute left-[12px] top-[245px] grid h-[226px] w-[974px] grid-cols-6 gap-[8px]">
        {[2, 3, 4, 5, 6, 7].map(i => (
          <Slot key={i} src={ph[i]} />
        ))}
      </div>
    </section>
  );
}

export function ActorDeck({ talents, title, onBack }: { talents: TalentProfile[]; title: string; onBack: () => void }) {
  const pages = useMemo(() => talents.filter(Boolean), [talents]);
  return (
    <div className="deck-root">
      <style>{`
        .deck-edit:empty:before { content: attr(data-ph); color: #555; }
        .deck-edit:focus { background: #fff7cc; }
        @media print {
          @page { size: 1000px 562.5px; margin: 0; }
          body * { visibility: hidden; }
          .deck-root, .deck-root * { visibility: visible; }
          .deck-root { position: absolute; left: 0; top: 0; }
          .deck-toolbar { display: none !important; }
          .deck-page { break-after: page; page-break-after: always; overflow: hidden; }
          .deck-list { padding: 0 !important; overflow: visible !important; }
          .deck-list > div { margin: 0 !important; box-shadow: none !important; }
          .deck-edit:focus { background: none; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="deck-toolbar sticky top-0 z-20 mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card/95 p-3 backdrop-blur">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">Deck hồ sơ · {title}</p>
          <p className="text-[11px] text-muted-foreground">
            {pages.length} diễn viên. Bấm vào chữ trên trang để sửa / điền (Occupation, Personality, Rating…). Xong bấm In / Lưu PDF, chọn &ldquo;Lưu dưới dạng PDF&rdquo;, bật &ldquo;Đồ hoạ nền&rdquo;.
          </p>
        </div>
        <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1d1d1f] px-4 text-xs font-semibold text-white hover:bg-black">
          <Printer className="h-4 w-4" /> In / Lưu PDF
        </button>
      </div>
      {pages.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Không có diễn viên nào để xuất.</p>
      ) : (
        <div className="deck-list space-y-6 overflow-x-auto pb-10">
          {pages.map(t => (
            <div key={t.id} className="w-[1000px] mx-auto shadow-[0_2px_16px_rgba(0,0,0,0.12)]">
              <Page t={t} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
