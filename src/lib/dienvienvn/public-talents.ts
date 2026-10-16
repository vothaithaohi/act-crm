import 'server-only';
import { getServiceDb } from '@/lib/projects/server';
import { TalentProfile, ACT_LEVEL_DETAILS } from '@/lib/types/crm';

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

const ROLE_LABEL: Record<string, string> = { leading: 'Vai chính', supporting: 'Vai phụ', cameo: 'Cameo', extra: 'Quần chúng' };

function credit(title: string, role?: string, year?: number | null, extra?: string) {
  return [title, extra, role ? ROLE_LABEL[role] || role : null, year ? String(year) : null].filter(Boolean).join(' · ');
}

const names = <T,>(list: T[] | null | undefined, pick: (x: T) => string | undefined) =>
  (list || []).map(pick).filter((x): x is string => !!x && x.trim().length > 0);

export function toPublicTalent(t: TalentProfile): PublicTalent {
  const exp = t.acting_experience || ({} as TalentProfile['acting_experience']);
  const experience = [
    { group: 'Phim điện ảnh & phim ngắn', items: [...(exp.feature_films || []), ...(exp.short_films || [])].map(x => credit(x.title, x.role, x.year, x.character ? `vai ${x.character}` : undefined)) },
    { group: 'Web drama', items: (exp.web_dramas || []).map(x => credit(x.title, x.role, x.year, x.character ? `vai ${x.character}` : undefined)) },
    { group: 'Phim truyền hình', items: (exp.tv_shows || []).map(x => credit(x.title, x.role, x.year, x.character ? `vai ${x.character}` : undefined)) },
    { group: 'Quảng cáo (TVC)', items: (exp.commercials || []).map(x => credit(x.brand, x.role, x.year)) },
    { group: 'MV ca nhạc', items: (exp.music_videos || []).map(x => credit(x.song, x.role, x.year, x.artist || undefined)) }
  ].filter(g => g.items.length > 0);

  const skills = [
    { group: 'Giọng vùng miền', items: names(t.vietnamese_accents, a => (a.accent ? `Giọng ${a.accent}` : undefined)) },
    { group: 'Ngoại ngữ', items: names(t.languages, l => (l.language === 'Tiếng Việt' ? undefined : l.language)) },
    { group: 'Võ thuật', items: names(t.martial_arts, m => m.style) },
    { group: 'Nhạc cụ', items: names(t.instruments, i => i.name) },
    { group: 'Nhảy', items: names(t.dancing, d => d.style) },
    { group: 'Thể thao', items: names(t.sports, s => s.name) },
    { group: 'Ca hát', items: t.singing?.genres || [] }
  ].filter(g => g.items.length > 0);

  const academic = t.academic_profile;
  const trainings = [
    ...(academic?.enrollments || []).map(e => `ACT Academy · ${ACT_LEVEL_DETAILS[e.level]?.label || e.level}${e.status === 'studying' ? ' (đang học)' : ''}`),
    ...(academic?.external_trainings || []).map(e => [e.school_name, e.major].filter(Boolean).join(' · ') + (e.status === 'studying' ? ' (đang học)' : ''))
  ].filter(Boolean);

  return {
    username: t.username || '',
    name: t.full_name,
    photos: [
      { label: 'Chân dung', url: t.headshot_url },
      { label: 'Toàn thân', url: t.fullbody_url },
      { label: 'Góc nghiêng', url: t.compcard_url }
    ].filter((p): p is { label: string; url: string } => !!p.url),
    experience,
    skills,
    trainings
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
