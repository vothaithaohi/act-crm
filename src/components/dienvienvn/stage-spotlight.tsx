'use client';

import { useEffect, useRef } from 'react';

/**
 * Ánh đèn sân khấu tông vàng ACT phủ lên phần mở đầu (trang chủ mới 02).
 * Đèn treo phía trên góc trái: bật lên chiếu cụm chữ bên trái → vài giây sau lia sang dải ảnh diễn viên bên phải
 * → quay lại cụm chữ; lặp lại mỗi 60 giây. Chuyển động theo kiểu lò xo (trễ, hơi lố rồi dừng) cộng rung nhẹ
 * và chỉnh góc ngẫu nhiên để giống người điều khiển đèn bằng tay, độ sáng chập chờn nhẹ như đèn thật.
 */
const GOLD = '212, 174, 106'; // #d4ae6a
const CYCLE = 60; // giây
// Lịch chiếu trong 1 chu kỳ (giây): bên trái → bên phải → bên trái
const ON_LEFT = 0;
const TO_RIGHT = 6.5;
const BACK_LEFT = 14;
const FADE_OUT = 58.6;
// Độ sáng thêm khi chiếu vào dải ảnh hồ sơ (0.5 = sáng hơn 50%)
const PHOTO_BOOST = 0.5;

type Pt = { x: number; y: number };

export function StageSpotlight({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = targetRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let left: Pt & { r: number } = { x: 0, y: 0, r: 200 };
    let right: Pt & { r: number } = { x: 0, y: 0, r: 200 };

    // Vị trí 2 vùng chiếu: cột chữ (trái) và dải ảnh (phải) của phần mở đầu
    const measure = () => {
      const rect = host.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const grid = host.querySelector('section > div') as HTMLElement | null;
      const cols = grid ? (Array.from(grid.children) as HTMLElement[]) : [];
      const box = (el?: HTMLElement) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2, r: Math.min(Math.max(r.width, r.height) * 0.42, 340) };
      };
      left = box(cols[0]) || { x: W * 0.28, y: H * 0.5, r: Math.min(W * 0.22, 320) };
      right = box(cols[1]) || { x: W * 0.72, y: H * 0.5, r: Math.min(W * 0.22, 320) };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);

    // Lò xo hơi thiếu giảm chấn: trễ khi bắt đầu lia, lố nhẹ rồi mới dừng
    const pos = { x: left.x, y: left.y, r: left.r };
    const vel = { x: 0, y: 0, r: 0 };
    // Chỉnh góc tay: mỗi vài giây lệch nhẹ một chút
    let nudge = { x: 0, y: 0 };
    let nextNudge = 2;
    let start = performance.now();
    let last = start;
    let raf = 0;

    const draw = (c: Pt & { r: number }, power: number) => {
      ctx.clearRect(0, 0, W, H);
      if (power <= 0.001) return;
      const src = { x: Math.max(24, W * 0.04), y: -H * 0.12 };
      const dx = c.x - src.x;
      const dy = c.y - src.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const rx = c.r;
      const ry = c.r * 0.82;

      ctx.globalCompositeOperation = 'lighter';
      // Chùm sáng: hình nón từ đèn tới vùng chiếu
      const beam = ctx.createLinearGradient(src.x, src.y, c.x, c.y);
      beam.addColorStop(0, `rgba(${GOLD}, ${0.2 * power})`);
      beam.addColorStop(0.55, `rgba(${GOLD}, ${0.07 * power})`);
      beam.addColorStop(1, `rgba(${GOLD}, ${0.1 * power})`);
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(src.x - nx * 6, src.y - ny * 6);
      ctx.lineTo(c.x - nx * rx * 0.95, c.y - ny * ry * 0.95);
      ctx.lineTo(c.x + nx * rx * 0.95, c.y + ny * ry * 0.95);
      ctx.lineTo(src.x + nx * 6, src.y + ny * 6);
      ctx.closePath();
      ctx.filter = 'blur(18px)';
      ctx.fill();

      // Xoá phần chùm sáng nằm trong vùng chiếu (mép mềm) để vệt tròn sáng đều, không bị chia đôi đậm / nhạt
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(1, ry / rx);
      const cut = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.05);
      cut.addColorStop(0, 'rgba(0,0,0,1)');
      cut.addColorStop(0.7, 'rgba(0,0,0,1)');
      cut.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cut;
      ctx.beginPath();
      ctx.arc(0, 0, rx * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';

      // Quầng sáng rộng
      ctx.filter = 'blur(30px)';
      const halo = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rx * 1.45);
      halo.addColorStop(0, `rgba(${GOLD}, ${0.1 * power})`);
      halo.addColorStop(1, `rgba(${GOLD}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, rx * 1.45, ry * 1.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vệt đèn trên "sàn" (vùng được chiếu)
      ctx.filter = 'blur(10px)';
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(1, ry / rx);
      const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      pool.addColorStop(0, `rgba(${GOLD}, ${0.26 * power})`);
      pool.addColorStop(0.6, `rgba(${GOLD}, ${0.16 * power})`);
      pool.addColorStop(0.9, `rgba(${GOLD}, ${0.05 * power})`);
      pool.addColorStop(1, `rgba(${GOLD}, 0)`);
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Đốm đèn ở nguồn
      ctx.filter = 'blur(6px)';
      const lamp = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, 60);
      lamp.addColorStop(0, `rgba(255, 236, 196, ${0.5 * power})`);
      lamp.addColorStop(1, `rgba(${GOLD}, 0)`);
      ctx.fillStyle = lamp;
      ctx.beginPath();
      ctx.arc(src.x, src.y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    };

    if (reduce) {
      // Không chuyển động: giữ một vệt sáng dịu trên cụm chữ
      draw(left, 0.8);
      return () => ro.disconnect();
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let t = (now - start) / 1000;
      if (t >= CYCLE) {
        start = now;
        t = 0;
      }

      // Đích theo lịch chiếu
      const goal = t >= TO_RIGHT && t < BACK_LEFT ? right : left;

      // Độ sáng: bật đèn (lóe nhẹ vài nhịp) → sáng ổn định → tắt dần cuối chu kỳ
      let power = 1;
      if (t < ON_LEFT + 1.4) {
        const k = (t - ON_LEFT) / 1.4;
        power = Math.min(1, k * k) * (k < 0.5 ? 0.6 + 0.4 * Math.sin(k * 40) : 1);
      } else if (t > FADE_OUT) {
        power = Math.max(0, 1 - (t - FADE_OUT) / (CYCLE - FADE_OUT));
      }
      // Chập chờn nhẹ như dây tóc đèn thật
      power *= 0.93 + 0.04 * Math.sin(now / 173) + 0.03 * Math.sin(now / 61 + 1.3);

      // Chỉnh góc tay khi đang đứng yên
      nextNudge -= dt;
      if (nextNudge <= 0) {
        nudge = { x: (Math.random() - 0.5) * goal.r * 0.18, y: (Math.random() - 0.5) * goal.r * 0.14 };
        nextNudge = 2.2 + Math.random() * 2.8;
      }
      // Rung tay rất nhẹ (tổng các sóng lệch pha, không đều như máy)
      const shake = {
        x: Math.sin(now / 410) * 3 + Math.sin(now / 157 + 2) * 1.6,
        y: Math.cos(now / 380 + 1) * 2.4 + Math.sin(now / 133) * 1.2
      };

      // Lò xo hơi thiếu giảm chấn → lia có trễ và lố nhẹ
      const K = 9;
      const DAMP = 4.2;
      const tx = goal.x + nudge.x;
      const ty = goal.y + nudge.y;
      vel.x += ((tx - pos.x) * K - vel.x * DAMP) * dt;
      vel.y += ((ty - pos.y) * K - vel.y * DAMP) * dt;
      vel.r += ((goal.r - pos.r) * K - vel.r * DAMP) * dt;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      pos.r += vel.r * dt;

      // Sáng hơn khi chiếu vào dải ảnh diễn viên (tăng dần theo vị trí đèn)
      const span = Math.hypot(right.x - left.x, right.y - left.y) || 1;
      const toward = Math.min(1, Math.max(0, ((pos.x - left.x) * (right.x - left.x) + (pos.y - left.y) * (right.y - left.y)) / (span * span)));
      draw({ x: pos.x + shake.x, y: pos.y + shake.y, r: Math.max(80, pos.r) }, power * (1 + PHOTO_BOOST * toward));
      raf = requestAnimationFrame(tick);
    };

    // Chỉ chạy khi phần mở đầu đang hiện trên màn hình
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [targetRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 mix-blend-screen" />;
}
