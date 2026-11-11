'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, Phone, UserRound, Video } from 'lucide-react';
import type { PublicTalent } from '@/lib/dienvienvn/public-talents';
import type { PartnerTalent } from '@/lib/dienvienvn/partners';
import { youtubeId } from '@/lib/dienvienvn/selftapes';
import { useDvvnHref } from './base-path';
import { WILLINGNESS } from './talent-filter';

const genderText = (g: PublicTalent['gender']) => (g === 'female' ? 'Nữ' : g === 'male' ? 'Nam' : g === 'other' ? 'Khác' : '');

/** Ảnh chân dung / toàn thân / góc nghiêng, bấm qua lại. */
function PhotoCarousel({ talent }: { talent: PublicTalent }) {
  const [i, setI] = useState(0);
  const photos = talent.photos;
  const n = photos.length;
  const current = photos[Math.min(i, Math.max(n - 1, 0))];
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] bg-[#e8e8ed]">
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current.url} alt={`${talent.name} — ${current.label}`} className="h-full w-full object-cover object-top" />
      ) : (
        <div className="flex h-full items-center justify-center text-[#aeaeb2]">
          <UserRound className="h-14 w-14" strokeWidth={1.2} />
        </div>
      )}
      {current && (
        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">
          {current.label} · {Math.min(i, n - 1) + 1}/{n}
        </span>
      )}
      {n > 1 && (
        <>
          <button type="button" aria-label="Ảnh trước" onClick={() => setI((i - 1 + n) % n)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 backdrop-blur hover:bg-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Ảnh tiếp theo" onClick={() => setI((i + 1) % n)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 backdrop-blur hover:bg-white">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur">
            {photos.map((p, k) => (
              <button
                key={p.url}
                type="button"
                aria-label={`Xem ảnh ${k + 1}: ${p.label}`}
                aria-current={k === i}
                onClick={() => setI(k)}
                className={`h-2 rounded-full transition-all ${k === i ? 'w-5 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Phần bị ẩn (liên hệ, số đo…): mời đăng ký / đăng nhập đối tác. */
function InviteCta({ username }: { username: string }) {
  const href = useDvvnHref();
  return (
    <div className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[17px] font-semibold">Muốn mời diễn viên này casting?</p>
        <p className="mt-0.5 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">Thông tin liên hệ chỉ hiển thị cho đối tác của DienVienVN.</p>
      </div>
      <Link href={href(`/doi-tac/dang-ky?next=${encodeURIComponent(href(`/doi-tac/${username}`))}`)} className="dv-btn dv-btn-primary !h-10 shrink-0 !py-0 text-[14px]">
        Liên hệ
      </Link>
    </div>
  );
}

function Section({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] bg-white p-5 md:p-6">
      <h3 className="border-b border-[#f0f0f2] pb-3 text-[16px] font-semibold">
        Phần {no}: {title}
      </h3>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[13px] text-[var(--dv-text-secondary)]">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold">{value || '—'}</p>
    </div>
  );
}

/**
 * Hồ sơ diễn viên theo bố cục trang hồ sơ trong CRM, ở cấp thông tin công khai:
 * chỉ hiện tuổi (không ngày sinh), chiều cao; ẩn địa chỉ, cân nặng, số đo 3 vòng, size giày và liên hệ.
 * partner: đối tác đã duyệt đang đăng nhập → hiện thêm liên hệ và số đo (cấp đối tác).
 */
export function TalentProfileBody({ talent, partner }: { talent: PublicTalent; partner?: PartnerTalent | null }) {
  const willingness = talent.willingness.map(id => WILLINGNESS.find(w => w.id === id)?.label).filter(Boolean) as string[];
  const isAct = talent.trainings.some(t => /ACT Academy/i.test(t));
  const age = partner?.age ?? talent.age;
  let no = 0;
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:gap-6">
      <div className="space-y-4 md:sticky md:top-4 md:self-start">
        <PhotoCarousel talent={talent} />
        {!partner && <InviteCta username={talent.username} />}
      </div>

      <div className="space-y-4">
        <Section no={++no} title="Thông tin cá nhân">
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Họ và tên" value={talent.name} />
            <Fact label="Tuổi" value={age != null ? `${age} tuổi` : ''} />
            <Fact label="Giới tính" value={genderText(talent.gender)} />
            {isAct && <Fact label="Đào tạo" value="ACT Academy" />}
          </div>
          {partner && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f0f0f2] pt-4">
              {partner.phone && (
                <a href={`tel:${partner.phone.replace(/[^\d+]/g, '')}`} className="dv-btn dv-btn-primary !h-10 !py-0 text-[14px]">
                  <Phone className="h-4 w-4" /> {partner.phone}
                </a>
              )}
              {partner.email && (
                <a href={`mailto:${partner.email}`} className="dv-btn dv-btn-secondary !h-10 !py-0 text-[14px]">
                  <Mail className="h-4 w-4" /> {partner.email}
                </a>
              )}
            </div>
          )}
        </Section>

        <Section no={++no} title="Nhân trắc học">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact label="Chiều cao" value={talent.height_cm ? `${talent.height_cm} cm` : ''} />
            {partner && (
              <>
                <Fact label="Cân nặng" value={partner.weight_kg ? `${partner.weight_kg} kg` : ''} />
                <Fact label="Size giày" value={partner.shoe_size || ''} />
                <Fact label="Số đo 3 vòng" value={[partner.chest_cm, partner.waist_cm, partner.hip_cm].some(Boolean) ? [partner.chest_cm, partner.waist_cm, partner.hip_cm].map(v => v || '?').join(' - ') : ''} />
              </>
            )}
          </div>
        </Section>

        {talent.experience.length > 0 && (
          <Section no={++no} title="Kinh nghiệm diễn xuất">
            <div className="space-y-4">
              {talent.experience.map(g => (
                <div key={g.group}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{g.group}</p>
                  <ul className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {g.items.map(item => (
                      <li key={item} className="rounded-[12px] border border-[#ececf0] px-3.5 py-2.5 text-[14px] leading-[1.45]">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}

        {talent.skills.length > 0 && (
          <Section no={++no} title="Kỹ năng & ngoại ngữ">
            <div className="space-y-3">
              {talent.skills.map(g => (
                <div key={g.group}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--dv-text-tertiary)]">{g.group}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {g.items.map(item => (
                      <span key={item} className="rounded-full bg-[var(--dv-bg-alt)] px-3 py-1 text-[14px]">
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
          <Section no={++no} title="Định hướng & mức độ sẵn sàng vai diễn">
            <div className="space-y-3">
              {willingness.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {willingness.map(w => (
                    <span key={w} className="rounded-full bg-[var(--dv-bg-alt)] px-3 py-1 text-[14px]">
                      ✓ {w}
                    </span>
                  ))}
                </div>
              )}
              {talent.work_cities.length > 0 && (
                <p className="text-[14px]">
                  <span className="text-[var(--dv-text-secondary)]">Sẵn sàng quay tại: </span>
                  {talent.work_cities.join(', ')}
                </p>
              )}
            </div>
          </Section>
        )}

        {talent.trainings.length > 0 && (
          <Section no={++no} title="Đào tạo diễn xuất">
            <ul className="space-y-1 text-[15px] leading-[1.47]">
              {talent.trainings.map(t => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Section>
        )}

        {talent.selftapes.length > 0 && (
          <Section no={++no} title="Self-tape nổi bật">
            <ul className="space-y-4">
              {talent.selftapes.map((v, k) => {
                const yt = youtubeId(v.url);
                return (
                  <li key={v.url + k}>
                    {yt ? (
                      <div className="aspect-video overflow-hidden rounded-[14px] bg-black">
                        <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title={v.title || `Self-tape ${k + 1}`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" />
                      </div>
                    ) : (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[14px] bg-[var(--dv-bg-alt)] p-4 hover:bg-[#ededf0]">
                        <Video className="h-5 w-5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{v.title || `Self-tape ${k + 1}`}</span>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </a>
                    )}
                    {yt && v.title && <p className="mt-1.5 text-[14px] text-[var(--dv-text-secondary)]">{v.title}</p>}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {talent.gallery.length > 0 && (
          <Section no={++no} title="Ảnh hoạt động">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {talent.gallery.map((g, k) => (
                <li key={g.url + k}>
                  <figure>
                    <div className="aspect-[4/5] overflow-hidden rounded-[14px] bg-[#e8e8ed]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={g.caption || `Ảnh hoạt động ${k + 1}`} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                    {g.caption && <figcaption className="mt-1.5 text-[13px] leading-[1.4] text-[var(--dv-text-secondary)]">{g.caption}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
