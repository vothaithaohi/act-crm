// Giới hạn đơn giản chống spam theo IP (bộ nhớ của từng instance server).
const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter(t => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  return recent.length > max;
}

/** Chỉ đếm (không ghi thêm): đã vượt quá max lần trong khoảng windowMs chưa. */
export function isBlocked(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  return (buckets.get(key) || []).filter(t => now - t < windowMs).length >= max;
}

/** Ghi nhận 1 lần (VD: 1 lần thử link sai). */
export function recordHit(key: string): void {
  const now = Date.now();
  buckets.set(key, [...(buckets.get(key) || []).filter(t => now - t < 24 * 60 * 60 * 1000), now]);
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
