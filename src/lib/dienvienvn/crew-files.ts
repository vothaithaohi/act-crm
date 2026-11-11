import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CREW_FILE_MAX_BYTES, CrewApplication, CrewAttachments, CrewCv } from './crew-profiles';

/** Kho file riêng tư (CV, cover letter PDF). Xem qua link tạm có hạn, không có link công khai. */
export const CREW_BUCKET = 'crew-cv';
const SIGNED_TTL = 60 * 60; // 1 giờ

export const CREW_FILES_MISSING = 'Hệ thống chưa sẵn sàng lưu CV (cần chạy migration 20261118_crew_portal.sql).';

/** Kiểm tra file tải lên: chỉ PDF (cả đuôi lẫn nội dung bắt đầu bằng %PDF), tối đa 4MB. */
export async function readPdf(file: FormDataEntryValue | null): Promise<{ buffer: Buffer; name: string; size: number } | { error: string }> {
  if (!(file instanceof File)) return { error: 'Chưa chọn file.' };
  if (file.size > CREW_FILE_MAX_BYTES) return { error: 'File vượt quá 4MB.' };
  if (file.size === 0) return { error: 'File trống.' };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') return { error: 'Chỉ nhận file PDF.' };
  const name = (file.name || 'cv.pdf').replace(/[\u0000-\u001f]/g, '').slice(0, 120) || 'cv.pdf';
  return { buffer, name, size: file.size };
}

/** Lưu PDF vào thư mục riêng của hồ sơ ekip: <crew_id>/<loại>/<uuid>.pdf */
export async function storePdf(db: SupabaseClient, crewId: string, folder: 'cv' | 'cover', buffer: Buffer): Promise<string | null> {
  const path = `${crewId}/${folder}/${crypto.randomUUID()}.pdf`;
  const { error } = await db.storage.from(CREW_BUCKET).upload(path, buffer, { contentType: 'application/pdf', upsert: false });
  if (error) {
    console.error('[dienvienvn] Lưu file ekip lỗi:', error.message);
    return null;
  }
  return path;
}

/** Đường dẫn có thuộc thư mục của đúng hồ sơ này không (chặn dùng file của người khác). */
export const ownsPath = (crewId: string, path: string | null | undefined) =>
  !!path && path.startsWith(`${crewId}/`) && !path.includes('..') && /^[0-9a-f-]{36}\/(cv|cover)\/[0-9a-f-]{36}\.pdf$/i.test(path);

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

export type CrewCvView = Omit<CrewCv, 'file_path' | 'crew_profile_id'> & { kind: 'file' | 'link'; url: string | null };

/** Kho CV kèm link xem (file PDF → link tạm). */
export async function listCvs(db: SupabaseClient, crewId: string): Promise<CrewCvView[]> {
  const { data } = await db.from('crew_cvs').select('*').eq('crew_profile_id', crewId).order('created_at', { ascending: true });
  const cvs = (data || []) as CrewCv[];
  const signed = await signPaths(db, cvs.map(c => c.file_path));
  return cvs.map(({ file_path, crew_profile_id: _p, ...c }) => {
    void _p;
    return { ...c, kind: file_path ? 'file' : 'link', url: file_path ? signed.get(file_path) || null : c.link_url };
  });
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

/** Xoá file CV khỏi kho chỉ khi không còn lượt ứng tuyển nào đang dùng (NSX vẫn xem được bản đã nộp). */
export async function removeCvFileIfUnused(db: SupabaseClient, cv: Pick<CrewCv, 'file_path'>) {
  if (!cv.file_path) return;
  const { count } = await db.from('crew_applications').select('id', { count: 'exact', head: true }).eq('cv_path', cv.file_path);
  if (!count) await removePaths(db, [cv.file_path]);
}
