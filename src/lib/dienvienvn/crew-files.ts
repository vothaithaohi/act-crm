import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CREW_FILE_MAX_BYTES, CREW_MAX_COVERS, CREW_MAX_CVS, CrewApplication, CrewAttachments, CrewCv, CrewFileKind } from './crew-profiles';

/** Kho file riêng tư (CV, cover letter PDF). Xem qua link tạm có hạn, không có link công khai. */
export const CREW_BUCKET = 'crew-cv';
const SIGNED_TTL = 60 * 60; // 1 giờ

export const CREW_FILES_MISSING = 'Hệ thống chưa sẵn sàng lưu file (cần chạy migration 20261118_crew_portal.sql và 20261119_crew_files_v2.sql).';
export const maxOf = (kind: CrewFileKind) => (kind === 'cv' ? CREW_MAX_CVS : CREW_MAX_COVERS);
export const kindLabel = (kind: CrewFileKind) => (kind === 'cv' ? 'CV' : 'cover letter');

/** Nội dung có phải PDF không: "%PDF-" nằm trong 1024 byte đầu (một số trình xuất PDF chèn vài byte trước). */
export function looksLikePdf(head: Uint8Array): boolean {
  return Buffer.from(head.subarray(0, 1024)).toString('latin1').includes('%PDF-');
}

/** Đường dẫn file mới của tài khoản: <user_id>/<loại>/<uuid>.pdf */
export const newPath = (ownerId: string, kind: CrewFileKind) => `${ownerId}/${kind}/${crypto.randomUUID()}.pdf`;

/** Đường dẫn có thuộc thư mục của tài khoản này không (hoặc của hồ sơ ekip — file tải trước bản v2). */
export function ownsPath(owners: (string | null | undefined)[], path: string | null | undefined): boolean {
  if (!path || !/^[0-9a-f-]{36}\/(cv|cover)\/[0-9a-f-]{36}\.pdf$/i.test(path)) return false;
  return owners.some(o => !!o && path.startsWith(`${o}/`));
}

/** Kiểm tra file đã nằm trong kho, đúng PDF, không quá 10MB. Sai → xoá file. */
export async function verifyStoredPdf(db: SupabaseClient, path: string): Promise<{ ok: true; size: number } | { ok: false; error: string }> {
  const { data, error } = await db.storage.from(CREW_BUCKET).download(path);
  if (error || !data) return { ok: false, error: 'Chưa nhận được file. Vui lòng tải lại.' };
  const size = data.size;
  const head = new Uint8Array(await data.slice(0, 1024).arrayBuffer());
  if (size > CREW_FILE_MAX_BYTES || size === 0 || !looksLikePdf(head)) {
    await removePaths(db, [path]);
    return { ok: false, error: size > CREW_FILE_MAX_BYTES ? 'File vượt quá 10MB.' : 'File không phải PDF hợp lệ. Vui lòng xuất lại file PDF rồi tải lên.' };
  }
  return { ok: true, size };
}

/** Tải PDF qua máy chủ (đường dự phòng khi trình duyệt không tải thẳng lên kho được). */
export async function storePdf(db: SupabaseClient, path: string, buffer: Buffer): Promise<boolean> {
  const { error } = await db.storage.from(CREW_BUCKET).upload(path, buffer, { contentType: 'application/pdf', upsert: false });
  if (error) console.error('[dienvienvn] Lưu file ekip lỗi:', error.message);
  return !error;
}

/** Link xem tạm cho nhiều file một lần. */
export async function signPaths(db: SupabaseClient, paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const list = Array.from(new Set(paths.filter(Boolean))) as string[];
  const out = new Map<string, string>();
  if (!list.length) return out;
  const { data } = await db.storage.from(CREW_BUCKET).createSignedUrls(list, SIGNED_TTL);
  for (const d of data || []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

export async function removePaths(db: SupabaseClient, paths: string[]) {
  if (paths.length) await db.storage.from(CREW_BUCKET).remove(paths).catch(() => undefined);
}

export type CrewFileView = Omit<CrewCv, 'file_path' | 'crew_profile_id' | 'auth_user_id'> & { source: 'file' | 'link' | 'text'; url: string | null };

/** Điều kiện lọc file của tài khoản (theo tài khoản đăng nhập, hoặc theo hồ sơ ekip với file cũ). */
export function ownerFilter(userId: string | null | undefined, crewId: string | null | undefined) {
  return [userId ? `auth_user_id.eq.${userId}` : '', crewId ? `crew_profile_id.eq.${crewId}` : ''].filter(Boolean).join(',');
}

/** Kho CV + cover letter kèm link xem (file PDF → link tạm). */
export async function listFiles(db: SupabaseClient, userId: string | null | undefined, crewId: string | null | undefined): Promise<{ cvs: CrewFileView[]; covers: CrewFileView[] }> {
  const filter = ownerFilter(userId, crewId);
  if (!filter) return { cvs: [], covers: [] };
  const { data, error } = await db.from('crew_cvs').select('*').or(filter).order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data || []) as CrewCv[];
  const signed = await signPaths(db, rows.map(c => c.file_path));
  const views: CrewFileView[] = rows.map(({ file_path, crew_profile_id: _p, auth_user_id: _u, ...c }) => {
    void _p;
    void _u;
    return {
      ...c,
      kind: c.kind === 'cover' ? 'cover' : 'cv',
      source: file_path ? 'file' : c.link_url ? 'link' : 'text',
      url: file_path ? signed.get(file_path) || null : c.link_url
    };
  });
  return { cvs: views.filter(v => v.kind === 'cv'), covers: views.filter(v => v.kind === 'cover') };
}

/** CV + cover letter của từng lượt ứng tuyển, kèm link xem. */
export async function attachmentsFor(db: SupabaseClient, apps: CrewApplication[]): Promise<Map<string, CrewAttachments>> {
  const signed = await signPaths(db, apps.flatMap(a => [a.cv_path, a.cover_letter_path]));
  return new Map(
    apps.map(a => {
      const cvUrl = a.cv_path ? signed.get(a.cv_path) || null : a.cv_link || null;
      return [
        a.id,
        {
          cv: cvUrl ? { title: a.cv_title || 'CV', url: cvUrl } : null,
          cover_letter: a.cover_letter || null,
          cover_letter_url: a.cover_letter_path ? signed.get(a.cover_letter_path) || null : null
        }
      ];
    })
  );
}

/** Xoá file khỏi kho chỉ khi không còn lượt ứng tuyển nào đang dùng (NSX vẫn xem được bản đã nộp). */
export async function removeFileIfUnused(db: SupabaseClient, path: string | null) {
  if (!path) return;
  const [{ count: a }, { count: b }] = await Promise.all([
    db.from('crew_applications').select('id', { count: 'exact', head: true }).eq('cv_path', path),
    db.from('crew_applications').select('id', { count: 'exact', head: true }).eq('cover_letter_path', path)
  ]);
  if (!a && !b) await removePaths(db, [path]);
}
