import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * AI tạo hồ sơ diễn viên từ tên / link: Claude tìm và đọc thông tin công khai trên web, điền hồ sơ,
 * mỗi thông tin kèm link nguồn. Hồ sơ lưu ở trạng thái Chờ duyệt, nhãn AI tạo, chỉ trong CRM (không công khai).
 * Không lưu SĐT / email cá nhân, không tải ảnh (bản quyền).
 */

export const AI_MODEL = 'claude-opus-5-5';
export const AI_JOBS_MISSING = 'Hệ thống chưa sẵn sàng (cần chạy migration 20261128_ai_talent_profiles.sql).';
export const AI_KEY_MISSING = 'Chưa cấu hình ANTHROPIC_API_KEY trên Vercel nên chưa dùng được AI tạo hồ sơ.';

export type AiTalentInput = { name: string; links: string[]; note: string };

/** Hồ sơ AI trả về (công cụ save_profile, schema strict). */
const filmSchema = z.object({
  title: z.string(),
  year: z.number().int().nullable(),
  character: z.string().nullable(),
  role: z.enum(['leading', 'supporting', 'cameo', 'extra']),
  kind: z.enum(['feature_film', 'tv_show', 'web_drama', 'short_film']),
  source_url: z.string().nullable()
});
const profileSchema = z.object({
  found: z.boolean(),
  full_name: z.string(),
  stage_name: z.string().nullable(),
  gender: z.enum(['male', 'female', 'other']),
  birth_date: z.string().nullable(),
  birth_year: z.number().int().nullable(),
  hometown: z.string().nullable(),
  height_cm: z.number().int().nullable(),
  bio: z.string(),
  films: z.array(filmSchema),
  training: z.array(z.string()),
  skills: z.array(z.string()),
  languages: z.array(z.object({ language: z.string(), level: z.string() })),
  agency: z.string().nullable(),
  social: z.object({ facebook: z.string().nullable(), instagram: z.string().nullable(), tiktok: z.string().nullable() }),
  sources: z.array(z.object({ label: z.string(), url: z.string() })),
  notes: z.string().nullable()
});
export type AiProfile = z.infer<typeof profileSchema>;

const nullable = (type: string) => ({ type: [type, 'null'] });
const SAVE_TOOL: Anthropic.Beta.BetaTool = {
  name: 'save_profile',
  description:
    'Lưu hồ sơ diễn viên đã tìm được. Gọi đúng 1 lần, ở cuối, sau khi đã tìm và đọc nguồn. Trường không có nguồn đáng tin thì để null / mảng rỗng.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['found', 'full_name', 'stage_name', 'gender', 'birth_date', 'birth_year', 'hometown', 'height_cm', 'bio', 'films', 'training', 'skills', 'languages', 'agency', 'social', 'sources', 'notes'],
    properties: {
      found: { type: 'boolean', description: 'false nếu không xác định được đúng diễn viên này (không có thông tin, hoặc trùng tên mà không phân biệt được).' },
      full_name: { type: 'string', description: 'Họ tên thật đầy đủ (nếu không rõ thì nghệ danh).' },
      stage_name: { ...nullable('string'), description: 'Nghệ danh nếu khác họ tên thật.' },
      gender: { type: 'string', enum: ['male', 'female', 'other'] },
      birth_date: { ...nullable('string'), description: 'YYYY-MM-DD, chỉ khi nguồn ghi rõ ngày sinh.' },
      birth_year: nullable('integer'),
      hometown: { ...nullable('string'), description: 'Quê quán / nơi sinh.' },
      height_cm: { ...nullable('integer'), description: 'Chiều cao, chỉ khi có nguồn công khai.' },
      bio: { type: 'string', description: 'Tiểu sử ngắn 2–4 câu bằng tiếng Việt: dòng vai, tác phẩm nổi bật, giải thưởng.' },
      films: {
        type: 'array',
        description: 'Phim đã đóng, mới nhất trước.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'year', 'character', 'role', 'kind', 'source_url'],
          properties: {
            title: { type: 'string' },
            year: nullable('integer'),
            character: { ...nullable('string'), description: 'Tên nhân vật.' },
            role: { type: 'string', enum: ['leading', 'supporting', 'cameo', 'extra'], description: 'leading = vai chính, supporting = vai phụ.' },
            kind: { type: 'string', enum: ['feature_film', 'tv_show', 'web_drama', 'short_film'], description: 'feature_film = phim điện ảnh chiếu rạp.' },
            source_url: nullable('string')
          }
        }
      },
      training: { type: 'array', items: { type: 'string' }, description: 'Trường / khoá đào tạo diễn xuất, nghệ thuật.' },
      skills: { type: 'array', items: { type: 'string' }, description: 'Kỹ năng: hát, múa, võ, thể thao…' },
      languages: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['language', 'level'], properties: { language: { type: 'string' }, level: { type: 'string' } } }
      },
      agency: { ...nullable('string'), description: 'Tên agency / công ty quản lý và liên hệ CÔNG KHAI của agency (không phải SĐT / email cá nhân).' },
      social: {
        type: 'object',
        additionalProperties: false,
        required: ['facebook', 'instagram', 'tiktok'],
        properties: { facebook: nullable('string'), instagram: nullable('string'), tiktok: nullable('string') }
      },
      sources: {
        type: 'array',
        description: 'Các trang đã thực sự mở để lấy thông tin.',
        items: { type: 'object', additionalProperties: false, required: ['label', 'url'], properties: { label: { type: 'string' }, url: { type: 'string' } } }
      },
      notes: { ...nullable('string'), description: 'Điểm chưa chắc chắn hoặc mâu thuẫn giữa các nguồn, để team kiểm tra.' }
    }
  }
};

const SYSTEM = `Bạn là trợ lý nghiên cứu của bộ phận casting ACT (Việt Nam). Nhiệm vụ: tìm thông tin CÔNG KHAI về một diễn viên và lập hồ sơ casting.

Cách làm:
- Dùng web_search để tìm, web_fetch để đọc các trang đáng tin (Wikipedia, báo chí lớn, trang phim, trang agency, mạng xã hội chính chủ). Đọc các link người dùng gửi trước.
- Mỗi thông tin phải có nguồn bạn đã mở. Không chắc thì để null, ghi vào notes. Không đoán.
- Nếu trùng tên nhiều người: chọn đúng diễn viên theo link / ghi chú của người dùng; không phân biệt được thì found = false và giải thích trong notes.
- KHÔNG ghi số điện thoại, email cá nhân, địa chỉ nhà. Chỉ ghi liên hệ công khai của agency / quản lý.
- Ưu tiên phim điện ảnh chiếu rạp tại Việt Nam, rồi phim truyền hình, web drama.
- Viết tiếng Việt.
Khi xong, gọi công cụ save_profile đúng 1 lần.`;

/** Gọi Claude (tìm web) và trả hồ sơ. Ném lỗi với câu tiếng Việt dễ hiểu. */
async function research(input: AiTalentInput): Promise<{ profile: AiProfile; usage: Record<string, number> }> {
  const client = new Anthropic({ timeout: 280_000, maxRetries: 1 });
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 10 },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 8 },
    SAVE_TOOL
  ];
  const ask = [
    `Lập hồ sơ casting cho diễn viên: ${input.name}`,
    input.links.length ? `Link tham khảo người dùng gửi (đọc trước):\n${input.links.map(l => `- ${l}`).join('\n')}` : '',
    input.note ? `Ghi chú của người dùng: ${input.note}` : ''
  ]
    .filter(Boolean)
    .join('\n\n');
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: ask }];
  const usage = { input_tokens: 0, output_tokens: 0, web_search_requests: 0, web_fetch_requests: 0 };
  let nudged = false;

  for (let turn = 0; turn < 8; turn++) {
    const res = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high' },
      system: SYSTEM,
      tools,
      messages
    });
    usage.input_tokens += res.usage.input_tokens || 0;
    usage.output_tokens += res.usage.output_tokens || 0;
    usage.web_search_requests += res.usage.server_tool_use?.web_search_requests || 0;
    usage.web_fetch_requests += (res.usage.server_tool_use as { web_fetch_requests?: number } | null | undefined)?.web_fetch_requests || 0;

    if (res.stop_reason === 'refusal') throw new Error('AI từ chối yêu cầu này. Vui lòng kiểm tra lại tên / link.');
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content });
      continue;
    }
    const call = res.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'save_profile');
    if (call) {
      if (res.stop_reason === 'max_tokens') throw new Error('Hồ sơ quá dài, AI chưa viết xong. Vui lòng thử lại.');
      const parsed = profileSchema.safeParse(call.input);
      if (!parsed.success) throw new Error('AI trả về hồ sơ chưa đúng định dạng. Vui lòng thử lại.');
      return { profile: parsed.data, usage };
    }
    // Kết thúc mà chưa lưu: nhắc 1 lần
    if (nudged) throw new Error('AI chưa lập được hồ sơ. Vui lòng thử lại hoặc thêm link tham khảo.');
    nudged = true;
    messages.push({ role: 'assistant', content: res.content });
    messages.push({ role: 'user', content: 'Hãy gọi công cụ save_profile ngay với những thông tin đã tìm được (thiếu thì để null).' });
  }
  throw new Error('AI tìm quá lâu chưa xong. Vui lòng thử lại.');
}

const KIND_KEY: Record<AiProfile['films'][number]['kind'], 'feature_films' | 'tv_shows' | 'web_dramas' | 'short_films'> = {
  feature_film: 'feature_films',
  tv_show: 'tv_shows',
  web_drama: 'web_dramas',
  short_film: 'short_films'
};
const httpsOrNull = (u?: string | null) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim().slice(0, 500) : null);

/** Hồ sơ AI → dòng talent_profiles (Chờ duyệt, không công khai, không SĐT / email). */
export function toTalentRow(p: AiProfile, input: AiTalentInput, by: string) {
  const now = new Date().toISOString();
  const exp = { feature_films: [] as object[], short_films: [] as object[], tv_shows: [] as object[], web_dramas: [] as object[], commercials: [], music_videos: [] };
  for (const f of p.films.slice(0, 80)) {
    exp[KIND_KEY[f.kind]].push({ title: f.title.slice(0, 200), role: f.role, ...(f.character ? { character: f.character.slice(0, 120) } : {}), ...(f.year ? { year: f.year } : {}) });
  }
  const dob = p.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(p.birth_date) ? p.birth_date : p.birth_year ? `${p.birth_year}-01-01` : null;
  const name = p.stage_name && p.stage_name.trim() && p.stage_name.trim() !== p.full_name.trim() ? `${p.stage_name.trim()} (${p.full_name.trim()})` : p.full_name.trim() || input.name;
  return {
    full_name: name.slice(0, 160),
    email: '',
    phone: '',
    gender: p.gender,
    ...(dob ? { dob } : {}),
    ...(p.height_cm && p.height_cm > 80 && p.height_cm < 230 ? { height_cm: p.height_cm } : {}),
    acting_experience: exp,
    languages: p.languages.slice(0, 10),
    social_links: Object.fromEntries(Object.entries(p.social).map(([k, v]) => [k, httpsOrNull(v)]).filter(([, v]) => v)),
    willing_work_cities: [],
    preferred_project_types: [],
    preferred_role_types: [],
    acting_genres: [],
    role_willingness: [],
    transportation: [],
    tattoos_piercings: [],
    submission_source: 'ai',
    review_status: 'pending',
    submitted_at: now,
    public_profile: false,
    ai_generated: true,
    ai_profile: {
      bio: p.bio,
      stage_name: p.stage_name,
      real_name: p.full_name,
      birth_year: p.birth_year,
      birth_date_exact: !!(p.birth_date && dob === p.birth_date),
      hometown: p.hometown,
      training: p.training,
      skills: p.skills,
      agency: p.agency,
      films: p.films,
      sources: p.sources.map(s => ({ label: s.label.slice(0, 160), url: httpsOrNull(s.url) })).filter(s => s.url),
      notes: p.notes,
      input,
      model: AI_MODEL,
      created_by: by,
      created_at: now
    },
    created_at: now,
    updated_at: now
  };
}

/** Chạy 1 lượt (nền): tìm → tạo hồ sơ → cập nhật trạng thái lượt chạy. */
export async function runAiTalentJob(db: SupabaseClient, jobId: string, input: AiTalentInput, by: string) {
  const finish = (patch: Record<string, unknown>) =>
    db.from('ai_profile_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', jobId).then(() => undefined);
  try {
    const { profile, usage } = await research(input);
    if (!profile.found) {
      return finish({ status: 'failed', usage, error: `Không xác định được diễn viên "${input.name}". ${profile.notes || 'Hãy thêm link tham khảo hoặc ghi chú để AI phân biệt.'}` });
    }
    const { data, error } = await db.from('talent_profiles').insert(toTalentRow(profile, input, by)).select('id').single();
    if (error || !data) {
      console.error('[ai-talent] Không lưu được hồ sơ:', error?.message);
      return finish({ status: 'failed', usage, error: /ai_generated|ai_profile|submission_source/.test(error?.message || '') ? AI_JOBS_MISSING : 'Không lưu được hồ sơ. Vui lòng thử lại.' });
    }
    return finish({ status: 'done', usage, talent_id: data.id });
  } catch (e) {
    let msg = e instanceof Error ? e.message : 'Lỗi không xác định.';
    if (e instanceof Anthropic.AuthenticationError) msg = 'API key Anthropic không hợp lệ. Kiểm tra lại ANTHROPIC_API_KEY trên Vercel.';
    else if (e instanceof Anthropic.RateLimitError) msg = 'AI đang quá tải hoặc vượt hạn mức. Vui lòng thử lại sau ít phút.';
    else if (e instanceof Anthropic.BadRequestError) msg = /credit/i.test(e.message) ? 'Tài khoản Anthropic hết credit. Nạp thêm credit rồi thử lại.' : `AI báo lỗi yêu cầu: ${e.message.slice(0, 200)}`;
    else if (e instanceof Anthropic.APIError) msg = `AI tạm thời lỗi (${e.status ?? 'mạng'}). Vui lòng thử lại.`;
    console.error('[ai-talent] Lượt chạy lỗi:', msg);
    return finish({ status: 'failed', error: msg });
  }
}
