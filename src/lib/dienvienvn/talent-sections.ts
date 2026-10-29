// Gom kinh nghiệm / kỹ năng / đào tạo của hồ sơ diễn viên thành các nhóm để hiển thị
// (dùng chung cho trang công khai và cổng đối tác).
import { ACT_LEVEL_DETAILS, TalentProfile } from '@/lib/types/crm';

export type Group = { group: string; items: string[] };

const ROLE_LABEL: Record<string, string> = { leading: 'Vai chính', supporting: 'Vai phụ', cameo: 'Cameo', extra: 'Quần chúng' };

function credit(title: string, role?: string, year?: number | null, extra?: string) {
  return [title, extra, role ? ROLE_LABEL[role] || role : null, year ? String(year) : null].filter(Boolean).join(' · ');
}

const names = <T,>(list: T[] | null | undefined, pick: (x: T) => string | undefined) =>
  (list || []).map(pick).filter((x): x is string => !!x && x.trim().length > 0);

export function experienceGroups(exp: TalentProfile['acting_experience'] | null | undefined): Group[] {
  const e = exp || ({} as TalentProfile['acting_experience']);
  const film = (x: { title: string; role?: string; year?: number; character?: string }) =>
    credit(x.title, x.role, x.year, x.character ? `vai ${x.character}` : undefined);
  return [
    { group: 'Phim điện ảnh & phim ngắn', items: [...(e.feature_films || []), ...(e.short_films || [])].map(film) },
    { group: 'Web drama', items: (e.web_dramas || []).map(film) },
    { group: 'Phim truyền hình', items: (e.tv_shows || []).map(film) },
    { group: 'Quảng cáo (TVC)', items: (e.commercials || []).map(x => credit(x.brand, x.role, x.year)) },
    { group: 'MV ca nhạc', items: (e.music_videos || []).map(x => credit(x.song, x.role, x.year, x.artist || undefined)) }
  ].filter(g => g.items.length > 0);
}

type SkillSource = Pick<TalentProfile, 'vietnamese_accents' | 'languages' | 'martial_arts' | 'instruments' | 'dancing' | 'sports'> & {
  singing?: TalentProfile['singing'] | null;
};

export function skillGroups(t: SkillSource): Group[] {
  return [
    { group: 'Giọng vùng miền', items: names(t.vietnamese_accents, a => (a.accent ? `Giọng ${a.accent}` : undefined)) },
    { group: 'Ngoại ngữ', items: names(t.languages, l => (l.language === 'Tiếng Việt' ? undefined : l.language)) },
    { group: 'Võ thuật', items: names(t.martial_arts, m => m.style || m.name) },
    { group: 'Nhạc cụ', items: names(t.instruments, i => i.name || i.style) },
    { group: 'Nhảy', items: names(t.dancing, d => d.style || d.name) },
    { group: 'Thể thao', items: names(t.sports, s => s.name || s.style) },
    { group: 'Ca hát', items: t.singing?.genres || [] }
  ].filter(g => g.items.length > 0);
}

export function trainingList(academic: TalentProfile['academic_profile'] | null | undefined): string[] {
  return [
    ...(academic?.enrollments || []).map(e => `ACT Academy · ${ACT_LEVEL_DETAILS[e.level]?.label || e.level}${e.status === 'studying' ? ' (đang học)' : ''}`),
    ...(academic?.external_trainings || []).map(e => [e.school_name, e.major].filter(Boolean).join(' · ') + (e.status === 'studying' ? ' (đang học)' : ''))
  ].filter(Boolean);
}

/** Bỏ dấu tiếng Việt, chữ thường — dùng cho ô tìm kiếm. */
export function foldVi(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
