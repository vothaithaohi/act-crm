import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TalentProfile, getReviewStatus } from '@/lib/types/crm';
import { BrevoContact, ensureActorAttributes, syncBrevoContact } from './brevo';
import { provinceLabel } from './provinces';
import { isTestAccount } from './test-accounts';

// Diễn viên → Brevo kèm các trường để lọc: giới tính, tuổi, tỉnh thành, kinh nghiệm, đã học ACT, giọng, ngoại ngữ,
// và DỰ ÁN / VAI ĐÃ ỨNG TUYỂN (VD lọc DU_AN_UNG_TUYEN chứa "DV-07" = mọi diễn viên đã ứng tuyển dự án DV-07).

type Project = { id: string; code: string; title: string; roles: { id: string; name: string }[] | null };
type Application = { talent_id: string; project_id: string; role_id: string };

const GENDER: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const REVIEW: Record<string, string> = { approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Chưa duyệt' };
const clip = (s: string) => (s.length > 1900 ? `${s.slice(0, 1897)}…` : s);

function experienceCount(t: Partial<TalentProfile>): number {
  const e = t.acting_experience as unknown as Record<string, unknown[]> | undefined;
  if (!e || typeof e !== 'object') return 0;
  return Object.values(e).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
}

/** Thông tin lọc của 1 diễn viên (chỉ gửi trường có giá trị). */
export function actorBrevoExtra(t: Partial<TalentProfile>, apps: Application[], projects: Map<string, Project>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (t.gender && GENDER[t.gender]) out.GIOI_TINH = GENDER[t.gender];
  const year = Number((t.dob || '').slice(0, 4));
  if (year > 1900) {
    out.NAM_SINH = year;
    const d = new Date(t.dob as string);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
    if (age > 0 && age < 120) out.TUOI = age;
  }
  const place = t.province || t.city;
  if (place) out.TINH_THANH = provinceLabel(place);
  if (t.height_cm) out.CHIEU_CAO = Number(t.height_cm);
  const exp = experienceCount(t);
  out.SO_DU_AN_DA_DONG = exp;
  out.CO_KINH_NGHIEM = exp > 0 ? 'Có' : 'Chưa';
  const ac = t.academic_profile;
  const actLevel = ac?.highest_act_level || (ac?.enrollments?.length ? 'Có' : '');
  out.HOC_ACT = actLevel ? 'Có' : 'Chưa';
  if (ac?.highest_act_level) out.CAP_DO_ACT = ac.highest_act_level;
  const accents = (t.vietnamese_accents || []).map(a => a?.accent).filter(Boolean);
  if (accents.length) out.GIONG_VUNG_MIEN = accents.join(', ');
  const langs = (t.languages || []).map(l => l?.language).filter(Boolean);
  if (langs.length) out.NGOAI_NGU = langs.join(', ');
  out.TRANG_THAI_HO_SO = REVIEW[getReviewStatus(t as TalentProfile)] || 'Chờ duyệt';
  out.HIEN_CONG_KHAI = t.public_profile && !t.public_locked && t.username ? 'Có' : 'Không';
  out.NGUON_HO_SO = t.submission_source === 'dienvienvn' ? 'Tự nộp trên web' : t.submission_source === 'ai' ? 'AI tạo' : 'ACT nhập';

  // Dự án / vai đã ứng tuyển: "DV-07 Dragon Back (HCM) | DV-08 …" và "DV-07: Cậu bé anh cả - Trung | …"
  const mine = apps.filter(a => a.talent_id === t.id);
  out.SO_LAN_UNG_TUYEN = mine.length;
  const projectNames = new Set<string>();
  const roleNames: string[] = [];
  for (const a of mine) {
    const p = projects.get(a.project_id);
    if (!p) continue;
    projectNames.add(`${p.code} ${p.title}`.trim());
    const role = (p.roles || []).find(r => r.id === a.role_id);
    roleNames.push(`${p.code}: ${role?.name || 'vai đã gỡ'}`);
  }
  out.DU_AN_UNG_TUYEN = clip(Array.from(projectNames).join(' | '));
  out.VAI_UNG_TUYEN = clip(roleNames.join(' | '));
  return out;
}

/** Cập nhật 1 diễn viên lên Brevo (sau khi nộp hồ sơ / sửa hồ sơ / ứng tuyển). Không bao giờ ném lỗi. */
export async function syncActorToBrevo(db: SupabaseClient, talentId: string): Promise<void> {
  try {
    if (!process.env.BREVO_API_KEY) return;
    const { data: t } = await db.from('talent_profiles').select('*').eq('id', talentId).maybeSingle();
    if (!t?.email || /\+dvvn-test-/i.test(t.email) || isTestAccount({ full_name: t.full_name, email: t.email })) return;
    const { data: apps } = await db.from('project_applications').select('talent_id, project_id, role_id').eq('talent_id', talentId);
    const ids = Array.from(new Set((apps || []).map(a => a.project_id as string)));
    const { data: projects } = ids.length ? await db.from('casting_projects').select('id, code, title, roles').in('id', ids) : { data: [] };
    const map = new Map(((projects || []) as Project[]).map(p => [p.id, p]));
    await ensureActorAttributes();
    const contact: BrevoContact = { email: t.email, name: t.full_name, phone: t.phone, extra: actorBrevoExtra(t, (apps || []) as Application[], map) };
    await syncBrevoContact('actor', contact);
  } catch (e) {
    console.error('[dienvienvn] Brevo: lỗi cập nhật diễn viên', e);
  }
}

/** Dữ liệu cho nút "Đồng bộ Brevo" (toàn bộ diễn viên kèm trường lọc). */
export async function loadActorBrevoContacts(db: SupabaseClient): Promise<BrevoContact[]> {
  const page = async <T,>(table: string, cols: string): Promise<T[]> => {
    const out: T[] = [];
    for (let from = 0; from < 50_000; from += 1000) {
      const { data } = await db.from(table).select(cols).range(from, from + 999);
      out.push(...((data || []) as T[]));
      if (!data || data.length < 1000) break;
    }
    return out;
  };
  const [talents, apps, projects] = await Promise.all([
    page<TalentProfile>(
      'talent_profiles',
      'id, email, full_name, phone, gender, dob, province, city, height_cm, acting_experience, academic_profile, vietnamese_accents, languages, review_status, public_profile, public_locked, username, submission_source'
    ),
    page<Application>('project_applications', 'talent_id, project_id, role_id'),
    page<Project>('casting_projects', 'id, code, title, roles')
  ]);
  const map = new Map(projects.map(p => [p.id, p]));
  return talents.map(t => ({ email: t.email || '', name: t.full_name, phone: t.phone, extra: actorBrevoExtra(t, apps, map) }));
}
