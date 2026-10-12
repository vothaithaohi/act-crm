import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { castingDraftSchema } from '@/lib/dienvienvn/draft-schema';
import { CASTING_STEPS, CastingDraft, draftToTalentProfile, validateStep } from '@/lib/dienvienvn/casting-form';

// Giới hạn đơn giản chống spam: tối đa 5 lần nộp / 10 phút / IP (theo từng instance server).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

const REVIEW_COLUMNS = ['submission_source', 'review_status', 'review_notes', 'submitted_at'] as const;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  // Honeypot: trường ẩn mà người thật không bao giờ điền.
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true, id: crypto.randomUUID(), stored: 'supabase' });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ít phút.' }, { status: 429 });
  }

  const parsed = castingDraftSchema.safeParse((body as Record<string, unknown>)?.draft);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Thông tin chưa hợp lệ (${first?.path.join('.') || 'hồ sơ'}): ${first?.message}` },
      { status: 400 }
    );
  }

  const draft = parsed.data as CastingDraft;
  if (!draft.consent) {
    return NextResponse.json({ error: 'Vui lòng đồng ý với điều khoản sử dụng thông tin trước khi nộp.' }, { status: 400 });
  }

  for (const step of CASTING_STEPS) {
    const errors = validateStep(step.id, draft);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      return NextResponse.json({ error: `Bước ${step.id} (${step.title}): ${firstError}`, step: step.id }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  const record = {
    ...draftToTalentProfile(draft),
    id: crypto.randomUUID(),
    submission_source: 'dienvienvn' as const,
    review_status: 'pending' as const,
    review_notes: null,
    submitted_at: now,
    created_at: now,
    updated_at: now
  };

  const supabase = getSupabase();
  if (!supabase) {
    // Chế độ demo chưa cấu hình Supabase: trả bản ghi để trình duyệt lưu vào kho dữ liệu cục bộ của CRM.
    return NextResponse.json({ ok: true, id: record.id, stored: 'local', profile: record });
  }

  let { error } = await supabase.from('talent_profiles').insert(record);

  // Nếu database chưa chạy migration thêm cột duyệt hồ sơ, vẫn lưu hồ sơ để không mất dữ liệu.
  if (error && REVIEW_COLUMNS.some(col => error?.message?.includes(col))) {
    console.error('[dienvienvn] Thiếu cột duyệt hồ sơ, hãy chạy migration 20261012_dienvienvn_submissions.sql:', error.message);
    const fallback: Record<string, unknown> = { ...record };
    REVIEW_COLUMNS.forEach(col => delete fallback[col]);
    ({ error } = await supabase.from('talent_profiles').insert(fallback));
  }

  if (error) {
    console.error('[dienvienvn] Không lưu được hồ sơ casting:', error);
    return NextResponse.json(
      { error: 'Hệ thống đang bận, hồ sơ chưa được lưu. Vui lòng thử lại sau ít phút.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: record.id, stored: 'supabase' });
}
