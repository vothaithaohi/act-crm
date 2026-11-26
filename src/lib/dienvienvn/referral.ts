// Referral: link dienvienvn.com/...?ref=<mã> → nhớ mã 30 ngày trên máy khách (người giới thiệu đầu tiên được tính),
// lưu vào hồ sơ khi nộp. utm_source / utm_medium / utm_campaign (quảng cáo) cũng được nhớ như vậy.

export const REF_COOKIE = 'dvvn_ref';
export const UTM_COOKIE = 'dvvn_utm';
export const REF_MAX_AGE = 30 * 24 * 60 * 60;

/** Mã giới thiệu hợp lệ: chữ thường không dấu, số, "-" "_", 2–40 ký tự. */
export function cleanRefCode(raw: string | null | undefined): string | null {
  const v = (raw || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  return /^[a-z0-9][a-z0-9_-]{1,39}$/.test(v) ? v : null;
}

const cleanUtm = (v: string | null | undefined) => (v || '').trim().slice(0, 100);

export type RefCookie = { code: string; at: string };
export type UtmCookie = { source: string; medium: string; campaign: string; at: string };

const safeDecode = (v: string) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

export const encodeRef = (r: RefCookie) => `${r.code}|${r.at}`;
export function decodeRef(v: string | undefined): RefCookie | null {
  if (!v) return null;
  const [code, at] = safeDecode(v).split('|');
  const c = cleanRefCode(code);
  return c ? { code: c, at: at && !isNaN(Date.parse(at)) ? at : new Date().toISOString() } : null;
}

export const encodeUtm = (u: UtmCookie) => JSON.stringify(u);
export function decodeUtm(v: string | undefined): UtmCookie | null {
  if (!v) return null;
  try {
    const u = JSON.parse(safeDecode(v));
    const source = cleanUtm(u?.source);
    if (!source) return null;
    return { source, medium: cleanUtm(u?.medium), campaign: cleanUtm(u?.campaign), at: isNaN(Date.parse(u?.at)) ? new Date().toISOString() : u.at };
  } catch {
    return null;
  }
}

/** Đọc ?ref= / ?utm_* trên đường dẫn. */
export function readTouch(params: URLSearchParams): { ref: string | null; utm: Omit<UtmCookie, 'at'> | null } {
  const ref = cleanRefCode(params.get('ref'));
  const source = cleanUtm(params.get('utm_source'));
  return {
    ref,
    utm: source ? { source, medium: cleanUtm(params.get('utm_medium')), campaign: cleanUtm(params.get('utm_campaign')) } : null
  };
}

/** Các cột nguồn giới thiệu lưu vào hồ sơ khi nộp. */
export function referralColumns(cookies: { get(name: string): { value: string } | undefined }, note: unknown) {
  const ref = decodeRef(cookies.get(REF_COOKIE)?.value);
  const utm = decodeUtm(cookies.get(UTM_COOKIE)?.value);
  const n = typeof note === 'string' ? note.trim().slice(0, 120) : '';
  return {
    referral_code: ref?.code ?? null,
    referral_note: n || null,
    utm_source: utm?.source || null,
    utm_medium: utm?.medium || null,
    utm_campaign: utm?.campaign || null,
    referred_at: ref?.at ?? utm?.at ?? null
  };
}

export const REFERRAL_MISSING = 'Chưa có bảng người giới thiệu. Hãy chạy migration 20261203_referrals.sql trên Supabase.';
