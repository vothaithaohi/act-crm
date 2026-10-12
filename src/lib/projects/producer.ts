// Dữ liệu cho link gửi nhà sản xuất: chỉ hồ sơ ĐÃ DUYỆT, bỏ địa chỉ / người giám hộ,
// và ẩn SĐT/email khi dự án bật "Ẩn liên hệ".
import { TalentProfile, getReviewStatus } from '@/lib/types/crm';
import { CastingProject, ProjectApplication } from './types';

export type ProducerTalent = Pick<
  TalentProfile,
  | 'id'
  | 'full_name'
  | 'gender'
  | 'dob'
  | 'city'
  | 'height_cm'
  | 'weight_kg'
  | 'shoe_size'
  | 'chest_cm'
  | 'waist_cm'
  | 'hip_cm'
  | 'acting_experience'
  | 'willing_work_cities'
  | 'role_willingness'
  | 'social_links'
  | 'languages'
  | 'vietnamese_accents'
  | 'instruments'
  | 'sports'
  | 'dancing'
  | 'martial_arts'
  | 'tattoos_piercings'
  | 'headshot_url'
  | 'fullbody_url'
  | 'compcard_url'
  | 'academic_profile'
> & { phone: string | null; email: string | null };

export interface ProducerApplicant {
  application: Pick<ProjectApplication, 'id' | 'role_id' | 'selftape_url' | 'note' | 'created_at'>;
  talent: ProducerTalent;
}

export interface ProducerView {
  project: Pick<
    CastingProject,
    'code' | 'title' | 'production_company' | 'project_type' | 'location' | 'shooting_time' | 'deadline' | 'roles' | 'description' | 'hide_contacts'
  >;
  applicants: ProducerApplicant[];
}

export function toProducerTalent(t: TalentProfile, hideContacts: boolean): ProducerTalent {
  return {
    id: t.id,
    full_name: t.full_name,
    gender: t.gender,
    dob: t.dob,
    city: t.city,
    height_cm: t.height_cm,
    weight_kg: t.weight_kg,
    shoe_size: t.shoe_size,
    chest_cm: t.chest_cm,
    waist_cm: t.waist_cm,
    hip_cm: t.hip_cm,
    acting_experience: t.acting_experience,
    willing_work_cities: t.willing_work_cities,
    role_willingness: t.role_willingness,
    social_links: t.social_links,
    languages: t.languages,
    vietnamese_accents: t.vietnamese_accents,
    instruments: t.instruments,
    sports: t.sports,
    dancing: t.dancing,
    martial_arts: t.martial_arts,
    tattoos_piercings: t.tattoos_piercings,
    headshot_url: t.headshot_url,
    fullbody_url: t.fullbody_url,
    compcard_url: t.compcard_url,
    academic_profile: t.academic_profile,
    phone: hideContacts ? null : t.phone,
    email: hideContacts ? null : t.email || null
  };
}

export function buildProducerView(
  project: CastingProject,
  applications: ProjectApplication[],
  talents: TalentProfile[]
): ProducerView {
  const byId = new Map(talents.map(t => [t.id, t]));
  const applicants: ProducerApplicant[] = applications
    .filter(a => a.project_id === project.id && a.status !== 'rejected')
    .map(a => ({ a, t: byId.get(a.talent_id) }))
    .filter((x): x is { a: ProjectApplication; t: TalentProfile } => !!x.t && getReviewStatus(x.t) === 'approved')
    .map(({ a, t }) => ({
      application: { id: a.id, role_id: a.role_id, selftape_url: a.selftape_url, note: a.note, created_at: a.created_at },
      talent: toProducerTalent(t, project.hide_contacts)
    }));
  return {
    project: {
      code: project.code,
      title: project.title,
      production_company: project.production_company,
      project_type: project.project_type,
      location: project.location,
      shooting_time: project.shooting_time,
      deadline: project.deadline,
      roles: project.roles || [],
      description: project.description,
      hide_contacts: project.hide_contacts
    },
    applicants
  };
}
