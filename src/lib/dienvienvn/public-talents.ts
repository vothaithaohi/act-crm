import 'server-only';
import { isTestAccount } from './test-accounts';
import { getServiceDb } from '@/lib/projects/server';
import { TalentProfile } from '@/lib/types/crm';
import { ageOf } from '@/lib/projects/producer';
import { MAX_HIGHLIGHTS, cleanSelfTapes } from './selftapes';
import { provinceLabel } from './provinces';
import { experienceGroups, skillGroups, trainingList } from './talent-sections';

/**
 * Hồ sơ diễn viên hiển thị công khai: chỉ hồ sơ ĐÃ DUYỆT và diễn viên ĐỒNG Ý công khai.
 * Chỉ gồm ảnh, nghệ danh, kỹ năng, kinh nghiệm, đào tạo — không bao giờ có SĐT, email,
 * địa chỉ, ngày sinh/tuổi, chiều cao, số đo.
 */
export interface PublicTalent {
  username: string;
  name: string;
  /** Tuổi thật (tính trên máy chủ; ngày sinh không gửi ra trình duyệt) */
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  weight_kg: number | null;
  /** Lớp ACT đã học (ACT1…ACT4) — dùng cho bộ lọc */
  act_levels: string[];
  /** Mức độ sẵn sàng cho vai diễn (mã: kissing_scene, cut_hair…) */
  willingness: string[];
  /** Tỉnh thành sẵn sàng quay */
  work_cities: string[];
  photos: { label: string; url: string }[];
  experience: { group: string; items: string[] }[];
  skills: { group: string; items: string[] }[];
  trainings: string[];
  /** Ảnh cá nhân thêm có chú thích (diễn viên tự tải lên) */
  gallery: { url: string; caption: string }[];
  /** Tối đa 3 self-tape diễn viên chọn nổi bật */
  selftapes: { url: string; title: string }[];
}

const PUBLIC_COLUMNS =
  'username, full_name, email, dob, gender, height_cm, weight_kg, role_willingness, willing_work_cities, headshot_url, fullbody_url, compcard_url, acting_experience, vietnamese_accents, languages, instruments, sports, dancing, martial_arts, singing, academic_profile';

export function toPublicTalent(t: TalentProfile): PublicTalent {
  return {
    username: t.username || '',
    name: t.full_name,
    age: ageOf(t.dob),
    gender: (t.gender as PublicTalent['gender']) || null,
    height_cm: t.height_cm || null,
    weight_kg: t.weight_kg || null,
    act_levels: Array.from(new Set([t.academic_profile?.highest_act_level, ...(t.academic_profile?.enrollments || []).map(e => e.level)].filter(Boolean) as string[])),
    willingness: Array.isArray(t.role_willingness) ? t.role_willingness : [],
    work_cities: Array.from(new Set((Array.isArray(t.willing_work_cities) ? t.willing_work_cities : []).map(c => provinceLabel(c) || c).filter(Boolean))),
    photos: [
      { label: 'Chân dung', url: t.headshot_url },
      { label: 'Toàn thân', url: t.fullbody_url },
      { label: 'Góc nghiêng', url: t.compcard_url }
    ].filter((p): p is { label: string; url: string } => !!p.url),
    experience: experienceGroups(t.acting_experience),
    skills: skillGroups(t),
    trainings: trainingList(t.academic_profile),
    gallery: Array.isArray(t.gallery) ? t.gallery.filter(g => g?.url).map(g => ({ url: g.url, caption: g.caption || '' })) : [],
    selftapes: cleanSelfTapes(t.selftapes)
      .filter(x => x.highlight)
      .slice(0, MAX_HIGHLIGHTS)
      .map(x => ({ url: x.url, title: x.title }))
  };
}

function baseQuery(extra: string[] = ['gallery', 'selftapes']) {
  const { db } = getServiceDb();
  if (!db) return null;
  return db
    .from('talent_profiles')
    .select([PUBLIC_COLUMNS, ...extra].join(', '))
    .eq('review_status', 'approved')
    .eq('public_profile', true)
    .not('username', 'is', null);
}

/** Chạy truy vấn; nếu chưa có cột gallery (chưa chạy migration) thì chạy lại không kèm cột này. */
async function withGalleryFallback<T>(run: (q: NonNullable<ReturnType<typeof baseQuery>>) => PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const q = baseQuery();
  if (!q) return { data: null, error: null };
  const first = await run(q);
  if (!first.error || !/gallery|selftapes/i.test(first.error.message)) return first;
  // Cột mới chưa có (chưa chạy migration): bỏ cột lỗi rồi chạy lại
  const second = await run(baseQuery(/selftapes/i.test(first.error.message) ? ['gallery'] : ['selftapes'])!);
  if (!second.error) return second;
  return run(baseQuery([])!);
}

export async function listPublicTalents(): Promise<PublicTalent[]> {
  const { data, error } = await withGalleryFallback(q => q.order('updated_at', { ascending: false }).limit(500));
  if (error) {
    console.error('[dienvienvn] Không tải được danh sách diễn viên công khai:', error.message);
    return [];
  }
  // Tài khoản test của team dev không hiện ở danh sách công khai / trang chủ / sitemap
  return ((data || []) as unknown as TalentProfile[]).filter(t => !isTestAccount(t)).map(toPublicTalent);
}

export async function getPublicTalent(username: string): Promise<PublicTalent | null> {
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(clean)) return null;
  const { data, error } = await withGalleryFallback(q => q.eq('username', clean).maybeSingle());
  if (error || !data) return null;
  // Tài khoản test: trang hồ sơ công khai không hiện (như chưa có hồ sơ)
  if (isTestAccount(data as unknown as TalentProfile)) return null;
  return toPublicTalent(data as unknown as TalentProfile);
}
