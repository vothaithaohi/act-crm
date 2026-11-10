'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomeStats } from '@/lib/dienvienvn/home-stats';
import { useDvvnHref } from './base-path';
import { Audience, AudienceTile, Closing, Hero, LandingNav, Process } from './landing-page';
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
export function DienVienVNLandingV2({ stats }: { stats: HomeStats }) {
  const href = useDvvnHref();
  const [audience, setAudience] = useState<Audience>('talent');
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
          stats={stats}
          audience={audience}
          onAudience={setAudience}
          hideCounts
          eyebrow="Cộng đồng diễn viên"
          headlineLabel="Cộng đồng diễn viên trung thực – minh bạch – hết mình."
          headline={<RotatingWords words={['trung thực.', 'minh bạch.', 'hết mình.']} still="trung thực – minh bạch – hết mình." className="text-[#d4ae6a]" />}
        />
        </div>
        <Story />
        <CastingRail audience={audience} stats={stats} />
        <Process audience={audience} />
        {talent ? <Services photo={stats.faces[0]?.photo} /> : <AudienceTile audience={audience} />}
        <Partners />
        {!talent && <CrewCta photo={stats.faces[1]?.photo || stats.faces[0]?.photo} />}
        <Closing audience={audience} />
      </main>
      <SiteFooter />
    </>
  );
}
