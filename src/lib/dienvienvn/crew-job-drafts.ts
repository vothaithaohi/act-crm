import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { roleLabel } from './crew-taxonomy';

/** Bản nháp tin tuyển ekip (CRM: partner_id null; cổng đối tác: partner_id của đối tác). */
export interface CrewJobDraft {
  id: string;
  partner_id: string | null;
  title: string;
  form: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const DRAFTS_MISSING = 'Hệ thống chưa sẵn sàng lưu nháp (cần chạy migration 20261126_crew_job_drafts.sql).';
const MAX_BYTES = 200_000;
const COLUMNS = 'id, partner_id, title, created_by, updated_by, created_at, updated_at';
export const draftsMissing = (m?: string) => /crew_job_drafts|schema cache/i.test(m || '');

/** Tên hiển thị của bản nháp: các vị trí đã chọn, không thì tên dự án. */
function titleOf(form: Record<string, unknown>): string {
  const positions = Array.isArray(form.positions) ? (form.positions as Record<string, string>[]) : [];
  const roles = positions.map(p => roleLabel(p?.department, p?.role_title, p?.role_other)?.vi || '').filter(Boolean);
  const project = typeof form.project_name === 'string' ? form.project_name.trim() : '';
  return (roles.join(', ') || project || 'Tin chưa có tiêu đề').slice(0, 200);
}

export async function listDrafts(db: SupabaseClient, partnerId: string | null) {
  const q = db.from('crew_job_drafts').select(COLUMNS).order('updated_at', { ascending: false }).limit(100);
  const { data, error } = await (partnerId ? q.eq('partner_id', partnerId) : q.is('partner_id', null));
  return { drafts: (data || []) as Omit<CrewJobDraft, 'form'>[], error: error?.message };
}

export async function getDraft(db: SupabaseClient, partnerId: string | null, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const q = db.from('crew_job_drafts').select('*').eq('id', id);
  const { data } = await (partnerId ? q.eq('partner_id', partnerId) : q.is('partner_id', null)).maybeSingle();
  return (data as CrewJobDraft | null) || null;
}

/** Tạo / cập nhật bản nháp (không kiểm tra đủ thông tin). */
export async function saveDraft(
  db: SupabaseClient,
  partnerId: string | null,
  input: { id?: string | null; form: unknown },
  by: string
): Promise<{ draft: Omit<CrewJobDraft, 'form'> } | { error: string; status: number }> {
  const form = input.form;
  if (!form || typeof form !== 'object' || Array.isArray(form)) return { error: 'Nội dung nháp không hợp lệ.', status: 400 };
  if (JSON.stringify(form).length > MAX_BYTES) return { error: 'Bản nháp quá dài.', status: 400 };
  const row = { title: titleOf(form as Record<string, unknown>), form, updated_by: by, updated_at: new Date().toISOString() };
  if (input.id) {
    if (!/^[0-9a-f-]{36}$/i.test(input.id)) return { error: 'Không tìm thấy bản nháp.', status: 404 };
    const q = db.from('crew_job_drafts').update(row).eq('id', input.id);
    const { data, error } = await (partnerId ? q.eq('partner_id', partnerId) : q.is('partner_id', null)).select(COLUMNS).maybeSingle();
    if (error) return { error: draftsMissing(error.message) ? DRAFTS_MISSING : 'Không lưu được bản nháp.', status: 500 };
    // Bản nháp đã bị xoá (VD người khác đã đăng) → tạo bản mới
    if (data) return { draft: data as Omit<CrewJobDraft, 'form'> };
  }
  const { data, error } = await db
    .from('crew_job_drafts')
    .insert({ ...row, partner_id: partnerId, created_by: by })
    .select(COLUMNS)
    .single();
  if (error || !data) return { error: draftsMissing(error?.message) ? DRAFTS_MISSING : 'Không lưu được bản nháp.', status: 500 };
  return { draft: data as Omit<CrewJobDraft, 'form'> };
}

export async function deleteDraft(db: SupabaseClient, partnerId: string | null, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const q = db.from('crew_job_drafts').delete().eq('id', id);
  await (partnerId ? q.eq('partner_id', partnerId) : q.is('partner_id', null));
}
