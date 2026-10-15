// Tên miền công khai của DienVienVN. Khi truy cập qua các host này, toàn bộ đường dẫn được
// phục vụ từ /dienvienvn (VD: dienvienvn.com/nop-ho-so -> /dienvienvn/nop-ho-so).
export const PUBLIC_HOSTS = (process.env.DIENVIENVN_HOSTS || 'dienvienvn.com,www.dienvienvn.com')
  .split(',')
  .map(h => h.trim().toLowerCase())
  .filter(Boolean);

export function requestHost(headers: Headers): string {
  return (headers.get('x-forwarded-host') || headers.get('host') || '').split(',')[0].trim().toLowerCase();
}

/** Đường dẫn gốc của trang DienVienVN theo host đang truy cập (VD: https://dienvienvn.com hoặc https://x.vercel.app/dienvienvn). */
export function publicSiteUrl(headers: Headers): string {
  const host = requestHost(headers);
  const proto = headers.get('x-forwarded-proto')?.split(',')[0].trim() || (host.startsWith('localhost') ? 'http' : 'https');
  const base = PUBLIC_HOSTS.includes(host.split(':')[0]) ? '' : '/dienvienvn';
  return `${proto}://${host}${base}`;
}

/** Địa chỉ chính thức (canonical) của DienVienVN. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dienvienvn.com').replace(/\/$/, '');

export function isPublicHost(headers: Headers): boolean {
  return PUBLIC_HOSTS.includes(requestHost(headers).split(':')[0]);
}

/** Các trang công khai được phép index (đường dẫn trên tên miền dienvienvn.com). */
export const INDEXABLE_PATHS = ['/', '/nop-ho-so'];

/** Tên miền riêng của CRM; dienvienvn.com/admin chuyển hướng tới đây. */
export const CRM_HOST = (process.env.CRM_HOST || 'admin.dienvienvn.com').trim().toLowerCase();
