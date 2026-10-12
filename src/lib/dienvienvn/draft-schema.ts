// Schema kiểm tra dữ liệu hồ sơ casting gửi lên server (chặn dữ liệu sai kiểu / quá dài).
import { z } from 'zod';

const str = (max: number) => z.string().trim().max(max).default('');
const media = z
  .string()
  .max(4_000_000)
  .refine(v => v === '' || /^https:\/\//.test(v) || /^data:image\/(jpeg|png|webp);base64,/.test(v), 'Ảnh không hợp lệ')
  .default('');
const url = z
  .string()
  .trim()
  .max(500)
  .refine(v => v === '' || /^https?:\/\//i.test(v), 'Đường dẫn phải bắt đầu bằng http(s)://')
  .default('');
const tags = (max = 20) => z.array(z.string().trim().max(60)).max(max).default([]);

const experienceEntry = z.object({
  id: z.string().max(64),
  title: str(200),
  role: z.enum(['leading', 'supporting', 'cameo', 'extra']),
  character: str(200),
  year: str(4)
});
const experienceList = z.array(experienceEntry).max(30).default([]);

const trainingEntry = z.object({
  id: z.string().max(64),
  school: str(200),
  custom_school: str(200),
  act_level: z.enum(['ACT1', 'ACT2', 'ACT3', 'ACT4', 'SSC']),
  program_type: z.enum(['university', 'college', 'intermediate', 'short_course', 'workshop']),
  major: str(200),
  class_code: str(60),
  term_name: str(120),
  start_date: str(10),
  end_date: str(10),
  status: z.enum(['completed', 'studying', 'reserved', 'cancelled']),
  instructor: str(120),
  evaluation: str(1000)
});

export const castingDraftSchema = z.object({
  full_name: str(120),
  gender: z.enum(['male', 'female', 'other']),
  dob: str(10),
  phone: str(20),
  email: str(160),
  address: str(300),
  city: str(80),
  parent_guardian_name: str(200),
  height_cm: str(6),
  weight_kg: str(6),
  shoe_size: str(6),
  chest_cm: str(6),
  waist_cm: str(6),
  hip_cm: str(6),
  tattoos_piercings: tags(),
  experience: z.object({
    feature_films: experienceList,
    web_dramas: experienceList,
    tv_shows: experienceList,
    commercials: experienceList,
    music_videos: experienceList
  }),
  accents: tags(),
  languages: tags(),
  martial_arts: tags(),
  instruments: tags(),
  dancing: tags(),
  sports: tags(),
  willing_work_cities: tags(),
  role_willingness: tags(),
  headshot_url: media,
  fullbody_url: media,
  compcard_url: media,
  social_links: z.object({
    facebook: url,
    instagram: url,
    tiktok: url,
    showreel_url: url
  }),
  trainings: z.array(trainingEntry).max(20).default([]),
  consent: z.boolean()
});
