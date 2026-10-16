import 'server-only';
import { getServiceDb } from '@/lib/projects/server';
import { TalentProfile } from '@/lib/types/crm';
import { experienceGroups, skillGroups, trainingList } from './talent-sections';

/**
 * Hồ sơ diễn viên hiển thị công khai: chỉ hồ sơ ĐÃ DUYỆT và diễn viên ĐỒNG Ý công khai.
 * Chỉ gồm ảnh, nghệ danh, kỹ năng, kinh nghiệm, đào tạo — không bao giờ có SĐT, email,
 * địa chỉ, ngày sinh/tuổi, chiều cao, số đo.
 */
export interface PublicTalent {
  username: string;
  name: string;
  photos: { label: string; url: string }[];
  experience: { group: string; items: string[] }[];
  skills: { group: string; items: string[] }[];
  trainings: string[];
}

const PUBLIC_COLUMNS =
  'username, full_name, headshot_url, fullbody_url, compcard_url, acting_experience, vietnamese_accents, languages, instruments, sports, dancing, martial_arts, singing, academic_profile';

export function toPublicTalent(t: TalentProfile): PublicTalent {
  return {
    username: t.username || '',
    name: t.full_name,
    photos: [
      { label: 'Chân dung', url: t.headshot_url },
      { label: 'Toàn thân', url: t.fullbody_url },
      { label: 'Góc nghiêng', url: t.compcard_url }
    ].filter((p): p is { label: string; url: string } => !!p.url),
    experience: experienceGroups(t.acting_experience),
    skills: skillGroups(t),
    trainings: trainingList(t.academic_profile)
  };
}

function baseQuery() {
  const { db } = getServiceDb();
  if (!db) return null;
  return db.from('talent_profiles').select(PUBLIC_COLUMNS).eq('review_status', 'approved').eq('public_profile', true).not('username', 'is', null);
}

export async function listPublicTalents(): Promise<PublicTalent[]> {
  const q = baseQuery();
  if (!q) return [];
  const { data, error } = await q.order('updated_at', { ascending: false }).limit(500);
  if (error) {
    console.error('[dienvienvn] Không tải được danh sách diễn viên công khai:', error.message);
    return [];
  }
  return ((data || []) as unknown as TalentProfile[]).map(toPublicTalent);
}

export async function getPublicTalent(username: string): Promise<PublicTalent | null> {
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(clean)) return null;
  const q = baseQuery();
  if (!q) return null;
  const { data, error } = await q.eq('username', clean).maybeSingle();
  if (error || !data) return null;
  return toPublicTalent(data as unknown as TalentProfile);
}
