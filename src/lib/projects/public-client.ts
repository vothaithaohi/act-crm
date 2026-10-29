'use client';

// Truy cập dữ liệu dự án từ trang công khai. Chế độ demo (chưa cấu hình Supabase) dùng localStorage
// của cùng trình duyệt với CRM để chạy thử trọn luồng.
import { TalentProfile } from '@/lib/types/crm';
import { AuthRequiredError, actorFetch } from '@/lib/dienvienvn/actor-auth';
import { ProducerView, buildProducerView } from './producer';
import {
  CastingProject,
  LOCAL_APPLICATIONS_KEY,
  LOCAL_PROJECTS_KEY,
  LOCAL_TALENTS_KEYS,
  ProjectApplication,
  PublicProject,
  checkApplication,
  matchesProjectSlug,
  producerTokenFromParam,
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
  const res = await actorFetch('/api/dienvienvn/projects');
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthRequiredError(data.error);
  if (data.mode === 'demo') {
    return readLocal<CastingProject>(LOCAL_PROJECTS_KEY)
      .filter(p => p.status === 'open')
      .map(toPublicProject);
  }
  if (!res.ok) throw new Error(data.error || 'Không tải được danh sách dự án.');
  return data.projects || [];
}

export async function fetchPublicProject(id: string): Promise<PublicProject | null> {
  const res = await actorFetch(`/api/dienvienvn/projects?id=${encodeURIComponent(id)}`);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthRequiredError(data.error);
  if (data.mode === 'demo') {
    const p = readLocal<CastingProject>(LOCAL_PROJECTS_KEY).find(x => (x.id === id || matchesProjectSlug(id, x)) && x.status !== 'draft');
    return p ? toPublicProject(p) : null;
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(data.error || 'Không tải được dự án.');
  return data.project || null;
}

export interface ApplyInput {
  project_id: string;
  role_id: string;
  selftape_url: string;
  note: string;
}

export type ApplyResult = { ok: true; full_name: string } | { ok: false; error: string; authRequired?: boolean };

/** Diễn viên đã đăng nhập ứng tuyển một vai bằng hồ sơ của mình. */
export async function applyToRole(input: ApplyInput): Promise<ApplyResult> {
  const res = await actorFetch('/api/dienvienvn/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const data = await res.json().catch(() => ({}));
  if (data.mode === 'demo') return { ok: false, error: 'Chế độ demo: hãy ứng tuyển bằng cách điền hồ sơ mới.' };
  if (!res.ok || !data.ok) return { ok: false, error: data.error || 'Không gửi được đơn ứng tuyển.', authRequired: res.status === 401 };
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
    const secret = producerTokenFromParam(token);
    const project = readLocal<CastingProject>(LOCAL_PROJECTS_KEY).find(p => p.share_token === secret);
    if (!project) return null;
    return buildProducerView(project, readLocal<ProjectApplication>(LOCAL_APPLICATIONS_KEY), localTalents());
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(data.error || 'Không tải được danh sách ứng viên.');
  return { project: data.project, applicants: data.applicants };
}
