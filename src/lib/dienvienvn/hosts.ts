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
