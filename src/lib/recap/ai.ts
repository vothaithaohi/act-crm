import 'server-only';
import { Segment, clock, parseClock } from './types';

/**
 * Lớp AI của Recap (AI Provider Adapter). Web chỉ gọi qua giao diện RecapAI,
 * nên sau này đổi sang Whisper / Qwen chạy trên máy công ty chỉ cần viết thêm 1 provider.
 * Hiện dùng Gemini (GEMINI_API_KEY trên Vercel). Đổi model bằng RECAP_GEMINI_MODEL.
 */
export type AudioSource = {
  size: number;
  mime: string;
  name: string;
  /** Đọc 1 đoạn byte [start, end) của file gốc */
  read: (start: number, end: number) => Promise<ArrayBuffer>;
};
export type AiFile = { name: string; uri: string; mime: string };
export type TranscribePart = { from: number; to: number | null; knownSpeakers: { id: string; description: string }[] };
export type TranscribeResult = { segments: Segment[]; speakers: { id: string; description: string }[] };

export interface RecapAI {
  label: string;
  upload(src: AudioSource): Promise<AiFile>;
  waitReady(file: AiFile): Promise<void>;
  transcribe(file: AiFile, part: TranscribePart): Promise<TranscribeResult>;
  summarize(title: string, transcript: string): Promise<string>;
  remove(file: AiFile): Promise<void>;
}

export function getRecapAI(): RecapAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return gemini(key, process.env.RECAP_GEMINI_MODEL || 'gemini-2.5-flash');
}

export const AI_MISSING = 'Máy chủ chưa có GEMINI_API_KEY. Thêm key trong Vercel → Settings → Environment Variables rồi deploy lại.';

const GLOSSARY =
  'Bối cảnh: cuộc họp nội bộ của ACT Academy / DienVienVN (đào tạo diễn viên, casting, sản xuất phim / TVC / MV). ' +
  'Từ tiếng Anh hay gặp, giữ nguyên chữ tiếng Anh: casting, script, KPI, deadline, funnel, self-tape, TVC, MV, brief, booking, ' +
  'showreel, lead, sale, marketing, content, ads, CRM, landing page, workshop, producer, director.';

const API = 'https://generativelanguage.googleapis.com';

function gemini(key: string, model: string): RecapAI {
  const headers = { 'x-goog-api-key': key };

  async function call(path: string, init: RequestInit & { timeoutMs?: number } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 30_000);
    try {
      const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) }, signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async function generate(parts: unknown[], config: Record<string, unknown>, timeoutMs: number): Promise<string> {
    const thinking = /2\.5/.test(model) ? { thinkingConfig: { thinkingBudget: /flash/.test(model) ? 0 : 128 } } : {};
    const res = await call(`/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.2, maxOutputTokens: 65536, ...thinking, ...config } }),
      timeoutMs
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);
    const data = JSON.parse(text);
    const cand = data?.candidates?.[0];
    const out = (cand?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('');
    if (!out) throw new Error(`Gemini không trả nội dung (${cand?.finishReason || data?.promptFeedback?.blockReason || 'không rõ'})`);
    return out;
  }

  return {
    label: model,

    // Tải file lên Gemini theo từng khúc 32MB (không giữ cả file 500MB trong bộ nhớ)
    async upload(src) {
      const start = await call('/upload/v1beta/files', {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(src.size),
          'X-Goog-Upload-Header-Content-Type': src.mime,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file: { display_name: src.name.slice(0, 120) } })
      });
      const url = start.headers.get('x-goog-upload-url');
      if (!start.ok || !url) throw new Error(`Gemini upload ${start.status}: ${(await start.text()).slice(0, 200)}`);
      const CHUNK = 32 * 1024 * 1024;
      let last: Response | null = null;
      for (let off = 0; off < src.size; off += CHUNK) {
        const end = Math.min(src.size, off + CHUNK);
        const body = await src.read(off, end);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 120_000);
        try {
          last = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Length': String(body.byteLength),
              'X-Goog-Upload-Offset': String(off),
              'X-Goog-Upload-Command': end >= src.size ? 'upload, finalize' : 'upload'
            },
            body,
            signal: ctrl.signal
          });
        } finally {
          clearTimeout(timer);
        }
        if (!last.ok) throw new Error(`Gemini upload ${last.status}: ${(await last.text()).slice(0, 200)}`);
      }
      const data = await last!.json();
      const f = data?.file;
      if (!f?.name || !f?.uri) throw new Error('Gemini không trả thông tin file.');
      return { name: f.name, uri: f.uri, mime: f.mimeType || src.mime };
    },

    async waitReady(file) {
      for (let i = 0; i < 60; i++) {
        const res = await call(`/v1beta/${file.name}`);
        const f = await res.json().catch(() => null);
        if (f?.state === 'ACTIVE') return;
        if (f?.state === 'FAILED') throw new Error('Gemini không đọc được file ghi âm (file hỏng hoặc định dạng không hỗ trợ).');
        if (res.status === 404) throw new Error('FILE_GONE');
        await new Promise(r => setTimeout(r, 3000));
      }
      throw new Error('Gemini xử lý file quá lâu.');
    },

    async transcribe(file, part) {
      const range =
        part.to === null
          ? 'toàn bộ file'
          : `CHỈ đoạn từ ${clock(part.from)} đến ${clock(part.to)} (bỏ qua phần trước và sau)`;
      const known = part.knownSpeakers.length
        ? `Các người nói đã xác định ở đoạn trước (giữ đúng mã nếu là cùng người): ${part.knownSpeakers.map(s => `${s.id} = ${s.description}`).join('; ')}.`
        : '';
      const prompt = [
        `Bóc băng nguyên văn tiếng Việt ${range} của file ghi âm cuộc họp.`,
        GLOSSARY,
        'Yêu cầu: chép đúng lời nói (bỏ từ đệm vô nghĩa như "ờ", "à"), có dấu câu, chia đoạn theo lượt nói, mỗi đoạn tối đa khoảng 4 câu.',
        'Tách người nói: đặt mã S1, S2, S3… ' + known,
        'Mốc thời gian "start" là thời điểm bắt đầu đoạn tính từ đầu file, dạng HH:MM:SS.',
        'Trong "speakers", mô tả ngắn từng người nói (giọng nam/nữ, vai trò, tên nếu được gọi tên) để nhận ra họ ở đoạn sau.',
        'Không có lời nói thì trả segments rỗng.'
      ].join('\n');
      const media: Record<string, unknown> = { file_data: { mime_type: file.mime, file_uri: file.uri } };
      // Video (.mp4/.webm): chỉ cắt đúng đoạn và giảm khung hình để không tốn token phần hình
      if (/^video\//.test(file.mime) && part.to !== null) {
        media.video_metadata = { start_offset: `${Math.floor(part.from)}s`, end_offset: `${Math.ceil(part.to)}s`, fps: 0.2 };
      }
      const raw = await generate(
        [media, { text: prompt }],
        {
          responseMimeType: 'application/json',
          ...(/^video\//.test(file.mime) ? { mediaResolution: 'MEDIA_RESOLUTION_LOW' } : {}),
          responseSchema: {
            type: 'OBJECT',
            properties: {
              speakers: {
                type: 'ARRAY',
                items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, description: { type: 'STRING' } }, required: ['id', 'description'] }
              },
              segments: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: { start: { type: 'STRING' }, speaker: { type: 'STRING' }, text: { type: 'STRING' } },
                  required: ['start', 'speaker', 'text']
                }
              }
            },
            required: ['speakers', 'segments']
          }
        },
        280_000
      );
      let data: { speakers?: { id: string; description: string }[]; segments?: { start: string; speaker: string; text: string }[] };
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error('Gemini trả bản bóc băng không đúng định dạng (có thể đoạn quá dài).');
      }
      const segments = (data.segments || [])
        .map(s => ({ t: parseClock(s.start), speaker: /^S\d+$/i.test(s.speaker?.trim()) ? s.speaker.trim().toUpperCase() : 'S1', text: (s.text || '').trim() }))
        .filter(s => s.text);
      return { segments, speakers: (data.speakers || []).filter(s => s?.id) };
    },

    async summarize(title, transcript) {
      const prompt = [
        `Bạn là thư ký cuộc họp. Viết biên bản cuộc họp "${title}" bằng tiếng Việt, định dạng Markdown, dựa trên bản bóc băng bên dưới.`,
        GLOSSARY,
        'Đúng 4 mục, dùng đúng tiêu đề sau:',
        '## Tóm tắt tổng quan\n(mục tiêu và bối cảnh cuộc họp, 2–5 câu)',
        '## Nội dung thảo luận chính\n(gạch đầu dòng theo từng đầu mục quan trọng, có ý chính bên trong)',
        '## Quyết định đã chốt\n(gạch đầu dòng các phương án đã thống nhất; không có thì ghi "Chưa có quyết định cụ thể.")',
        '## Action Items\n(bảng Markdown 4 cột: | # | Đầu việc | Người phụ trách | Thời hạn |; không được nhắc thì ghi "—"; không có việc nào thì ghi "Chưa có đầu việc cụ thể.")',
        'Chỉ dùng thông tin có trong bản bóc băng, không bịa. Gọi người theo tên trong bản bóc băng. Không viết lời mở đầu hay kết.',
        '',
        'BẢN BÓC BĂNG:',
        transcript
      ].join('\n');
      const out = await generate([{ text: prompt }], {}, 280_000);
      return out.replace(/^```(?:markdown)?\s*/i, '').replace(/```\s*$/, '').trim();
    },

    async remove(file) {
      await call(`/v1beta/${file.name}`, { method: 'DELETE' }).catch(() => null);
    }
  };
}
