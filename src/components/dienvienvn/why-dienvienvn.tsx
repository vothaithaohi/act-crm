'use client';

import Link from 'next/link';
import { ArrowRight, BadgeCheck, Check, ChevronRight, ClipboardList, Film, Link2, Lock, Users, Video } from 'lucide-react';
import type { HomeStats } from '@/lib/dienvienvn/home-stats';
import { useDvvnHref } from './base-path';
import { GlobalNav, Reveal, SiteFooter } from './site-chrome';

const fmt = (n: number) => n.toLocaleString('vi-VN');

const REASONS = [
  {
    icon: BadgeCheck,
    title: 'Kho diễn viên đã được duyệt',
    desc: 'Mỗi hồ sơ đều được đội ngũ DienVienVN kiểm tra trước khi xuất hiện. Bạn không mất thời gian sàng lọc hồ sơ thiếu ảnh, sai thông tin.'
  },
  {
    icon: ClipboardList,
    title: 'Hồ sơ trình bày đúng chuẩn casting',
    desc: 'Ảnh chân dung, toàn thân, góc nghiêng; chiều cao, cân nặng, số đo; kinh nghiệm diễn xuất, kỹ năng, giọng vùng miền và mức độ sẵn sàng cho vai diễn.'
  },
  {
    icon: Video,
    title: 'Self-tape đi kèm hồ sơ',
    desc: 'Diễn viên gửi self-tape khi ứng tuyển, theo đúng hướng dẫn self-tape của từng dự án. Bạn xem được diễn xuất trước khi mời casting.'
  },
  {
    icon: Film,
    title: 'Học viên ACT Academy',
    desc: 'Diễn viên đã học tại ACT Academy được gắn nhãn kèm lớp đã học, giúp bạn nhận ra nhanh những gương mặt được đào tạo bài bản.'
  }
];

const STEPS = [
  { title: 'Đăng ký tài khoản đối tác', desc: 'Điền thông tin đơn vị và đặt mật khẩu. DienVienVN duyệt tài khoản trước khi kích hoạt.' },
  { title: 'Đăng casting call', desc: 'Thông tin dự án, các vai cần tuyển, độ tuổi, yêu cầu self-tape. Có thể ẩn tên thật của dự án với diễn viên.' },
  { title: 'DienVienVN duyệt & mở nhận hồ sơ', desc: 'Dự án được đăng trên dienvienvn.com. Diễn viên phù hợp ứng tuyển trực tiếp, kèm self-tape.' },
  { title: 'Nhận link danh sách ứng viên', desc: 'Mỗi dự án có một link riêng, tự cập nhật khi có người ứng tuyển, sắp xếp theo từng vai và không hết hạn.' },
  { title: 'Xem hồ sơ & mời casting', desc: 'Đăng nhập tài khoản đối tác để xem đầy đủ số đo, số điện thoại, email và liên hệ trực tiếp với diễn viên.' }
];

const BENEFITS = [
  { icon: Link2, title: 'Link ứng viên không hết hạn', desc: 'Gửi cho đạo diễn, ekip casting cùng xem. Danh sách tự cập nhật, lọc theo vai, giới tính, xem dạng lưới hoặc danh sách, in / lưu PDF.' },
  { icon: Lock, title: 'Thông tin đầy đủ cho đối tác', desc: 'Tài khoản đối tác đã duyệt xem được số đo, size giày, số điện thoại và email của diễn viên — những thông tin không hiện công khai.' },
  { icon: Users, title: 'Cổng đối tác riêng', desc: 'Quản lý các dự án đã đăng, theo dõi ứng viên của từng dự án và xem hồ sơ diễn viên đầy đủ trên cùng một nơi.' },
  { icon: ClipboardList, title: 'Đăng tin tuyển ekip', desc: 'Tuyển trợ lý casting, quay phim, ánh sáng, trang điểm, hậu kỳ… Tin hiện trên trang Tuyển dụng ekip sau khi được duyệt.' },
  { icon: BadgeCheck, title: 'Miễn phí đăng tin', desc: 'Đăng casting call và tin tuyển ekip miễn phí cho đối tác DienVienVN.' },
  { icon: Film, title: 'Đội ngũ DienVienVN đồng hành', desc: 'Duyệt hồ sơ, duyệt dự án và hỗ trợ đối tác trong suốt quá trình tìm diễn viên.' }
];

/** Trang "Tại sao chọn DienVienVN?" dành cho đạo diễn, nhà sản xuất, đơn vị casting. */
export function WhyDienVienVN({ stats }: { stats: HomeStats }) {
  const href = useDvvnHref();
  const numbers = [
    stats.talents > 0 ? { value: fmt(stats.talents), label: 'Hồ sơ diễn viên đã duyệt' } : null,
    stats.projects > 0 ? { value: fmt(stats.projects), label: 'Dự án đang casting' } : null,
    stats.roles > 0 ? { value: fmt(stats.roles), label: 'Vai đang tuyển' } : null
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <>
      <GlobalNav />
      <main>
        {/* Mở đầu */}
        <section className="bg-black px-4 pb-16 pt-16 text-center text-[#f5f5f7] md:pb-24 md:pt-24">
          <Reveal>
            <p className="text-[17px] font-semibold text-[#a1a1a6]">Dành cho đạo diễn, nhà sản xuất & đơn vị casting</p>
            <h1 className="dv-display mx-auto mt-3 max-w-[820px] text-[40px] font-semibold leading-[1.08] tracking-[-0.005em] md:text-[64px]">
              Tại sao chọn DienVienVN?
            </h1>
            <p className="dv-subhead mx-auto mt-5 max-w-[680px] text-[#a1a1a6]">
              Nền tảng casting do ACT Academy xây dựng: kho diễn viên đã được duyệt, hồ sơ đúng chuẩn, self-tape đi kèm — từ casting call đến danh
              sách ứng viên trên cùng một nơi.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href={href('/doi-tac/dang-ky')} className="dv-btn dv-btn-light">
              Đăng ký đối tác
            </Link>
            <Link href={href('/doi-tac/du-an/moi')} className="inline-flex h-11 items-center gap-1.5 px-3 text-[17px] font-medium text-[#f5f5f7] underline-offset-4 hover:underline">
              Đăng tuyển dự án <ChevronRight className="h-4 w-4" />
            </Link>
          </Reveal>
          {numbers.length > 0 && (
            <Reveal delay={200}>
              <dl className="mx-auto mt-14 grid max-w-[760px] grid-cols-1 gap-6 sm:grid-cols-3">
                {numbers.map(n => (
                  <div key={n.label} className="flex flex-col-reverse">
                    <dt className="mt-1 text-[14px] text-[#a1a1a6]">{n.label}</dt>
                    <dd className="dv-display text-[40px] font-semibold leading-none md:text-[48px]">{n.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}
        </section>

        {/* Lý do */}
        <section className="bg-white px-4 py-16 md:py-24">
          <div className="mx-auto max-w-[1100px]">
            <Reveal className="text-center">
              <h2 className="dv-display dv-headline">Đúng người. Đúng vai. Ít thời gian hơn.</h2>
              <p className="dv-subhead mx-auto mt-3 max-w-[640px] text-[var(--dv-text-secondary)]">Bốn lý do các đơn vị sản xuất chọn tìm diễn viên trên DienVienVN.</p>
            </Reveal>
            <ul className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {REASONS.map((r, i) => (
                <li key={r.title}>
                  <Reveal delay={i * 60} className="h-full">
                    <div className="h-full rounded-[22px] bg-[var(--dv-bg-alt)] p-7 md:p-8">
                      <r.icon className="h-7 w-7" strokeWidth={1.6} />
                      <p className="mt-4 text-[21px] font-semibold leading-[1.2]">{r.title}</p>
                      <p className="mt-2 text-[16px] leading-[1.5] text-[var(--dv-text-secondary)]">{r.desc}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Quy trình */}
        <section id="quy-trinh" className="scroll-mt-16 bg-[var(--dv-bg-alt)] px-4 py-16 md:py-24">
          <div className="mx-auto max-w-[1100px]">
            <Reveal className="text-center">
              <h2 className="dv-display dv-headline">Quy trình làm việc.</h2>
              <p className="dv-subhead mx-auto mt-3 max-w-[640px] text-[var(--dv-text-secondary)]">Năm bước, từ khi đăng casting call đến khi mời diễn viên casting.</p>
            </Reveal>
            <ol className="mx-auto mt-12 max-w-[820px] space-y-3">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <Reveal delay={i * 60}>
                    <div className="flex gap-5 rounded-[22px] bg-white p-6 md:p-7">
                      <span className="dv-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[17px] font-semibold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[19px] font-semibold leading-[1.25]">{s.title}</p>
                        <p className="mt-1.5 text-[15px] leading-[1.5] text-[var(--dv-text-secondary)]">{s.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Quyền lợi */}
        <section className="bg-white px-4 py-16 md:py-24">
          <div className="mx-auto max-w-[1100px]">
            <Reveal className="text-center">
              <h2 className="dv-display dv-headline">Đối tác nhận được gì.</h2>
              <p className="dv-subhead mx-auto mt-3 max-w-[640px] text-[var(--dv-text-secondary)]">Mọi công cụ cần cho một đợt casting, trong một tài khoản.</p>
            </Reveal>
            <ul className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b, i) => (
                <li key={b.title}>
                  <Reveal delay={i * 50} className="h-full">
                    <div className="h-full rounded-[22px] border border-[#e8e8ed] p-7">
                      <b.icon className="h-6 w-6" strokeWidth={1.6} />
                      <p className="mt-4 text-[19px] font-semibold leading-[1.25]">{b.title}</p>
                      <p className="mt-2 text-[15px] leading-[1.5] text-[var(--dv-text-secondary)]">{b.desc}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>

            {/* Công khai và đối tác */}
            <Reveal delay={100}>
              <div className="mx-auto mt-12 max-w-[820px] overflow-hidden rounded-[22px] bg-[var(--dv-bg-alt)]">
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-[#e0e0e5] px-5 py-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--dv-text-secondary)] md:px-7">
                  <span>Thông tin diễn viên</span>
                  <span className="text-center">Khách xem</span>
                  <span className="text-center text-[var(--dv-text)]">Đối tác</span>
                </div>
                {[
                  ['Ảnh, self-tape, tên đầy đủ', true, true],
                  ['Tuổi, chiều cao, cân nặng', true, true],
                  ['Kinh nghiệm, kỹ năng, mức độ sẵn sàng', true, true],
                  ['Số đo 3 vòng, size giày', false, true],
                  ['Số điện thoại, email', false, true]
                ].map(([label, pub, partner]) => (
                  <div key={label as string} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-[#e8e8ed] px-5 py-3.5 text-[15px] last:border-0 md:px-7">
                    <span>{label}</span>
                    <span className="flex justify-center">{pub ? <Check className="h-5 w-5" /> : <span className="text-[var(--dv-text-tertiary)]">—</span>}</span>
                    <span className="flex justify-center">{partner ? <Check className="h-5 w-5" /> : <span className="text-[var(--dv-text-tertiary)]">—</span>}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Kết */}
        <section className="bg-black px-4 py-16 text-center text-[#f5f5f7] md:py-24">
          <Reveal>
            <h2 className="dv-display dv-headline">Bắt đầu tìm diễn viên cho dự án tiếp theo.</h2>
            <p className="dv-subhead mx-auto mt-3 max-w-[600px] text-[#a1a1a6]">Đăng ký tài khoản đối tác miễn phí. Tài khoản dùng được ngay sau khi DienVienVN duyệt.</p>
          </Reveal>
          <Reveal delay={120} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href={href('/doi-tac/dang-ky')} className="dv-btn dv-btn-light">
              Đăng ký đối tác <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={href('/doi-tac/tuyen-dung/moi')} className="inline-flex h-11 items-center gap-1.5 px-3 text-[17px] font-medium text-[#f5f5f7] underline-offset-4 hover:underline">
              Đăng tuyển dụng ekip <ChevronRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
