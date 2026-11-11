import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRODUCER_DECISIONS, ProducerDecision } from './types';

/** Đọc { application_id, decision } từ body; decision null = bỏ đánh dấu. */
export function parseDecisionBody(body: unknown): { applicationId: string; decision: ProducerDecision | null } | null {
  const b = (body || {}) as { application_id?: unknown; decision?: unknown };
  const applicationId = typeof b.application_id === 'string' ? b.application_id : '';
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) return null;
  if (b.decision === null || b.decision === '') return { applicationId, decision: null };
  if (typeof b.decision !== 'string' || !PRODUCER_DECISIONS.includes(b.decision as ProducerDecision)) return null;
  return { applicationId, decision: b.decision as ProducerDecision };
}

/** Lưu lựa chọn của NSX cho 1 ứng viên — chỉ khi đơn thuộc đúng dự án và đang hiện với NSX (không bị ACT "Loại"). */
export async function saveProducerDecision(
  db: SupabaseClient,
  projectId: string,
  applicationId: string,
  decision: ProducerDecision | null,
  allowedStatuses?: string[]
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: app } = await db.from('project_applications').select('id, project_id, status').eq('id', applicationId).maybeSingle();
  const visible = app && app.project_id === projectId && app.status !== 'rejected' && (!allowedStatuses || allowedStatuses.includes(app.status));
  if (!visible) return { ok: false, status: 404, error: 'Không tìm thấy ứng viên trong dự án này.' };
  const { error } = await db
    .from('project_applications')
    .update({ producer_decision: decision, producer_decided_at: decision ? new Date().toISOString() : null })
    .eq('id', applicationId);
  if (error) {
    const missing = /producer_decision/.test(error.message || '');
    return { ok: false, status: 500, error: missing ? 'Hệ thống chưa sẵn sàng lưu lựa chọn. Vui lòng báo DienVienVN.' : 'Không lưu được lựa chọn. Vui lòng thử lại.' };
  }
  return { ok: true };
}
