'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Download, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
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
function Edit({ value, className = '', field }: { value?: string; className?: string; field: string }) {
  return (
    <span contentEditable suppressContentEditableWarning data-field={field} className={`deck-edit outline-none ${className}`} data-ph="[text]">
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

/** Self-tape diễn viên nộp cho dự án: theo tên yêu cầu (url trống = yêu cầu bắt buộc chưa gửi). */
export type TapeLink = { label: string; url?: string };
/** Ô gõ tay giữ lại khi bấm Làm mới */
const MANUAL_FIELDS = ['occupation', 'personality', 'rEnglish', 'rPersonality', 'rLook'] as const;
type Manual = Partial<Record<(typeof MANUAL_FIELDS)[number], string>>;

function Page({ t, tapes, manual }: { t: TalentProfile; tapes: TapeLink[]; manual: Manual }) {
  const ph = photos(t);
  return (
    <section data-tid={t.id} className="deck-page relative mx-auto bg-white text-[#111]" style={{ width: 1000, height: 562.5 }}>
      {/* Thông tin */}
      <div className="absolute left-[27px] top-[18px] w-[620px]">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.01em]">{t.full_name}</h1>
        <p className="mt-1 text-[12.5px]">
          <b>Age:</b> <Edit field="age" value={ageOf(t.dob)} /> <span className="mx-1">|</span> <b>Height:</b> <Edit field="height" value={heightText(t.height_cm)} /> <span className="mx-1">|</span>{' '}
          <b>Weight:</b> <Edit field="weight" value={t.weight_kg ? `${t.weight_kg}kg` : ''} />
        </p>
        <div className="mt-1.5 border-t border-[#ccc] pt-1.5 text-[11px] leading-[1.45] text-[#444]">
          <b>Achievements, Credits:</b> <Edit field="credits" value={credits(t)} />
        </div>
      </div>
      <div className="absolute left-[27px] top-[148px] flex w-[620px] text-[11px] leading-[1.7]">
        <div className="w-1/2 border-r border-[#ccc] pr-3 text-[#444]">
          <p>
            <b>Occupation:</b> <Edit field="occupation" className="font-semibold text-[#111]" value={manual.occupation} />
          </p>
          <p>
            <b>English Proficiency:</b> <Edit field="english" className="font-semibold text-[#111]" value={english(t)} />
          </p>
          <p>
            <b>Personality Traits:</b> <Edit field="personality" className="font-semibold text-[#111]" value={manual.personality} />
          </p>
        </div>
        <div className="w-1/2 pl-3">
          <p className="font-semibold text-[#444]">Rating (character compatibility)</p>
          <p>
            <b>English:</b> <Edit field="rEnglish" value={manual.rEnglish} />
            /3 <span className="text-[#bbb]">|</span> <b>Personality:</b> <Edit field="rPersonality" value={manual.rPersonality} />
            /3 <span className="text-[#bbb]">|</span> <b>Look:</b> <Edit field="rLook" value={manual.rLook} />
            /3
          </p>
        </div>
      </div>
      {/* Self-tape đã nộp cho dự án (bấm mở video) */}
      <p className="absolute left-[27px] top-[217px] w-[620px] truncate text-[10.5px] text-[#444]">
        <b className="text-[#111]">Self-tape:</b>{' '}
        {tapes.length === 0 ? (
          <span className="text-[#888]">chưa gửi</span>
        ) : (
          tapes.map((x, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="mx-1 text-[#bbb]">·</span>}
              {x.url ? (
                <a href={x.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0b57d0] underline underline-offset-2">
                  {x.label}
                </a>
              ) : (
                <span className="text-[#b00020]">{x.label}: chưa gửi</span>
              )}
            </React.Fragment>
          ))
        )}
      </p>
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

/* ---------------- Xuất PowerPoint (.pptx): mở bằng PowerPoint hoặc Google Slides ---------------- */

/** Ảnh → cắt đúng khung (giống object-cover) → dữ liệu JPEG; không tải được thì null (để khung xám). */
async function croppedImage(url: string, w: number, h: number): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const bmp = await createImageBitmap(await res.blob());
    const W = Math.round(w * 200);
    const H = Math.round(h * 200);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const scale = Math.max(W / bmp.width, H / bmp.height);
    const dw = bmp.width * scale;
    const dh = bmp.height * scale;
    ctx.drawImage(bmp, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return canvas.toDataURL('image/jpeg', 0.86);
  } catch {
    return null;
  }
}

async function exportPptx(talents: TalentProfile[], title: string, tapesOf: (id: string) => TapeLink[]) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9'; // 10 x 5.625 in (trang deck 1000 x 562,5 px → chia 100)
  const font = 'Arial';
  for (const t of talents) {
    const root = document.querySelector(`[data-tid="${t.id}"]`);
    const v = (k: string) => (root?.querySelector(`[data-field="${k}"]`)?.textContent || '').trim() || '[text]';
    const s = pptx.addSlide();
    s.background = { color: 'FFFFFF' };
    s.addText(t.full_name, { x: 0.22, y: 0.12, w: 6.3, h: 0.5, fontFace: font, fontSize: 24, bold: true, color: '111111', margin: 0 });
    const lab = (text: string) => ({ text, options: { bold: true } });
    s.addText([lab('Age: '), { text: v('age') }, { text: '  |  ' }, lab('Height: '), { text: v('height') }, { text: '  |  ' }, lab('Weight: '), { text: v('weight') }], {
      x: 0.22, y: 0.62, w: 6.3, h: 0.26, fontFace: font, fontSize: 10, color: '111111', margin: 0
    });
    s.addShape(pptx.ShapeType.line, { x: 0.27, y: 0.92, w: 6.2, h: 0, line: { color: 'CCCCCC', width: 0.75 } });
    s.addText([lab('Achievements, Credits: '), { text: v('credits') }], { x: 0.22, y: 0.96, w: 6.3, h: 0.5, fontFace: font, fontSize: 8.5, color: '444444', valign: 'top', margin: 0 });
    s.addText(
      [
        lab('Occupation: '), { text: v('occupation'), options: { breakLine: true } },
        lab('English Proficiency: '), { text: v('english'), options: { breakLine: true } },
        lab('Personality Traits: '), { text: v('personality') }
      ],
      { x: 0.22, y: 1.5, w: 3.0, h: 0.62, fontFace: font, fontSize: 8.5, color: '333333', valign: 'top', margin: 0, lineSpacingMultiple: 1.2 }
    );
    s.addShape(pptx.ShapeType.line, { x: 3.37, y: 1.5, w: 0, h: 0.65, line: { color: 'CCCCCC', width: 0.75 } });
    s.addText(
      [
        { text: 'Rating (character compatibility)', options: { bold: true, color: '444444', breakLine: true } },
        lab('English: '), { text: `${v('rEnglish')}/3  |  ` }, lab('Personality: '), { text: `${v('rPersonality')}/3  |  ` }, lab('Look: '), { text: `${v('rLook')}/3` }
      ],
      { x: 3.5, y: 1.5, w: 3.0, h: 0.62, fontFace: font, fontSize: 8.5, color: '111111', valign: 'top', margin: 0, lineSpacingMultiple: 1.2 }
    );
    // Self-tape: tên từng yêu cầu là link bấm được
    const tapes = tapesOf(t.id);
    s.addText(
      [
        lab('Self-tape: '),
        ...(tapes.length
          ? tapes.flatMap((x, i) => [
              ...(i ? [{ text: '  ·  ', options: { color: 'BBBBBB' } }] : []),
              x.url
                ? { text: x.label, options: { hyperlink: { url: x.url }, color: '0B57D0', underline: { style: 'sng' as const } } }
                : { text: `${x.label}: chưa gửi`, options: { color: 'B00020' } }
            ])
          : [{ text: 'chưa gửi', options: { color: '888888' } }])
      ],
      { x: 0.22, y: 2.13, w: 6.3, h: 0.26, fontFace: font, fontSize: 8.5, color: '444444', margin: 0, valign: 'middle' }
    );
    // 2 ô ảnh trên phải + 6 ô hàng dưới (giống mẫu)
    const slots = [
      { x: 6.7, y: 0.08 }, { x: 8.32, y: 0.08 },
      ...[0, 1, 2, 3, 4, 5].map(i => ({ x: 0.12 + i * 1.632, y: 2.45 }))
    ];
    const ph = photos(t);
    const imgs = await Promise.all(slots.map((_, i) => (ph[i] ? croppedImage(ph[i], 1.54, 2.26) : Promise.resolve(null))));
    slots.forEach((p, i) => {
      if (imgs[i]) s.addImage({ data: imgs[i] as string, x: p.x, y: p.y, w: 1.54, h: 2.26 });
      else {
        s.addShape(pptx.ShapeType.rect, { x: p.x, y: p.y, w: 1.54, h: 2.26, fill: { color: 'D9D9D9' }, line: { color: 'B5B5B5', width: 0.75 } });
        s.addText('[Photo]', { x: p.x, y: p.y, w: 1.54, h: 2.26, align: 'center', valign: 'middle', fontFace: font, fontSize: 9, color: '777777' });
      }
    });
  }
  const safe = title.replace(/[\\/:*?"<>|]/g, ' ').trim() || 'Du an';
  await pptx.writeFile({ fileName: `Deck ho so - ${safe}.pptx`, compression: true });
}

export function ActorDeck({
  talents,
  title,
  onBack,
  tapesOf,
  onRefresh
}: {
  talents: TalentProfile[];
  title: string;
  onBack: () => void;
  tapesOf: (talentId: string) => TapeLink[];
  /** Tải lại hồ sơ + đơn ứng tuyển mới nhất */
  onRefresh: () => Promise<void>;
}) {
  const pages = useMemo(() => talents.filter(Boolean), [talents]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [round, setRound] = useState(0);
  const [manual, setManual] = useState<Record<string, Manual>>({});
  /** Làm mới: giữ các ô gõ tay, lấy lại self-tape / ảnh / thông tin mới nhất */
  const refresh = async () => {
    const keep: Record<string, Manual> = {};
    document.querySelectorAll<HTMLElement>('[data-tid]').forEach(root => {
      const m: Manual = {};
      MANUAL_FIELDS.forEach(f => {
        const txt = (root.querySelector(`[data-field="${f}"]`)?.textContent || '').trim();
        if (txt) m[f] = txt;
      });
      keep[root.dataset.tid as string] = m;
    });
    setRefreshing(true);
    try {
      await onRefresh();
      setManual(keep);
      setRound(r => r + 1); // dựng lại trang với dữ liệu mới
      setUpdatedAt(new Date());
      toast.success('Đã cập nhật self-tape và hồ sơ mới nhất');
    } catch {
      toast.error('Không tải lại được. Vui lòng thử lại.');
    } finally {
      setRefreshing(false);
    }
  };
  const download = async () => {
    setBusy(true);
    try {
      await exportPptx(pages, title, tapesOf);
      toast.success('Đã tải file PowerPoint', { description: 'Mở bằng PowerPoint, hoặc tải lên Google Drive rồi mở bằng Google Slides.' });
    } catch (e) {
      console.error(e);
      toast.error('Không tạo được file PowerPoint. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };
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
            Cập nhật lúc {updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {pages.length} diễn viên. Có thể bấm vào chữ trên trang để sửa / điền trước (Occupation, Personality, Rating…), rồi bấm Tải PowerPoint. Mở file bằng PowerPoint, hoặc tải lên Google Drive → Mở bằng Google Trang trình bày.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing || busy}
          title="Tải lại self-tape, ảnh, thông tin mới nhất (giữ nguyên các ô đã gõ tay)"
          className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Đang làm mới…' : 'Làm mới'}
        </button>
        <button onClick={download} disabled={busy || refreshing || !pages.length} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1d1d1f] px-4 text-xs font-semibold text-white hover:bg-black disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {busy ? 'Đang tạo file…' : 'Tải PowerPoint (.pptx)'}
        </button>
      </div>
      {pages.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Không có diễn viên nào để xuất.</p>
      ) : (
        <div className="deck-list space-y-6 overflow-x-auto pb-10">
          {pages.map(t => (
            <div key={`${t.id}-${round}`} className="w-[1000px] mx-auto shadow-[0_2px_16px_rgba(0,0,0,0.12)]">
              <Page t={t} tapes={tapesOf(t.id)} manual={manual[t.id] || {}} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
