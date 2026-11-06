import 'server-only';
import { getServiceDb } from '@/lib/projects/server';
import { CastingProject, isDeadlinePassed } from '@/lib/projects/types';
import { listPublicTalents } from './public-talents';

/** Số liệu thật cho trang chủ: chỉ dự án đang mở còn hạn, hồ sơ đã duyệt, gương mặt đã đồng ý công khai. */
export interface HomeStats {
  roles: number;
  projects: number;
  talents: number;
  companies: string[];
  faces: { username: string; name: string; photo: string }[];
}

export const EMPTY_HOME_STATS: HomeStats = { roles: 0, projects: 0, talents: 0, companies: [], faces: [] };

export async function getHomeStats(): Promise<HomeStats> {
  const { db } = getServiceDb();
  if (!db) return EMPTY_HOME_STATS;
  try {
    const [projectsRes, talentsRes, faces] = await Promise.all([
      db.from('casting_projects').select('roles, deadline, hide_title, production_company').eq('status', 'open'),
      db.from('talent_profiles').select('id', { count: 'exact', head: true }).eq('review_status', 'approved'),
      listPublicTalents()
    ]);
    const open = ((projectsRes.data || []) as Pick<CastingProject, 'roles' | 'deadline' | 'hide_title' | 'production_company'>[]).filter(
      p => !isDeadlinePassed(p.deadline)
    );
    // Công ty của dự án bật "Ẩn tên" không bao giờ được hiện
    const companies = Array.from(
      new Set(open.filter(p => !p.hide_title && p.production_company?.trim()).map(p => (p.production_company as string).trim()))
    ).slice(0, 8);
    return {
      roles: open.reduce((n, p) => n + (Array.isArray(p.roles) ? p.roles.length : 0), 0),
      projects: open.length,
      talents: talentsRes.count || 0,
      companies,
      faces: faces
        .filter(t => t.photos[0]?.url)
        .slice(0, 12)
        .map(t => ({ username: t.username, name: t.name, photo: t.photos[0].url }))
    };
  } catch (e) {
    console.error('[dienvienvn] Không tải được số liệu trang chủ:', e);
    return EMPTY_HOME_STATS;
  }
}
