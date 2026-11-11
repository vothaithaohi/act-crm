'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Mail, MapPin, Phone, Play, UserRound, Video, X, ZoomIn } from 'lucide-react';
import type { PublicTalent } from '@/lib/dienvienvn/public-talents';
import type { PartnerTalent } from '@/lib/dienvienvn/partners';
import { youtubeId } from '@/lib/dienvienvn/selftapes';
import { useDvvnHref } from './base-path';
import { WILLINGNESS } from './talent-filter';

const genderText = (g: PublicTalent['gender']) => (g === 'female' ? 'Nữ' : g === 'male' ? 'Nam' : g === 'other' ? 'Khác' : '');

/* ---------------- Ảnh & video ---------------- */
type Media =
  | { kind: 'image'; url: string; label: string }
  | { kind: 'video'; url: string; label: string; yt: string | null };

function mediaOf(t: PublicTalent): Media[] {
  return [
    ...t.photos.map(p => ({ kind: 'image' as const, url: p.url, label: p.label })),
    ...t.selftapes.map((v, k) => ({ kind: 'video' as const, url: v.url, label: v.title || `Self-tape ${k + 1}`, yt: youtubeId(v.url) })),
    ...t.gallery.map((g, k) => ({ kind: 'image' as const, url: g.url, label: g.caption || `Ảnh hoạt động ${k + 1}` }))
  ];
}

const thumbOf = (m: Media) => (m.kind === 'image' ? m.url : m.yt ? `https://i.ytimg.com/vi/${m.yt}/hqdefault.jpg` : null);

/** Xem ảnh / video phóng to: mũi tên hoặc phím ← → để chuyển, bấm vào ảnh để zoom kỹ, Esc để đóng. */
function Lightbox({ items, index, onIndex, onClose }: { items: Media[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const n = items.length;
  const m = items[index];
  const go = useCallback((d: number) => {
    setZoom(null);
    onIndex((index + d + n) % n);
  }, [index, n, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    // capture: Esc chỉ đóng khung xem ảnh, không đóng luôn cửa sổ hồ sơ
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [go, onClose]);

  // Gắn thẳng vào <body>: phủ toàn màn hình (không bị giới hạn trong cửa sổ hồ sơ đang trượt)
  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/95 text-white" onClick={onClose} role="dialog" aria-modal="true" aria-label="Xem ảnh">
      <div className="flex items-center justify-between px-4 py-3" onClick={e => e.stopPropagation()}>
        <p className="truncate text-[14px] text-white/80">
          {m.label} · {index + 1}/{n}
        </p>
        <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full p-2 hover:bg-white/10">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-6" onClick={e => e.stopPropagation()}>
        {m.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.url}
            alt={m.label}
            onClick={e => {
              if (zoom) return setZoom(null);
              const r = (e.currentTarget as HTMLImageElement).getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            className={`max-h-full max-w-full select-none object-contain transition-transform duration-300 ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            style={zoom ? { transform: 'scale(2.2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : m.yt ? (
          <div className="aspect-video w-full max-w-[1100px] overflow-hidden rounded-[12px] bg-black">
            <iframe src={`https://www.youtube-nocookie.com/embed/${m.yt}?autoplay=1`} title={m.label} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="h-full w-full" />
          </div>
        ) : (
          <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-semibold text-[#1d1d1f]">
            <Video className="h-5 w-5" /> Mở video {m.label}
          </a>
        )}
        {n > 1 && (
          <>
            <button type="button" aria-label="Trước" onClick={() => go(-1)} className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" aria-label="Tiếp" onClick={() => go(1)} className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      {m.kind === 'image' && <p className="pb-4 text-center text-[12px] text-white/50">{zoom ? 'Bấm vào ảnh để thu nhỏ' : 'Bấm vào ảnh để phóng to chi tiết'}</p>}
    </div>,
    document.body
  );
}

function MediaTile({ m, onOpen, big = false }: { m: Media; onOpen: () => void; big?: boolean }) {
  const thumb = thumbOf(m);
  return (
    <button type="button" onClick={onOpen} className={`group relative block h-full w-full overflow-hidden rounded-[16px] bg-[#1d1d1f] ${big ? '' : ''}`} aria-label={`Xem ${m.label}`}>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={m.label} loading="lazy" className={`h-full w-full ${m.kind === 'image' ? 'object-cover object-[50%_20%]' : 'object-cover'} transition-transform duration-500 group-hover:scale-[1.03]`} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-white/40">
          <Video className="h-8 w-8" />
        </span>
      )}
      {m.kind === 'video' ? (
        <>
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1d1d1f] shadow-lg">
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
          </span>
          <span className="absolute inset-x-3 bottom-3 truncate text-left text-[13px] font-semibold text-white">{m.label}</span>
        </>
      ) : (
        <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          <ZoomIn className="h-4 w-4" />
        </span>
      )}
      {big && m.kind === 'image' && <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">{m.label}</span>}
    </button>
  );
}

/** Khối ảnh & video đầu hồ sơ (kiểu Backstage): ảnh chính lớn + lưới 2×2, "Xem thêm" mở phần còn lại. */
function MediaGallery({ talent }: { talent: PublicTalent }) {
  const items = mediaOf(talent);
  const [open, setOpen] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  if (!items.length) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-[20px] bg-[#e8e8ed] text-[#aeaeb2]">
        <UserRound className="h-14 w-14" strokeWidth={1.2} />
      </div>
    );
  }
  const side = items.slice(1, 5);
  const rest = items.slice(5);
  return (
    <div>
      <div className={`grid gap-2.5 ${side.length ? 'md:grid-cols-[1.15fr_1fr]' : ''}`}>
        <div className="aspect-[4/5] max-h-[62vh] w-full md:aspect-auto md:h-[440px] md:max-h-none">
          <MediaTile m={items[0]} big onOpen={() => setOpen(0)} />
        </div>
        {/* Điện thoại: 1 hàng ảnh nhỏ dưới ảnh chính; máy tính: lưới 2×2 bên phải */}
        {side.length > 0 && (
          <div className={`grid grid-cols-4 gap-2 md:h-[440px] md:gap-2.5 ${side.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'} ${side.length > 2 ? 'md:grid-rows-2' : ''}`}>
            {side.map((m, k) => (
              <div key={m.url + k} className={`aspect-[3/4] md:aspect-auto ${side.length === 3 && k === 2 ? 'md:col-span-2' : ''}`}>
                <MediaTile m={m} onOpen={() => setOpen(k + 1)} />
              </div>
            ))}
          </div>
        )}
      </div>
      {rest.length > 0 && (
        <>
          {more && (
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {rest.map((m, k) => (
                <div key={m.url + k} className="aspect-[4/5]">
                  <MediaTile m={m} onOpen={() => setOpen(k + 5)} />
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => setMore(v => !v)} className="dv-btn dv-btn-secondary !h-9 !px-4 !py-0 text-[14px]">
              <ChevronDown className={`h-4 w-4 transition-transform ${more ? 'rotate-180' : ''}`} /> {more ? 'Thu gọn' : `Xem thêm ảnh & video (${rest.length})`}
            </button>
          </div>
        </>
      )}
      {open !== null && <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ---------------- Các khối thông tin ---------------- */
/** Tiêu đề mục: chữ đậm + đường kẻ mảnh có đoạn nhấn đậm (kiểu Backstage). */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="relative h-px bg-[#e5e5ea]">
        <span className="absolute left-0 top-0 h-[2px] w-24 bg-[#1d1d1f]" />
      </div>
      <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.01em]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Attr({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--dv-text-tertiary)]">{label}</p>
      <div className="mt-1 space-y-0.5 text-[15px]">
        {values.length ? values.map(v => <p key={v}>{v}</p>) : <p className="text-[var(--dv-text-tertiary)]">—</p>}
      </div>
    </div>
  );
}

/** "Lật Mặt 7 · vai Hải · Vai phụ · 2024" → năm / tên / chi tiết. */
function splitCredit(item: string) {
  const parts = item.split(' · ');
  const year = /^\d{4}$/.test(parts[parts.length - 1] || '') ? (parts.pop() as string) : '';
  return { year, title: parts[0] || item, detail: parts.slice(1).join(' · ') };
}

/** Khung bên phải: nút Liên hệ (công khai) hoặc liên hệ của diễn viên (đối tác đã duyệt). */
function ContactCard({ talent, partner }: { talent: PublicTalent; partner?: PartnerTalent | null }) {
  const href = useDvvnHref();
  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {partner ? (
        <>
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">Liên hệ diễn viên</p>
          <div className="mt-3 space-y-2">
            {partner.phone && (
              <a href={`tel:${partner.phone.replace(/[^\d+]/g, '')}`} className="dv-btn dv-btn-primary w-full !h-11 !py-0 text-[15px]">
                <Phone className="h-4 w-4" /> {partner.phone}
              </a>
            )}
            {partner.email && (
              <a href={`mailto:${partner.email}`} className="dv-btn dv-btn-secondary w-full !h-11 !py-0 text-[14px]">
                <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{partner.email}</span>
              </a>
            )}
            {!partner.phone && !partner.email && <p className="text-[14px] text-[var(--dv-text-secondary)]">Diễn viên chưa cập nhật liên hệ.</p>}
          </div>
        </>
      ) : (
        <>
          <p className="text-[17px] font-semibold">Muốn mời diễn viên này casting?</p>
          <p className="mt-1 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">Thông tin liên hệ chỉ hiển thị cho đối tác của DienVienVN.</p>
          <Link href={href(`/doi-tac/dang-ky?next=${encodeURIComponent(href(`/doi-tac/${talent.username}`))}`)} className="dv-btn dv-btn-primary mt-4 w-full !h-11 !py-0 text-[15px]">
            Liên hệ
          </Link>
        </>
      )}
    </div>
  );
}

/**
 * Hồ sơ diễn viên (cửa sổ trượt và trang riêng), bố cục tham khảo Backstage, giữ đúng cấp thông tin đã chốt:
 * công khai: tuổi (không ngày sinh), chiều cao, cân nặng; ẩn địa chỉ, số đo 3 vòng, size giày, liên hệ.
 * partner: đối tác đã duyệt đang đăng nhập → thêm liên hệ, số đo 3 vòng, size giày.
 */
export function TalentProfileBody({ talent, partner }: { talent: PublicTalent; partner?: PartnerTalent | null }) {
  const willingness = talent.willingness.map(id => WILLINGNESS.find(w => w.id === id)?.label).filter(Boolean) as string[];
  const isAct = talent.trainings.some(t => /ACT Academy/i.test(t));
  const age = partner?.age ?? talent.age;
  const credits = talent.experience.reduce((n, g) => n + g.items.length, 0);
  const subtitle = [age != null ? `${age} tuổi` : '', genderText(talent.gender), talent.work_cities[0] || ''].filter(Boolean);
  const badges = [
    isAct ? { icon: Award, title: 'Học viên ACT Academy', desc: 'Đào tạo diễn xuất bài bản' } : null,
    credits >= 3 ? { icon: Clapperboard, title: 'Nhiều kinh nghiệm', desc: `Đã tham gia ${credits} dự án` } : null,
    talent.selftapes.length ? { icon: Video, title: 'Có self-tape', desc: 'Xem diễn thử ngay trên hồ sơ' } : null
  ].filter(Boolean) as { icon: typeof Award; title: string; desc: string }[];
  const measures = [
    talent.height_cm ? `${talent.height_cm} cm (Chiều cao)` : '',
    (partner?.weight_kg ?? talent.weight_kg) ? `${partner?.weight_kg ?? talent.weight_kg} kg (Cân nặng)` : '',
    ...(partner
      ? [
          [partner.chest_cm, partner.waist_cm, partner.hip_cm].some(Boolean) ? `${[partner.chest_cm, partner.waist_cm, partner.hip_cm].map(v => v || '?').join(' - ')} (3 vòng)` : '',
          partner.shoe_size ? `${partner.shoe_size} (Size giày)` : ''
        ]
      : [])
  ].filter(Boolean);

  return (
    <div className="space-y-7">
      <MediaGallery talent={talent} />

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          <div>
            <h2 className="dv-display text-[32px] font-semibold leading-[1.1] md:text-[38px]">{talent.name}</h2>
            {subtitle.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[15px] text-[var(--dv-text-secondary)]">
                {subtitle.map((s, k) => (
                  <span key={s} className="inline-flex items-center gap-1">
                    {k > 0 && <span className="text-[#c7c7cc]">•</span>}
                    {k === subtitle.length - 1 && talent.work_cities[0] === s && <MapPin className="h-3.5 w-3.5" />}
                    {s}
                  </span>
                ))}
              </p>
            )}
            {badges.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {badges.map(b => (
                  <div key={b.title} className="rounded-[14px] border border-[#e5e5ea] bg-white p-3.5">
                    <p className="flex items-center gap-2 text-[14px] font-semibold">
                      <b.icon className="h-4 w-4 text-[#b8892f]" /> {b.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--dv-text-secondary)]">{b.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Khung liên hệ trên điện thoại: ngay dưới tên */}
          <div className="lg:hidden">
            <ContactCard talent={talent} partner={partner} />
          </div>

          <Section title="Ngoại hình">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Attr label="Số đo" values={measures} />
              <Attr label="Độ tuổi" values={age != null ? [`${age} tuổi`] : []} />
              <Attr label="Giới tính" values={genderText(talent.gender) ? [genderText(talent.gender)] : []} />
            </div>
          </Section>

          {talent.experience.length > 0 && (
            <Section title="Kinh nghiệm diễn xuất">
              <div className="space-y-6">
                {talent.experience.map(g => (
                  <div key={g.group}>
                    <p className="flex items-center gap-2 text-[16px] font-semibold">
                      <Clapperboard className="h-4 w-4 text-[var(--dv-text-secondary)]" /> {g.group}
                    </p>
                    <ul className="mt-2 divide-y divide-[#ececf0] border-t border-[#ececf0]">
                      {g.items.map(item => {
                        const c = splitCredit(item);
                        return (
                          <li key={item} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 py-3 text-[14px] sm:grid-cols-[64px_minmax(0,1fr)]">
                            <span className="pt-0.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--dv-text-tertiary)]">{c.year || '—'}</span>
                            <span className="min-w-0">
                              <span className="block font-semibold">{c.title}</span>
                              {c.detail && <span className="block text-[var(--dv-text-secondary)]">{c.detail}</span>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {talent.skills.length > 0 && (
            <Section title="Kỹ năng & ngoại ngữ">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {talent.skills.map(g => (
                  <div key={g.group}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--dv-text-tertiary)]">{g.group}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.items.map(item => (
                        <span key={item} className="rounded-full border border-[#e5e5ea] bg-white px-3 py-1 text-[14px]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(willingness.length > 0 || talent.work_cities.length > 0) && (
            <Section title="Định hướng & mức độ sẵn sàng vai diễn">
              {willingness.length > 0 && (
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {willingness.map(w => (
                    <li key={w} className="text-[15px]">
                      ✓ {w}
                    </li>
                  ))}
                </ul>
              )}
              {talent.work_cities.length > 0 && (
                <p className="mt-3 text-[15px]">
                  <span className="text-[var(--dv-text-secondary)]">Sẵn sàng quay tại: </span>
                  {talent.work_cities.join(', ')}
                </p>
              )}
            </Section>
          )}
        </div>

        {/* Cột phải (máy tính): dính khi cuộn */}
        <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <div className="hidden lg:block">
            <ContactCard talent={talent} partner={partner} />
          </div>
          {talent.trainings.length > 0 && (
            <div>
              <div className="relative h-px bg-[#e5e5ea]">
                <span className="absolute left-0 top-0 h-[2px] w-16 bg-[#1d1d1f]" />
              </div>
              <p className="mt-3 text-[17px] font-semibold">Đào tạo diễn xuất</p>
              <ul className="mt-2 space-y-1.5 text-[14px] leading-[1.45]">
                {talent.trainings.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
