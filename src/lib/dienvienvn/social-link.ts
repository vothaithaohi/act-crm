// Chuẩn hoá link người dùng gõ: tự thêm https://, hiểu tên tài khoản (@abc), coi "không sử dụng"… là để trống.

export type LinkKind = 'facebook' | 'instagram' | 'tiktok' | 'showreel' | 'generic';

/** "không sử dụng", "không có", "ko có", "chưa có", "không", "-", "x", "none"… = để trống */
const NONE = /^(?:(?:không|khong|ko|k|chưa|chua)(?:\s+(?:có|co|sử dụng|su dung|dùng|dung|xài|xai))?|-+|\.+|x|n\/?a|none|no|null|nil)\.?$/i;
const HANDLE = /^@?([A-Za-z0-9._-]{1,60})$/;
const HOME: Partial<Record<LinkKind, (h: string) => string>> = {
  facebook: h => `https://www.facebook.com/${h}`,
  instagram: h => `https://www.instagram.com/${h}`,
  tiktok: h => `https://www.tiktok.com/@${h}`
};

/** Kết quả: link đầy đủ (https://…), '' (để trống), hoặc null nếu không hiểu được nội dung. */
export function normalizeLink(raw: string | null | undefined, kind: LinkKind = 'generic'): string | null {
  const v = (raw || '').trim().replace(/\s+/g, ' ');
  if (!v || NONE.test(v)) return '';
  if (/^https?:\/\/\S+$/i.test(v)) return v;
  if (/^\/\//.test(v) && !/\s/.test(v)) return `https:${v}`;
  // Có tên miền (www.tiktok.com/@abc, youtu.be/xyz) → thêm https://
  if (!/\s/.test(v) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v)) return `https://${v}`;
  // Tên tài khoản (@abc / abc) ở ô Facebook / Instagram / TikTok
  const h = HANDLE.exec(v);
  const make = HOME[kind];
  if (h && make) return make(h[1]);
  return null;
}

/** Dùng khi lưu: không hiểu được thì bỏ trống (ô mạng xã hội không bắt buộc). */
export const cleanLink = (raw: string | null | undefined, kind: LinkKind = 'generic') => normalizeLink(raw, kind) ?? '';
