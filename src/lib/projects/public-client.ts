'use client';

// Truy cập dữ liệu dự án từ trang công khai. Chế độ demo (chưa cấu hình Supabase) dùng localStorage
// của cùng trình duyệt với CRM để chạy thử trọn luồng.
import { TalentProfile } from '@/lib/types/crm';
import { normalizePhone } from '@/lib/dienvienvn/casting-form';
import { ProducerView, buildProducerView } from './producer';
import {
  CastingProject,
  LOCAL_APPLICATIONS_KEY,
  LOCAL_PROJECTS_KEY,
  LOCAL_TALENTS_KEYS,
  ProjectApplication,
  PublicProject,
  checkApplication,
  readLocal,
  toPublicProject,
  writeLocal
} from './types';

function localTalents(): TalentProfile[] {
  const map = new Map<string, TalentProfile>();
  LOCAL_TALENTS_KEYS.forEach(k => readLocal<TalentProfile>(k).forEach(t => t?.id && map.set(t.id, t)));
  return Array.from(map.values());
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export async function fetchPublicProjects(): Promise<PublicProject[]> {
  const res = await fetch('/api/dienvienvn/projects', { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (data.mode === 'demo') {
    return readLocal<CastingProject>(LOCAL_PROJECTS_KEY)
      .filter(p => p.status === 'open')
      .map(toPublicProject);
  }
  if (!res.ok) throw new Error(data.error || 'Không tải được danh sách dự án.');
  return data.projects || [];
}

export async function fetchPublicProject(id: string): Promise<PublicProject | null> {
  const res = await fetch(`/api/dienvienvn/projects?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (data.mode === 'demo') {
    const p = readLocal<CastingProject>(LOCAL_PROJECTS_KEY).find(x => x.id === id && x.status !== 'draft');
    return p ? toPublicProject(p) : null;
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(data.error || 'Không tải được dự án.');
  return data.project || null;
}

export interface QuickApplyInput {
  project_id: string;
  role_id: string;
  phone: string;
  dob: string;
  selftape_url: string;
  note: string;
}

export type QuickApplyResult = { ok: true; full_name: string } | { ok: false; error: string; notFound?: boolean };

export async function quickApply(input: QuickApplyInput): Promise<QuickApplyResult> {
  const res = await fetch('/api/dienvienvn/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const data = await res.json().catch(() => ({}));

  if (data.mode === 'demo') {
    const project = readLocal<CastingProject>(LOCAL_PROJECTS_KEY).find(p => p.id === input.project_id);
    if (!project) return { ok: false, error: 'Không tìm thấy dự án.' };
    const problem = checkApplication(project, input.role_id, input.selftape_url);
    if (problem) return { ok: false, error: problem };
    const phone = normalizePhone(input.phone);
    const talent = localTalents().find(t => t.dob === input.dob && normalizePhone(t.phone || '') === phone);
    if (!talent) {
      return {
        ok: false,
        notFound: true,
        error: 'Không tìm thấy hồ sơ khớp số điện thoại và ngày sinh. Bạn hãy nộp hồ sơ mới để ứng tuyển.'
      };
    }
    const apps = readLocal<ProjectApplication>(LOCAL_APPLICATIONS_KEY);
    if (apps.some(a => a.project_id === input.project_id && a.role_id === input.role_id && a.talent_id === talent.id)) {
      return { ok: false, error: 'Bạn đã ứng tuyển vai này rồi.' };
    }
    saveLocalApplication({
      project_id: input.project_id,
      role_id: input.role_id,
      talent_id: talent.id,
      selftape_url: input.selftape_url || null,
      note: input.note || null
    });
    return { ok: true, full_name: talent.full_name };
  }

  if (!res.ok || !data.ok) return { ok: false, error: data.error || 'Không gửi được đơn ứng tuyển.', notFound: !!data.notFound };
  return { ok: true, full_name: data.full_name || '' };
}

/** Lưu đơn ứng tuyển vào kho tạm (chế độ demo). */
export function saveLocalApplication(a: Pick<ProjectApplication, 'project_id' | 'role_id' | 'talent_id' | 'selftape_url' | 'note'>) {
  const now = new Date().toISOString();
  const apps = readLocal<ProjectApplication>(LOCAL_APPLICATIONS_KEY);
  writeLocal(LOCAL_APPLICATIONS_KEY, [{ ...a, id: newId(), status: 'applied', created_at: now, updated_at: now }, ...apps]);
}

/** Kiểm tra đơn ứng tuyển kèm hồ sơ mới ở chế độ demo (server không đọc được localStorage). */
export function checkLocalApplication(projectId: string, roleId: string, selftape: string): string | null {
  const project = readLocal<CastingProject>(LOCAL_PROJECTS_KEY).find(p => p.id === projectId);
  if (!project) return 'Dự án ứng tuyển không còn tồn tại.';
  return checkApplication(project, roleId, selftape);
}

export async function fetchProducerView(token: string): Promise<ProducerView | null> {
  const res = await fetch(`/api/dienvienvn/producer/${encodeURIComponent(token)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (data.mode === 'demo') {
    const project = readLocal<CastingProject>(LOCAL_PROJECTS_KEY).find(p => p.share_token === token);
    if (!project) return null;
    return buildProducerView(project, readLocal<ProjectApplication>(LOCAL_APPLICATIONS_KEY), localTalents());
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(data.error || 'Không tải được danh sách ứng viên.');
  return { project: data.project, applicants: data.applicants };
}
