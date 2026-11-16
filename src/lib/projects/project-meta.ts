import 'server-only';
import type { Metadata } from 'next';
import { findProjectByParam, getServiceDb } from './server';
import { CastingProject, findRoleBySlug, projectTypeLabel, publicProjectName, roleImages, roleSummary } from './types';

const FALLBACK: Metadata = {
  title: 'Dự án đang casting — DienVienVN',
  description: 'Xem các vai đang tuyển và ứng tuyển trực tiếp trên DienVienVN.',
  robots: { index: true, follow: true }
};

/** Tiêu đề / mô tả / ảnh xem trước khi chia sẻ link dự án hoặc link vai (Zalo, Facebook…). */
export async function projectMetadata(projectParam: string, roleParam?: string): Promise<Metadata> {
  const { db } = getServiceDb();
  if (!db) return FALLBACK;
  const project = await findProjectByParam(db, projectParam).catch(() => null);
  if (!project || project === 'error') return FALLBACK;
  const p = project as CastingProject;
  const name = publicProjectName(p);
  const roles = Array.isArray(p.roles) ? p.roles : [];
  const role = roleParam ? findRoleBySlug(roles, roleParam) : null;
  const clip = (s: string) => (s.length > 180 ? `${s.slice(0, 180).replace(/\s+\S*$/, '')}…` : s);
  if (role) {
    const title = `Vai ${role.name} – ${name} | DienVienVN`;
    const description = clip([roleSummary(role), role.description?.trim()].filter(Boolean).join(' · ') || `Ứng tuyển vai ${role.name} trên DienVienVN.`);
    const image = roleImages(role)[0];
    return {
      title,
      description,
      robots: { index: true, follow: true },
      openGraph: { title, description, ...(image ? { images: [{ url: image }] } : {}) },
      twitter: { title, description, ...(image ? { card: 'summary_large_image', images: [image] } : {}) }
    };
  }
  const title = `${name} – Đang casting | DienVienVN`;
  const description = clip(
    p.description?.trim() || `${projectTypeLabel(p.project_type)} đang tuyển ${roles.length} vai: ${roles.map(r => r.name).filter(Boolean).join(', ')}.`
  );
  const image = roles.map(r => roleImages(r)[0]).find(Boolean);
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: { title, description, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { title, description }
  };
}
