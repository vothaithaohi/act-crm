import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * AI tạo hồ sơ diễn viên từ tên và / hoặc link: Claude đọc các link được gửi, tìm thêm nguồn chính thống, đối chứng
 * từng thông tin và gắn link nguồn riêng cho từng thông tin. Hồ sơ lưu ở trạng thái Chờ duyệt, nhãn AI tạo, chỉ trong CRM (không công khai).
 * Không lưu SĐT / email cá nhân, không tải ảnh (bản quyền).
 */

export const AI_MODEL = 'claude-opus-5-5';
export const AI_JOBS_MISSING = 'Hệ thống chưa sẵn sàng (cần chạy migration 20261128_ai_talent_profiles.sql).';
export const AI_KEY_MISSING = 'Chưa cấu hình ANTHROPIC_API_KEY trên Vercel nên chưa dùng được AI tạo hồ sơ.';

export type AiTalentInput = { name: string; links: string[]; note: string };

/**
 * Hồ sơ AI trả về (công cụ save_profile, schema strict). Mỗi thông tin là một "fact" đã đối chứng:
 * verified = khớp ≥ 2 nguồn độc lập (hoặc kênh chính chủ), single = chỉ 1 nguồn, conflict = các nguồn ghi khác nhau,
 * unknown = không tìm thấy. Mỗi fact kèm link nguồn của chính nó.
 */
const STATUS = ['verified', 'single', 'conflict', 'unknown'] as const;
const factSchema = z.object({
  value: z.string().nullable(),
  status: z.enum(STATUS),
  sources: z.array(z.string()),
  alternatives: z.array(z.object({ value: z.string(), sources: z.array(z.string()) }))
});
const filmSchema = z.object({
  title: z.string(),
  year: z.number().int().nullable(),
  character: z.string().nullable(),
  role: z.enum(['leading', 'supporting', 'cameo', 'extra']),
  kind: z.enum(['feature_film', 'tv_show', 'web_drama', 'short_film']),
  status: z.enum(STATUS),
  sources: z.array(z.string())
});
const FACT_KEYS = ['full_name', 'stage_name', 'birth_date', 'hometown', 'height_cm', 'agency'] as const;
const profileSchema = z.object({
  found: z.boolean(),
  gender: z.enum(['male', 'female', 'other']),
  full_name: factSchema,
  stage_name: factSchema,
  birth_date: factSchema,
  hometown: factSchema,
  height_cm: factSchema,
  agency: factSchema,
  training: z.array(factSchema),
  films: z.array(filmSchema),
  bio: z.string(),
  skills: z.array(z.string()),
  languages: z.array(z.object({ language: z.string(), level: z.string() })),
  social: z.object({ facebook: z.string().nullable(), instagram: z.string().nullable(), tiktok: z.string().nullable() }),
  sources: z.array(z.object({ label: z.string(), url: z.string() })),
  notes: z.string().nullable()
});
export type AiProfile = z.infer<typeof profileSchema>;
type Fact = z.infer<typeof factSchema>;

/** Nhãn tiếng Việt của từng thông tin (hiển thị trong CRM). */
export const FACT_LABEL: Record<(typeof FACT_KEYS)[number], string> = {
  full_name: 'Họ tên thật',
  stage_name: 'Nghệ danh',
  birth_date: 'Ngày / năm sinh',
  hometown: 'Quê quán',
  height_cm: 'Chiều cao (cm)',
  agency: 'Agency / quản lý'
};

const nullable = (type: string) => ({ type: [type, 'null'] });
const urlList = { type: 'array', items: { type: 'string' }, description: 'Link các trang có ghi thông tin này (đã mở đọc).' };
const statusProp = {
  type: 'string',
  enum: [...STATUS],
  description: 'verified = khớp từ 2 nguồn độc lập trở lên (hoặc kênh chính chủ của diễn viên); single = chỉ 1 nguồn; conflict = các nguồn ghi khác nhau; unknown = không tìm thấy.'
};
const fact = (description: string) => ({
  type: 'object',
  description,
  additionalProperties: false,
  required: ['value', 'status', 'sources', 'alternatives'],
  properties: {
    value: { ...nullable('string'), description: 'Giá trị được nhiều nguồn đáng tin ghi nhất; null nếu unknown.' },
    status: statusProp,
    sources: urlList,
    alternatives: {
      type: 'array',
      description: 'Khi conflict: các giá trị khác mà nguồn khác ghi, kèm link.',
      items: { type: 'object', additionalProperties: false, required: ['value', 'sources'], properties: { value: { type: 'string' }, sources: urlList } }
    }
  }
});
const SAVE_TOOL: Anthropic.Beta.BetaTool = {
  name: 'save_profile',
  description: 'Lưu hồ sơ diễn viên sau khi đã đọc và đối chứng các nguồn. Gọi đúng 1 lần, ở cuối.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['found', 'gender', ...FACT_KEYS, 'training', 'films', 'bio', 'skills', 'languages', 'social', 'sources', 'notes'],
    properties: {
      found: { type: 'boolean', description: 'false nếu không xác định được đúng diễn viên (không có thông tin, hoặc trùng tên mà không phân biệt được).' },
      gender: { type: 'string', enum: ['male', 'female', 'other'] },
      full_name: fact('Họ tên thật đầy đủ.'),
      stage_name: fact('Nghệ danh (nếu khác tên thật).'),
      birth_date: fact('Ngày sinh dạng YYYY-MM-DD, hoặc chỉ năm YYYY nếu nguồn chỉ ghi năm.'),
      hometown: fact('Quê quán / nơi sinh.'),
      height_cm: fact('Chiều cao, chỉ số cm (VD "165").'),
      agency: fact('Agency / công ty quản lý và liên hệ CÔNG KHAI của agency (không phải SĐT / email cá nhân).'),
      training: { type: 'array', description: 'Trường / khoá đào tạo diễn xuất, nghệ thuật; mỗi mục là một thông tin có đối chứng.', items: fact('Một trường / khoá đào tạo.') },
      films: {
        type: 'array',
        description: 'Phim đã đóng, mới nhất trước; mỗi phim có đối chứng và link nguồn.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'year', 'character', 'role', 'kind', 'status', 'sources'],
          properties: {
            title: { type: 'string' },
            year: nullable('integer'),
            character: { ...nullable('string'), description: 'Tên nhân vật.' },
            role: { type: 'string', enum: ['leading', 'supporting', 'cameo', 'extra'], description: 'leading = vai chính, supporting = vai phụ.' },
            kind: { type: 'string', enum: ['feature_film', 'tv_show', 'web_drama', 'short_film'], description: 'feature_film = phim điện ảnh chiếu rạp.' },
            status: statusProp,
            sources: urlList
          }
        }
      },
      bio: { type: 'string', description: 'Tiểu sử ngắn 2–4 câu bằng tiếng Việt, chỉ dựa trên thông tin đã đối chứng.' },
      skills: { type: 'array', items: { type: 'string' }, description: 'Kỹ năng: hát, múa, võ, thể thao…' },
      languages: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['language', 'level'], properties: { language: { type: 'string' }, level: { type: 'string' } } }
      },
      social: {
        type: 'object',
        description: 'Chỉ tài khoản CHÍNH CHỦ đã xác minh.',
        additionalProperties: false,
        required: ['facebook', 'instagram', 'tiktok'],
        properties: { facebook: nullable('string'), instagram: nullable('string'), tiktok: nullable('string') }
      },
      sources: {
        type: 'array',
        description: 'Tất cả các trang đã thực sự mở đọc (gồm link người dùng gửi).',
        items: { type: 'object', additionalProperties: false, required: ['label', 'url'], properties: { label: { type: 'string' }, url: { type: 'string' } } }
      },
      notes: { ...nullable('string'), description: 'Tóm tắt những điểm lệch giữa các nguồn hoặc chưa chắc chắn, để team kiểm tra.' }
    }
  }
};

const SYSTEM = `Bạn là trợ lý nghiên cứu của bộ phận casting ACT (Việt Nam). Nhiệm vụ: lập hồ sơ casting cho MỘT diễn viên từ thông tin CÔNG KHAI, có đối chứng nguồn.

Quy trình:
1. Nếu người dùng gửi link: dùng web_fetch đọc TẤT CẢ các link đó trước, xác định đúng diễn viên là ai.
2. Dùng web_search tìm thêm nguồn chính thống khác, rồi web_fetch đọc các trang đó. Ưu tiên theo thứ tự:
   (a) kênh chính chủ: fanpage / Instagram / TikTok chính chủ, trang agency quản lý;
   (b) Wikipedia, báo lớn (VnExpress, Tuổi Trẻ, Thanh Niên, Znews, Dân Trí, VietnamNet, Người Lao Động…);
   (c) trang thông tin phim (trang phim chính thức, nhà phát hành, IMDb).
   Bỏ qua diễn đàn, blog cá nhân, trang chép lại không rõ nguồn.
3. ĐỐI CHỨNG từng thông tin (họ tên, nghệ danh, ngày/năm sinh, quê quán, chiều cao, agency, đào tạo, từng phim và vai):
   - verified: có ít nhất 2 nguồn độc lập ghi giống nhau, hoặc chính diễn viên / agency công bố trên kênh chính chủ.
   - single: chỉ 1 nguồn ghi.
   - conflict: các nguồn ghi khác nhau → value = giá trị được nhiều nguồn đáng tin ghi nhất, alternatives = các giá trị khác, mỗi giá trị kèm link.
   - unknown: không tìm thấy → value = null.
   Mỗi thông tin phải kèm link đúng các trang ghi thông tin đó (link đã mở đọc). Không tự suy đoán, không lấy từ trí nhớ.
4. Trùng tên nhiều người: chọn đúng người theo link / ghi chú của người dùng; không phân biệt được thì found = false và giải thích trong notes.
5. KHÔNG ghi số điện thoại, email cá nhân, địa chỉ nhà. Chỉ ghi liên hệ công khai của agency / quản lý.
6. Viết tiếng Việt. Khi xong, gọi công cụ save_profile đúng 1 lần.`;

/** Gọi Claude (tìm web) và trả hồ sơ. Ném lỗi với câu tiếng Việt dễ hiểu. */
async function research(input: AiTalentInput): Promise<{ profile: AiProfile; usage: Record<string, number> }> {
  const client = new Anthropic({ timeout: 280_000, maxRetries: 1 });
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 12 },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 15 },
    SAVE_TOOL
  ];
  const ask = [
    input.name ? `Lập hồ sơ casting cho diễn viên: ${input.name}` : 'Lập hồ sơ casting cho diễn viên được nói tới trong các link dưới đây.',
    input.links.length ? `Link người dùng gửi (đọc hết trước, rồi tìm thêm nguồn khác để đối chứng):\n${input.links.map(l => `- ${l}`).join('\n')}` : '',
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

const usable = (f: Fact) => (f.status === 'verified' || f.status === 'single') && f.value && f.value.trim() ? f.value.trim() : null;
const cleanUrls = (list: string[]) => Array.from(new Set(list.map(httpsOrNull).filter(Boolean) as string[])).slice(0, 10);
const cleanFact = (label: string, f: Fact) => ({
  label,
  value: f.value?.trim() || null,
  status: f.status,
  sources: cleanUrls(f.sources),
  alternatives: f.alternatives.map(a => ({ value: a.value.trim(), sources: cleanUrls(a.sources) })).filter(a => a.value)
});

/** Tên hiển thị của hồ sơ: "Nghệ danh (Tên thật)". */
export function aiDisplayName(p: AiProfile, fallback: string): string {
  const real = usable(p.full_name) || p.full_name.value?.trim() || '';
  const stage = usable(p.stage_name) || p.stage_name.value?.trim() || '';
  if (stage && real && stage !== real) return `${stage} (${real})`;
  return stage || real || fallback || 'Chưa rõ tên';
}

/**
 * Hồ sơ AI → dòng talent_profiles (Chờ duyệt, không công khai, không SĐT / email).
 * Chỉ điền vào hồ sơ thông tin đã đối chứng (khớp ≥ 2 nguồn) hoặc có 1 nguồn; thông tin các nguồn ghi khác nhau thì để trống,
 * hiện trong khung AI để team chọn.
 */
export function toTalentRow(p: AiProfile, input: AiTalentInput, by: string) {
  const now = new Date().toISOString();
  const exp = { feature_films: [] as object[], short_films: [] as object[], tv_shows: [] as object[], web_dramas: [] as object[], commercials: [], music_videos: [] };
  for (const f of p.films.slice(0, 80)) {
    if (f.status === 'conflict' || f.status === 'unknown') continue;
    exp[KIND_KEY[f.kind]].push({ title: f.title.slice(0, 200), role: f.role, ...(f.character ? { character: f.character.slice(0, 120) } : {}), ...(f.year ? { year: f.year } : {}) });
  }
  const birth = usable(p.birth_date) || '';
  const exact = /^\d{4}-\d{2}-\d{2}$/.test(birth);
  const year = /^(\d{4})/.exec(birth)?.[1];
  const dob = exact ? birth : year ? `${year}-01-01` : null;
  const height = Number((usable(p.height_cm) || '').replace(/[^\d]/g, ''));
  const facts = Object.fromEntries(FACT_KEYS.map(k => [k, cleanFact(FACT_LABEL[k], p[k])]));
  return {
    full_name: aiDisplayName(p, input.name).slice(0, 160),
    email: '',
    phone: '',
    gender: p.gender,
    ...(dob ? { dob } : {}),
    ...(height > 80 && height < 230 ? { height_cm: height } : {}),
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
      stage_name: usable(p.stage_name),
      real_name: usable(p.full_name),
      birth_year: year ? Number(year) : null,
      birth_date_exact: exact,
      hometown: usable(p.hometown),
      agency: usable(p.agency),
      training: p.training.map(t => usable(t)).filter(Boolean),
      skills: p.skills,
      facts,
      training_facts: p.training.map(t => cleanFact('Đào tạo', t)),
      films: p.films.map(f => ({ ...f, sources: cleanUrls(f.sources) })),
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
      return finish({ status: 'failed', usage, error: `Không xác định được diễn viên${input.name ? ` "${input.name}"` : ' từ các link đã gửi'}. ${profile.notes || 'Hãy thêm link tham khảo hoặc ghi chú để AI phân biệt.'}` });
    }
    // Hồ sơ AI tạo: khoá hiển thị công khai (chỉ ACT bật khi diễn viên / agency đồng ý). Chưa có cột khoá thì lưu không kèm.
    const row = toTalentRow(profile, input, by);
    let { data, error } = await db.from('talent_profiles').insert({ ...row, public_locked: true }).select('id').single();
    if (error && /public_locked/.test(error.message)) ({ data, error } = await db.from('talent_profiles').insert(row).select('id').single());
    if (error || !data) {
      console.error('[ai-talent] Không lưu được hồ sơ:', error?.message);
      return finish({ status: 'failed', usage, error: /ai_generated|ai_profile|submission_source/.test(error?.message || '') ? AI_JOBS_MISSING : 'Không lưu được hồ sơ. Vui lòng thử lại.' });
    }
    // Lượt chạy chỉ có link: ghi lại tên AI tìm được để danh sách dễ đọc
    return finish({ status: 'done', usage, talent_id: data.id, input: { ...input, name: input.name || aiDisplayName(profile, '') } });
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
