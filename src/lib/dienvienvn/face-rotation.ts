'use client';

// Xoay vòng gương mặt trên trang chủ cho công bằng: mỗi lần vào trang / F5 bốc ngẫu nhiên,
// không lặp lại hồ sơ đã hiện (trên máy này) cho tới khi đã đi hết toàn bộ hồ sơ, rồi bắt đầu vòng mới.

const KEY = 'dvvn-faces-seen';

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function readSeen(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Array.from(seen)));
  } catch {
    /* trình duyệt chặn lưu trữ: vẫn ngẫu nhiên, chỉ không nhớ được vòng */
  }
}

/** Bốc `count` gương mặt khác nhau: ưu tiên hồ sơ chưa hiện trong vòng hiện tại; hết thì sang vòng mới. */
export function pickRotatingFaces<T extends { username: string }>(pool: T[], count: number, exclude: string[] = []): T[] {
  // exclude: gương mặt đang hiện ở section khác trên cùng trang (không hiện trùng)
  const skip = new Set(exclude);
  const unique = Array.from(new Map(pool.filter(f => !skip.has(f.username)).map(f => [f.username, f])).values());
  if (!unique.length) return [];
  const n = Math.min(count, unique.length);
  let seen = readSeen();
  // Bỏ các hồ sơ không còn trong kho (đã gỡ / ẩn)
  seen = new Set(Array.from(seen).filter(u => pool.some(f => f.username === u)));

  const fresh = shuffle(unique.filter(f => !seen.has(f.username)));
  let picked = fresh.slice(0, n);
  if (picked.length < n) {
    // Đã đi hết vòng: bắt đầu vòng mới, bù phần còn thiếu (không trùng với phần vừa bốc)
    seen = new Set();
    const taken = new Set(picked.map(f => f.username));
    picked = [...picked, ...shuffle(unique.filter(f => !taken.has(f.username))).slice(0, n - picked.length)];
  }
  picked.forEach(f => seen.add(f.username));
  if (seen.size >= new Set(pool.map(f => f.username)).size) seen = new Set();
  writeSeen(seen);
  return picked;
}
