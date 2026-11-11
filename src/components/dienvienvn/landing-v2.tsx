'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomeStats } from '@/lib/dienvienvn/home-stats';
import { useDvvnHref } from './base-path';
import { Audience, AudienceTile, Closing, Hero, LandingNav, MOSAIC_FACES, Process } from './landing-page';
import { pickRotatingFaces, shuffle } from '@/lib/dienvienvn/face-rotation';
import { CrewCta, Partners, Services, Story } from './landing-v1';
import { CastingRail } from './casting-rail';
import { SiteFooter } from './site-chrome';
import { StageSpotlight } from './stage-spotlight';
import { RotatingWords } from './rotating-words';

/**
 * Trang chủ mới 02 (bản xem trước): gộp phần tốt nhất của trang chủ mới 00 (/trang-chu-moi) và 01 (/trang-chu-moi-01).
 * Thứ tự: mở đầu nền tối (00, câu định vị của 01) → câu chuyện (01) → trượt ngang (01) → quy trình (00)
 * → dịch vụ diễn viên (01) / lợi ích NSX (00) → mạng lưới đối tác (01) → tìm ekip (01, trang NSX) → kết (00).
 */
/** Số gương mặt trên hàng trượt dành cho nhà sản xuất (thêm 1 ảnh cho thẻ Xem tất cả). */
const RAIL_FACES = 10;
/**
 * Hồ sơ luôn có mặt trong khối ảnh phần đầu trang chủ (vị trí / thứ tự đổi ngẫu nhiên mỗi lần vào trang / F5).
 * Các ô còn lại bốc ngẫu nhiên xoay vòng như bình thường. Sửa danh sách bằng username của hồ sơ.
 */
const PINNED_HERO = ['phamthaikhuongthaikhuongpham', 'jakelee', 'truongquochau'];

export function DienVienVNLandingV2({ stats }: { stats: HomeStats }) {
  const href = useDvvnHref();
  const [audience, setAudience] = useState<Audience>('talent');
  // Gương mặt bốc ngẫu nhiên mỗi lần vào trang / F5, xoay vòng không lặp cho tới khi đi hết hồ sơ.
  // Phần đầu trang (12) và hàng "Gương mặt sẵn sàng…" (10 + ảnh thẻ cuối) không trùng nhau.
  // Chỉ tính là "đã hiện" những gương mặt người xem thật sự thấy: hàng của nhà sản xuất bốc khi chuyển sang mục đó.
  const [faces, setFaces] = useState<HomeStats['faces'] | null>(null);
  const [hiringFaces, setHiringFaces] = useState<HomeStats['faces']>([]);
  useEffect(() => {
    const pinned = stats.faces.filter(f => PINNED_HERO.includes(f.username));
    const others = stats.faces.filter(f => !PINNED_HERO.includes(f.username));
    setFaces(shuffle([...pinned, ...pickRotatingFaces(others, MOSAIC_FACES - pinned.length)]));
  }, [stats.faces]);
  useEffect(() => {
    if (audience !== 'hiring' || !faces || hiringFaces.length) return;
    setHiringFaces(pickRotatingFaces(stats.faces, RAIL_FACES + 1, faces.map(f => f.username)));
  }, [audience, faces, hiringFaces.length, stats.faces]);
  const heroStats = { ...stats, faces: faces || [] };
  const railStats = { ...stats, faces: hiringFaces.slice(0, RAIL_FACES + 1) };
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Link trong email xác nhận rơi về trang chủ → chuyển tiếp tới trang tạo mật khẩu
    const { search, hash } = window.location;
    if (/[?&]token_hash=/.test(search) || /access_token=|error_code=/.test(hash)) {
      window.location.replace(`${href('/tao-mat-khau')}${search}${hash}`);
      return;
    }
    if (window.location.hash === '#nha-san-xuat') setAudience('hiring');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const talent = audience === 'talent';
  return (
    <>
      <LandingNav audience={audience} onAudience={setAudience} />
      <main>
        <div ref={heroRef} className="relative overflow-hidden">
        <StageSpotlight targetRef={heroRef} />
        <Hero
          stats={heroStats}
          facesPending={faces === null}
          audience={audience}
          onAudience={setAudience}
          hideCounts
          eyebrow="Cộng đồng diễn viên"
          headlineLabel="Cộng đồng diễn viên trung thực – minh bạch – hết mình."
          headline={<RotatingWords words={['trung thực.', 'minh bạch.', 'hết mình.']} still="trung thực – minh bạch – hết mình." className="text-[#d4ae6a]" />}
        />
        </div>
        <Story />
        <CastingRail audience={audience} stats={railStats} />
        <Process audience={audience} />
        {talent ? <Services photo="/dienvienvn/home/dich-vu-headshot.jpg" /> : <AudienceTile audience={audience} />}
        <Partners />
        {/* Nền đen theo style guideline (không dùng ảnh nền) */}
        {!talent && <CrewCta />}
        <Closing audience={audience} />
      </main>
      <SiteFooter />
    </>
  );
}
