'use client';

import Link from 'next/link';
import { ChevronRight, Clapperboard, GraduationCap, LockKeyhole, ScanFace } from 'lucide-react';
import { CASTING_STEPS } from '@/lib/dienvienvn/casting-form';
import { useDvvnHref } from './base-path';
import { FlipCountdown, useLaunched } from './flip-countdown';
import { GlobalNav, Reveal, SiteFooter } from './site-chrome';
import { ProjectsSection } from './projects-section';

function Cta({
  primary,
  secondary,
  tone = 'primary'
}: {
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  tone?: 'primary' | 'light';
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-3 md:mt-6 md:gap-4">
      <Link href={primary.href} className={`dv-btn ${tone === 'light' ? 'dv-btn-light' : 'dv-btn-primary'}`}>
        {primary.label}
      </Link>
      {secondary && (
        <Link href={secondary.href} className="dv-btn dv-btn-secondary">
          {secondary.label}
        </Link>
      )}
    </div>
  );
}

function TileIcon({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto mt-10 flex h-[150px] items-center justify-center md:h-[190px]">{children}</div>;
}

export function DienVienVNHome() {
  const href = useDvvnHref();
  const launched = useLaunched();
  const apply = { href: href('/nop-ho-so'), label: 'Nộp hồ sơ casting' };

  return (
    <>
      <GlobalNav />

      <main>
        {/* RA MẮT — Coming soon (màn hình đầu tiên khi vào trang chủ) */}
        <section
          id="ra-mat"
          className="dv-tile dv-tile-dark flex min-h-[calc(100svh-44px)] scroll-mt-11 flex-col items-center justify-center px-4 py-16 md:py-20"
        >
          <Reveal>
            <h1 className="dv-display dv-hero-headline text-[#f5f5f7]">DienVienVN</h1>
            <p className="dv-display dv-hero-subhead mt-1.5 text-[#a1a1a6]">Đúng người. Đúng vai.</p>
            <p className="dv-eyebrow mt-10 text-[#86868b] md:mt-12">{launched ? 'Đã ra mắt' : 'Coming Soon'}</p>
            <h2 className="dv-display dv-headline mt-2 text-[#f5f5f7]">
              {launched ? 'DienVienVN đã chính thức ra mắt.' : 'Chính thức ra mắt 11.11.2026.'}
            </h2>
          </Reveal>
          <Reveal delay={120} className="mt-10 w-full md:mt-14">
            <FlipCountdown />
          </Reveal>
          <Reveal delay={200} className="mt-10 md:mt-12">
            <Cta primary={apply} tone="light" />
          </Reveal>
        </section>

        <ProjectsSection />

        {/* GRID TILES */}
        <section className="bg-[var(--dv-bg)] p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div id="dien-vien" className="dv-tile dv-tile-alt scroll-mt-11 px-6 pb-10 pt-12 md:pt-14">
              <Reveal>
                <h3 className="dv-display dv-headline">Hồ sơ casting</h3>
                <p className="dv-subhead mt-2">Một hồ sơ. Mọi dự án.</p>
                <p className="mx-auto mt-3 max-w-[380px] text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
                  Số đo, kỹ năng, kinh nghiệm và ảnh chân dung — trình bày đúng chuẩn mà đạo diễn casting cần xem.
                </p>
                <Cta primary={{ href: href('/nop-ho-so'), label: 'Bắt đầu' }} secondary={{ href: `${href('/')}#quy-trinh`, label: 'Các bước' }} />
                <TileIcon>
                  <ScanFace className="h-28 w-28 text-[#1d1d1f] md:h-36 md:w-36" strokeWidth={0.9} />
                </TileIcon>
              </Reveal>
            </div>

            <div id="nha-san-xuat" className="dv-tile dv-tile-dark scroll-mt-11 px-6 pb-10 pt-12 md:pt-14">
              <Reveal>
                <h3 className="dv-display dv-headline text-[#f5f5f7]">Nhà sản xuất</h3>
                <p className="dv-subhead mt-2 text-[#f5f5f7]">Tìm đúng gương mặt, nhanh hơn.</p>
                <p className="mx-auto mt-3 max-w-[380px] text-[15px] leading-[1.47] text-[#a1a1a6]">
                  Lọc theo độ tuổi, chiều cao, giọng vùng miền, kỹ năng và mức độ sẵn sàng vai diễn — chỉ trong vài giây.
                </p>
                <p className="mt-5 text-[17px] text-[#86868b]">Mở cho đối tác từ 11.11.2026</p>
                <TileIcon>
                  <Clapperboard className="h-28 w-28 text-[#f5f5f7] md:h-36 md:w-36" strokeWidth={0.9} />
                </TileIcon>
              </Reveal>
            </div>

            <div id="dao-tao" className="dv-tile dv-tile-dark scroll-mt-11 px-6 pb-10 pt-12 md:pt-14">
              <Reveal>
                <h3 className="dv-display dv-headline text-[#f5f5f7]">Đào tạo diễn xuất</h3>
                <p className="dv-subhead mt-2 text-[#f5f5f7]">Từ lớp học đến trường quay.</p>
                <p className="mx-auto mt-3 max-w-[380px] text-[15px] leading-[1.47] text-[#a1a1a6]">
                  Ghi nhận quá trình học tại ACT Academy và các trường nghệ thuật chính quy trên cả nước.
                </p>
                <div className="dv-on-dark mt-5">
                  <Link href={href('/nop-ho-so')} className="dv-link text-[17px]">
                    Khai báo trong hồ sơ <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <TileIcon>
                  <GraduationCap className="h-28 w-28 text-[#f5f5f7] md:h-36 md:w-36" strokeWidth={0.9} />
                </TileIcon>
              </Reveal>
            </div>

            <div className="dv-tile dv-tile-alt px-6 pb-10 pt-12 md:pt-14">
              <Reveal>
                <h3 className="dv-display dv-headline">Riêng tư</h3>
                <p className="dv-subhead mt-2">Hồ sơ của bạn. Quyền của bạn.</p>
                <p className="mx-auto mt-3 max-w-[380px] text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
                  Thông tin chỉ được đội ngũ casting xem xét và gửi tới nhà sản xuất khi có vai phù hợp với bạn.
                </p>
                <TileIcon>
                  <LockKeyhole className="h-28 w-28 text-[#1d1d1f] md:h-36 md:w-36" strokeWidth={0.9} />
                </TileIcon>
              </Reveal>
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section id="quy-trinh" className="dv-tile dv-tile-light scroll-mt-11 px-4 py-16 md:py-24">
          <Reveal>
            <h2 className="dv-display dv-headline">Bảy bước. Khoảng mười phút.</h2>
            <p className="dv-subhead mx-auto mt-3 max-w-[640px] text-[var(--dv-text-secondary)]">
              Điền theo từng phần, quay lại chỉnh sửa bất kỳ lúc nào trước khi nộp.
            </p>
          </Reveal>
          <ol className="mx-auto mt-12 grid max-w-[980px] grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
            {CASTING_STEPS.map((s, i) => (
              <li key={s.id}>
                <Reveal delay={i * 60} className="h-full">
                  <div className="h-full rounded-[18px] bg-[var(--dv-bg-alt)] p-6">
                    <span className="text-[14px] font-semibold text-[var(--dv-text-secondary)]">Bước {s.id}</span>
                    <p className="mt-1 text-[19px] font-semibold leading-[1.21] tracking-[0.012em]">{s.title}</p>
                    <p className="mt-2 text-[14px] leading-[1.43] text-[var(--dv-text-secondary)]">{s.desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
            <li>
              <Reveal delay={CASTING_STEPS.length * 60} className="h-full">
                <Link
                  href={href('/nop-ho-so')}
                  className="group flex h-full flex-col justify-between rounded-[18px] bg-[#0071e3] p-6 text-white transition-colors hover:bg-[#0077ed]"
                >
                  <span className="text-[14px] font-semibold text-white/75">Sẵn sàng?</span>
                  <span className="mt-1 flex items-center gap-1 text-[19px] font-semibold leading-[1.21]">
                    Nộp hồ sơ casting <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            </li>
          </ol>
        </section>

        {/* CLOSING */}
        <section className="dv-tile dv-tile-alt px-4 py-16 md:py-20">
          <Reveal>
            <h2 className="dv-display dv-headline">Vai diễn tiếp theo có thể là của bạn.</h2>
            <Cta primary={apply} />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
