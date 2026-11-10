'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PARTNER_TYPE_LABELS, PartnerType } from '@/lib/dienvienvn/partners';
import { useDvvnHref } from './base-path';
import { Field, SelectInput, TextInput } from './form-fields';
import { GlobalNav } from './site-chrome';

/** Đối tác tự đăng ký: gửi thông tin + email → nhận email xác thực, tạo mật khẩu → DienVienVN duyệt. */
export function PartnerSignup() {
  const href = useDvvnHref();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company: '', partner_type: 'producer' as PartnerType, note: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  // Đến từ nút "Liên hệ" trên link shortlist: sau khi đăng nhập quay lại đúng link đó
  const [next, setNext] = useState(href('/doi-tac'));
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get('next');
    if (n && n.startsWith('/') && !n.startsWith('//')) setNext(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.full_name.trim().length < 2) return setError('Vui lòng nhập họ tên.');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Email chưa đúng định dạng.');
    if (form.phone.replace(/\D/g, '').length < 9) return setError('Số điện thoại chưa đúng.');
    setBusy(true);
    try {
      const res = await fetch('/api/dienvienvn/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) return setError(body.error || 'Không gửi được đăng ký. Vui lòng thử lại.');
      setDone(body.message);
    } catch {
      setError('Mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[var(--dv-bg-alt)] px-4 pb-20 pt-8 md:pt-14">
        <div className="mx-auto max-w-[560px]">
          <Link href={href('/doi-tac')} className="dv-link text-[14px]">
            <ChevronLeft className="h-4 w-4" /> Cổng đối tác
          </Link>
          {done ? (
            <div className="dv-card mt-6 px-6 py-10 text-center sm:px-10">
              <svg className="mx-auto h-[72px] w-[72px]" viewBox="0 0 56 56" aria-hidden="true">
                <circle className="dv-check-circle" cx="28" cy="28" r="26" fill="none" stroke="#1d1d1f" strokeWidth="2.5" />
                <path className="dv-check-mark" d="M17 29.5l7 7 15-16" fill="none" stroke="#1d1d1f" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h1 className="dv-display mt-5 text-[28px] font-semibold leading-[1.14]" role="status">
                Đã nhận đăng ký.
              </h1>
              <p className="mt-3 text-[15px] leading-[1.47] text-[var(--dv-text-secondary)]">
                {done} Hãy kiểm tra hộp thư (cả mục Spam) tại <span className="font-semibold text-[var(--dv-text)]">{form.email.trim()}</span>.
              </p>
              <Link href={next.includes('/nsx/') ? next : `${href('/')}#nha-san-xuat`} className="dv-btn dv-btn-secondary mt-8">
                {next.includes('/nsx/') ? 'Quay lại danh sách diễn viên' : 'Về trang chủ'}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="dv-display dv-headline mt-4">Đăng ký tài khoản đối tác.</h1>
              <p className="dv-subhead mt-2 text-[var(--dv-text-secondary)]">
                Dành cho đạo diễn, nhà sản xuất, casting director và agency. Đăng casting call, xem đầy đủ shortlist diễn viên và liên hệ diễn viên qua DienVienVN.
              </p>
              <div className="mt-6 flex flex-col gap-3 rounded-[18px] border border-[#1d1d1f] bg-white p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
                <p className="text-[15px] leading-[1.45]">
                  <span className="font-semibold">Bạn là diễn viên?</span> Form này dành cho nhà sản xuất / đạo diễn.
                </p>
                <Link href={href('/nop-ho-so')} className="dv-btn dv-btn-primary !h-10 shrink-0 !py-0 text-[14px]">
                  Nộp hồ sơ diễn viên tại đây <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <form onSubmit={submit} className="dv-card mt-4 space-y-5 p-6 md:p-8" noValidate>
                <Field label="Họ và tên" required htmlFor="ps-name">
                  <TextInput id="ps-name" autoComplete="name" value={form.full_name} onChange={e => set({ full_name: e.target.value })} />
                </Field>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Email" required htmlFor="ps-email" hint="Email nhận link kích hoạt">
                    <TextInput id="ps-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={e => set({ email: e.target.value })} />
                  </Field>
                  <Field label="Số điện thoại" required htmlFor="ps-phone">
                    <TextInput id="ps-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Bạn là" htmlFor="ps-type">
                    <SelectInput id="ps-type" value={form.partner_type} onChange={e => set({ partner_type: e.target.value as PartnerType })}>
                      {(Object.keys(PARTNER_TYPE_LABELS) as PartnerType[]).map(k => (
                        <option key={k} value={k}>
                          {PARTNER_TYPE_LABELS[k]}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Công ty / đơn vị" htmlFor="ps-company">
                    <TextInput id="ps-company" autoComplete="organization" value={form.company} onChange={e => set({ company: e.target.value })} />
                  </Field>
                </div>
                <Field label="Giới thiệu ngắn" htmlFor="ps-note" hint="Dự án đã / đang làm, nhu cầu casting… giúp DienVienVN duyệt nhanh hơn">
                  <textarea id="ps-note" rows={4} className="dv-input" value={form.note} onChange={e => set({ note: e.target.value })} />
                </Field>
                {/* Ô ẩn chống bot */}
                <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={e => set({ website: e.target.value })} />
                {error && (
                  <p role="alert" className="rounded-[12px] bg-[#fff0f0] p-3 text-[14px] text-[#b00020]">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={busy} className="dv-btn dv-btn-primary w-full">
                  {busy && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
                  Gửi đăng ký
                </button>
                <p className="text-center text-[13px] leading-[1.45] text-[var(--dv-text-secondary)]">
                  Sau khi gửi, bạn nhận email để xác nhận và tạo mật khẩu. DienVienVN xem xét từng đăng ký; khi được duyệt, bạn dùng được cổng đối tác.
                </p>
              </form>
              <p className="mt-6 text-center text-[14px] text-[var(--dv-text-secondary)]">
                Đã có tài khoản?{' '}
                <Link href={href(`/dang-nhap?next=${encodeURIComponent(next)}`)} className="font-semibold text-[var(--dv-text)] underline underline-offset-2">
                  Đăng nhập
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
