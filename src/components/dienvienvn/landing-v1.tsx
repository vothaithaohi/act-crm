'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, ChevronRight, Clapperboard, GraduationCap, Video } from 'lucide-react';
import type { HomeStats } from '@/lib/dienvienvn/home-stats';
import { PublicProject, isDeadlinePassed, projectPathName } from '@/lib/projects/types';
import { fetchPublicProjects } from '@/lib/projects/public-client';
import { useDvvnHref } from './base-path';
import { Audience, LandingNav } from './landing-page';
import { ProjectCard } from './project-slider';
import { Reveal, SiteFooter } from './site-chrome';

const fmt = (n: number) => n.toLocaleString('vi-VN');

/** Logo thành viên Embassy Education Group (lấy từ embassyeducation.edu.vn/our-members1). */
const PARTNERS: { name: string; file: string; url: string }[] = [
  { name: 'A.C.T Academy', file: 'act-academy.png', url: 'https://actacademy.edu.vn/' },
  { name: 'Embassy Education', file: 'embassy-education.png', url: 'https://embassyeducation.edu.vn/' },
  { name: 'Global Embassy', file: 'global-embassy.png', url: 'https://globalembassy.edu.vn/' },
  { name: 'Royal Embassy Academy', file: 'royal-embassy.png', url: 'https://royalembassy.edu.vn/' },
  { name: 'Asia Music & Performing Arts Education', file: 'ampa.png', url: 'https://ampaeducation.org/' },
  { name: 'Soul Music & Performing Arts Academy', file: 'smpaa.png', url: 'https://smpaa.edu.vn/' },
  { name: 'Arts Nation', file: 'arts-nation.png', url: 'https://artsnation.edu.vn/' },
  { name: 'Vietnam Contemporary Visual Arts Academy', file: 'vcvaa.png', url: 'https://vcvaa.edu.vn/' },
  { name: 'Vietnam Institute for Arts Education', file: 'viae.png', url: 'https://viae.edu.vn/' },
  { name: 'Lyricist', file: 'the-lyricist.png', url: 'https://thelyricist.vn/' },
  { name: 'Unicorn Dance Academy', file: 'unicorn-dance.png', url: 'https://unicorndance.edu.vn/' },
  { name: 'Kindermusik Vietnam', file: 'kindermusik.png', url: 'https://www.kindermusik.com.vn/' },
  { name: 'Colab Vietnam', file: 'colab-vietnam.png', url: 'https://www.colabvietnam.com/' },
  { name: 'Em Maison Pre-school', file: 'embassy-maison.png', url: 'https://emmaison.edu.vn/' },
  { name: 'Maison Lumière', file: 'maison-lumiere.jpg', url: 'https://admissions.maisonlumiere.com.vn/' },
  { name: "Little Em's", file: 'little-embassy.png', url: 'https://littleems.edu.vn/' },
  { name: 'Wisdomland International Preschool', file: 'wisdomland.png', url: 'https://www.wisdomlandpreschool.com/' },
  { name: 'Việt Nam Tinh Hoa', file: 'vietnam-tinh-hoa.png', url: 'https://vietnamtinhhoa.edu.vn/' },
  { name: "Special Em's Education Center", file: 'special-embassy.png', url: 'https://specialems.edu.vn/' },
  { name: 'Vietnamese International Clinic for Autism', file: 'vica.png', url: 'https://vica.edu.vn/' },
  { name: 'Vietnam International Reggio Emilia Society', file: 'vires.png', url: 'https://vires.edu.vn/' },
  { name: 'Vietnam International Institute of Sport', file: 'viis.png', url: 'http://viis.vn/' },
  { name: 'LaLiga Academy Vietnam', file: 'laliga-academy.png', url: 'https://laligaacademy.vn/' },
  { name: 'Vietnam International Table Tennis Academy', file: 'vitta.png', url: 'https://vitta.vn/' },
  { name: 'Yoga Planet', file: 'yoga-planet.png', url: 'https://yogaplanet.edu.vn/' }
];

/** Trang dịch vụ hỗ trợ diễn viên (chưa có trang riêng trên DienVienVN → tạm dẫn về A.C.T Academy). */
const SERVICES = [
  { icon: GraduationCap, title: 'Học kỹ năng mềm', desc: 'Diễn xuất trước ống kính, giọng nói, hình thể và tác phong làm nghề.' },
  { icon: Video, title: 'Dịch vụ self-tape', desc: 'Quay self-tape đúng chuẩn casting: khung hình, ánh sáng, âm thanh.' },
  { icon: Camera, title: 'Dịch vụ headshot', desc: 'Ảnh chân dung, toàn thân, góc nghiêng theo chuẩn hồ sơ casting.' }
];
const SERVICES_URL = 'https://actacademy.edu.vn/';

/* ---------- 1. Mở đầu ---------- */
function Hero({ audience, onAudience }: { audience: Audience; onAudience: (a: Audience) => void }) {
  const href = useDvvnHref();
  const talent = audience === 'talent';
  return (
    <section className="bg-white px-4 pb-20 pt-16 text-center md:pb-28 md:pt-24">
      <div className="mx-auto inline-flex rounded-full bg-[var(--dv-bg-alt)] p-1">
        {(
          [
            ['talent', 'Tôi là diễn viên'],
            ['hiring', 'Tôi tìm diễn viên']
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onAudience(id)}
            aria-pressed={audience === id}
            className={`h-9 rounded-full px-4 text-[14px] font-medium transition-colors ${audience === id ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[var(--dv-text-secondary)]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Reveal>
        <p className="mt-10 text-[15px] text-[var(--dv-text-secondary)] md:text-[17px]">DienVienVN</p>
        <h1 className="dv-display mx-auto mt-3 max-w-[900px] text-[40px] font-semibold leading-[1.08] tracking-[-0.01em] md:text-[64px]">
          Cộng đồng diễn viên trung thực – minh bạch – hết mình.
        </h1>
      </Reveal>
      <Reveal delay={120} className="mt-9 flex justify-center">
        <Link
          href={href(talent ? '/nop-ho-so' : '/doi-tac/du-an/moi')}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#e8e8ed] px-6 text-[15px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#dcdce1]"
        >
          {talent ? 'Nộp hồ sơ diễn viên' : 'Đăng casting call'} <span aria-hidden>👋</span>
        </Link>
      </Reveal>
    </section>
  );
}

/* ---------- 2. Câu chuyện: chữ sáng dần khi cuộn tới (hiệu ứng như talentsystems.com) ---------- */
const STORY = [
  {
    title: 'Minh bạch là yếu tố cốt lõi.',
    body: 'Bằng việc kết hợp giữa giải pháp số và không gian làm việc thực tế, chúng tôi đơn giản hóa quy trình tuyển chọn diễn viên, giúp mọi cơ hội trở nên rõ ràng và an tâm hơn. Uy tín không tự nhiên mà có; đó là kết quả của sự minh bạch tuyệt đối, được bảo chứng bởi sức mạnh tập thể, công nghệ tiên tiến cùng năng lực chuyên môn đáp ứng những yêu cầu khắt khe nhất.'
  },
  {
    title: 'Bệ phóng từ kinh nghiệm thực tiễn.',
    body: 'Uy tín của chúng tôi được định hình từ nền tảng vững chắc do Kathy Uyên và A.C.T Academy gầy dựng qua nhiều năm cống hiến cho điện ảnh Việt Nam. Chiều sâu kinh nghiệm trong công tác đào tạo, định hướng diễn xuất và mạng lưới kết nối sâu rộng trong ngành chính là kim chỉ nam giúp chúng tôi nâng chuẩn quy trình tuyển chọn tài năng theo hướng chuyên nghiệp và chuẩn mực quốc tế.'
  },
  {
    title: 'Con người là trọng tâm của mọi sự chuyển mình.',
    body: 'Điện ảnh có thể liên tục biến đổi cùng xu hướng và công nghệ mới, nhưng giá trị cốt lõi vẫn luôn thuộc về người nghệ sĩ trước ống kính và đội ngũ sáng tạo phía sau. Mọi quyết định và sự phát triển của chúng tôi đều nhằm bảo vệ, nuôi dưỡng và mở ra cơ hội công bằng nhất cho cộng đồng những người làm nghề.'
  }
];

function LightUp({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return setLit(true);
    // Sáng lên khi khối đi vào vùng giữa màn hình, tối lại khi đi khỏi
    const io = new IntersectionObserver(([e]) => setLit(e.isIntersecting), { rootMargin: '-35% 0px -35% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-colors duration-700 ${lit ? 'text-[#f5f5f7]' : 'text-[#48484a]'} ${className}`}>
      {children}
    </div>
  );
}

function Story() {
  return (
    <section className="bg-[#111111] px-4 py-20 md:py-28">
      <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-16">
        <div>
          <h2 className="dv-display text-[28px] font-semibold leading-[1.15] text-[#f5f5f7] md:sticky md:top-28 md:text-[34px]">
            Đúng người.
            <br />
            Đúng vai.
          </h2>
        </div>
        <div className="space-y-16 md:space-y-24">
          {STORY.map(s => (
            <LightUp key={s.title}>
              <h3 className="dv-display text-[34px] font-semibold leading-[1.1] md:text-[48px]">{s.title}</h3>
              <p className="mt-5 max-w-[620px] text-[16px] leading-[1.6] md:text-[17px]">{s.body}</p>
            </LightUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. Trượt ngang: diễn viên xem lịch casting, NSX xem gương mặt diễn viên ---------- */
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      down = true;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      el.scrollLeft = startLeft - (e.clientX - startX);
    };
    const onUp = () => (down = false);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);
  return ref;
}

function Ecosystem({ audience, stats }: { audience: Audience; stats: HomeStats }) {
  const href = useDvvnHref();
  const talent = audience === 'talent';
  const [projects, setProjects] = useState<PublicProject[] | null>(null);
  const track = useDragScroll();

  useEffect(() => {
    if (!talent || projects) return;
    fetchPublicProjects()
      .then(list => setProjects(list.filter(p => !isDeadlinePassed(p.deadline))))
      .catch(() => setProjects([]));
  }, [talent, projects]);

  const card = 'w-[72%] shrink-0 snap-start sm:w-[44%] lg:w-[300px]';
  const stat = talent
    ? { value: fmt(projects?.length ?? stats.projects), label: 'Dự án đang casting', href: href('/du-an') }
    : { value: fmt(stats.talents), label: 'Hồ sơ diễn viên đã duyệt', href: href('/dien-vien') };
  const empty = talent ? projects !== null && projects.length === 0 : stats.faces.length === 0;

  return (
    <section className="bg-[#111111] px-4 pb-20 md:pb-28">
      <div className="mx-auto max-w-[1100px] border-t border-white/15 pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="dv-display max-w-[420px] text-[28px] font-semibold leading-[1.15] text-[#f5f5f7] md:text-[34px]">
            {talent ? 'Lịch casting đang mở cho bạn.' : 'Gương mặt sẵn sàng cho vai diễn tiếp theo.'}
          </h2>
          <Link href={stat.href} className="inline-flex items-center gap-1 text-[15px] text-[#f5f5f7] underline-offset-4 hover:underline">
            {talent ? 'Xem tất cả dự án' : 'Xem tất cả diễn viên'} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div ref={track} className="dv-scroll-x mx-auto mt-10 flex max-w-[1100px] cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto pb-2 active:cursor-grabbing">
        <Link href={stat.href} className={`${card} flex aspect-[4/5] flex-col justify-end rounded-[22px] bg-[#0071e3] p-6 text-white`}>
          <span className="dv-display text-[56px] font-semibold leading-none">{stat.value}</span>
          <span className="mt-2 text-[17px]">{stat.label}</span>
        </Link>
        {talent
          ? (projects || []).slice(0, 8).map(p => (
              <div key={p.id} className={card}>
                <ProjectCard project={p} href={href(`/du-an/${projectPathName(p.display_name, p.code) || p.id}`)} />
              </div>
            ))
          : stats.faces.slice(0, 10).map(f => (
              <Link key={f.username} href={href(`/${f.username}`)} className={`${card} group relative block aspect-[4/5] overflow-hidden rounded-[22px] bg-[#1d1d1f]`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.photo} alt={f.name} loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover object-[50%_18%] transition duration-500 group-hover:scale-[1.04]" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-5 pb-5 pt-16 text-white">
                  {f.act && <span className="mb-1.5 inline-flex rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#1d1d1f]">ACT Academy</span>}
                  <span className="block text-[17px] font-semibold">{f.name}</span>
                </span>
              </Link>
            ))}
        {talent && projects === null && <div className={`${card} aspect-[4/5] animate-pulse rounded-[22px] bg-white/5`} />}
      </div>
      {empty && <p className="mx-auto mt-4 max-w-[1100px] text-[15px] text-[#a1a1a6]">{talent ? 'Hiện chưa có dự án nào đang nhận hồ sơ.' : 'Các hồ sơ đã duyệt sẽ sớm xuất hiện tại đây.'}</p>}
    </section>
  );
}

/* ---------- 4. Dịch vụ hỗ trợ diễn viên (trang diễn viên) ---------- */
function Services({ photo }: { photo?: string }) {
  return (
    <section className="bg-[#111111] px-4 pb-20 md:pb-28">
      <div className="mx-auto grid max-w-[1100px] items-center gap-10 border-t border-white/15 pt-14 md:grid-cols-2 md:gap-16">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-gradient-to-br from-[#2b2b30] to-[#0b0b0c]">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_20%] opacity-90" />
            ) : (
              <Clapperboard className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 text-white/30" strokeWidth={0.8} />
            )}
          </div>
        </Reveal>
        <Reveal delay={100}>
          <h2 className="dv-display text-[32px] font-semibold leading-[1.12] text-[#f5f5f7] md:text-[40px]">Nâng cấp bản thân. Nâng tầm hồ sơ.</h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-[#a1a1a6] md:text-[17px]">
            Hồ sơ tốt mở ra nhiều cơ hội hơn. Các dịch vụ hỗ trợ diễn viên giúp bạn chuẩn bị kỹ năng, self-tape và hình ảnh đúng chuẩn đạo diễn và nhà sản
            xuất cần xem.
          </p>
          <ul className="mt-8 space-y-4">
            {SERVICES.map(s => (
              <li key={s.title} className="flex gap-4">
                <s.icon className="mt-0.5 h-6 w-6 shrink-0 text-[#f5f5f7]" strokeWidth={1.6} />
                <div>
                  <p className="text-[17px] font-semibold text-[#f5f5f7]">{s.title}</p>
                  <p className="mt-0.5 text-[15px] leading-[1.5] text-[#a1a1a6]">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <a href={SERVICES_URL} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex h-10 items-center gap-1.5 rounded-full border border-white/50 px-5 text-[14px] text-[#f5f5f7] hover:bg-white/10">
            Khám phá dịch vụ <ArrowRight className="h-4 w-4" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 5. Mạng lưới đối tác: logo tự trượt chậm, kéo / vuốt tay để xem nhanh ---------- */
function Partners() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let paused = false;
    let resumeAt = 0;
    let raf = 0;
    let last = performance.now();
    let pos = el.scrollLeft;
    const SPEED = 40; // px mỗi giây khi tự trượt
    const tick = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      const half = el.scrollWidth / 2;
      if (!reduce && !paused && t >= resumeAt) {
        pos += (SPEED * dt) / 1000;
        if (pos >= half) pos -= half;
        el.scrollLeft = pos;
      } else {
        // Người dùng đang tự kéo / vuốt: giữ vòng lặp liền mạch
        if (el.scrollLeft >= half) el.scrollLeft -= half;
        pos = el.scrollLeft;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const hold = () => {
      paused = true;
    };
    const release = () => {
      paused = false;
      resumeAt = performance.now() + 1500;
    };
    const onWheel = () => {
      resumeAt = performance.now() + 1500;
    };
    // Kéo bằng chuột
    let down = false;
    let startX = 0;
    let startLeft = 0;
    let moved = false;
    const onDown = (e: PointerEvent) => {
      hold();
      if (e.pointerType !== 'mouse') return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (Math.abs(e.clientX - startX) > 4) moved = true;
      el.scrollLeft = Math.max(0, startLeft - (e.clientX - startX));
    };
    const onUp = () => {
      down = false;
      release();
    };
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        moved = false;
      }
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('touchstart', hold, { passive: true });
    el.addEventListener('touchend', release);
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('click', onClick, true);
    el.addEventListener('mouseenter', hold);
    el.addEventListener('mouseleave', release);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('touchstart', hold);
      el.removeEventListener('touchend', release);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('click', onClick, true);
      el.removeEventListener('mouseenter', hold);
      el.removeEventListener('mouseleave', release);
    };
  }, []);

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1100px] px-4">
        <div className="grid gap-6 border-t border-[#d2d2d7] pt-14 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-16">
          <h2 className="dv-display text-[28px] font-semibold leading-[1.15] md:text-[34px]">Mạng lưới đối tác.</h2>
          <p className="max-w-[560px] text-[16px] leading-[1.6] text-[var(--dv-text-secondary)] md:text-[17px]">
            DienVienVN được xây dựng bởi A.C.T Academy – thành viên của Embassy Education Group. Cùng các thành viên trong hệ sinh thái giáo dục nghệ thuật,
            thể thao và sáng tạo, chúng tôi nâng chuẩn đào tạo và kết nối tài năng.
          </p>
        </div>
      </div>
      <div
        ref={ref}
        className="dv-scroll-x mt-12 flex cursor-grab select-none overflow-x-auto active:cursor-grabbing"
        aria-label="Logo thành viên Embassy Education Group"
      >
        {[...PARTNERS, ...PARTNERS].map((p, i) => (
          <a
            key={`${p.file}-${i}`}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            title={p.name}
            aria-hidden={i >= PARTNERS.length ? true : undefined}
            tabIndex={i >= PARTNERS.length ? -1 : undefined}
            draggable={false}
            className="flex h-28 w-[170px] shrink-0 items-center justify-center px-6 md:h-32 md:w-[200px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/dienvienvn/partners/${p.file}`} alt={p.name} loading="lazy" draggable={false} className="max-h-20 max-w-full object-contain md:max-h-24" />
          </a>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-[1100px] px-4">
        <div className="border-t border-[#d2d2d7]" />
      </div>
    </section>
  );
}

/* ---------- 6. Chỉ trang đối tác: tìm ekip / đăng tuyển ---------- */
function CrewCta({ photo }: { photo?: string }) {
  const href = useDvvnHref();
  return (
    <section className="relative overflow-hidden bg-[#111111] px-4 py-28 text-center text-[#f5f5f7] md:py-40">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_25%] opacity-40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />
      <Reveal className="relative">
        <h2 className="dv-display text-[36px] font-semibold leading-[1.1] md:text-[48px]">Xây dựng ekip cho dự án của bạn.</h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.6] text-[#d2d2d7] md:text-[17px]">
          Từ trợ lý casting, quay phim, ánh sáng đến hậu kỳ – tìm người làm nghề phù hợp hoặc đăng tin tuyển dụng miễn phí trên DienVienVN.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={href('/tuyen-dung')} className="inline-flex h-10 items-center rounded-full bg-white px-5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#e8e8ed]">
            Tìm ekip
          </Link>
          <Link href={href('/doi-tac/tuyen-dung/moi')} className="inline-flex h-10 items-center rounded-full border border-white/60 px-5 text-[14px] font-medium text-white hover:bg-white/10">
            Đăng tuyển
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/** Trang chủ mới 01 (bản xem trước): theo tài liệu của Thảo, hiệu ứng tham khảo talentsystems.com, logo đối tác Embassy Education Group. */
export function DienVienVNLandingV1({ stats }: { stats: HomeStats }) {
  const href = useDvvnHref();
  const [audience, setAudience] = useState<Audience>('talent');

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
        <Hero audience={audience} onAudience={setAudience} />
        <Story />
        <Ecosystem audience={audience} stats={stats} />
        {talent && <Services photo={stats.faces[0]?.photo} />}
        <Partners />
        {!talent && <CrewCta photo={stats.faces[1]?.photo || stats.faces[0]?.photo} />}
      </main>
      <SiteFooter />
    </>
  );
}
