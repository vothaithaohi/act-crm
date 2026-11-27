// Recap cuộc họp: kiểu dữ liệu + định dạng dùng chung cho trình duyệt và máy chủ.

export type RecapStatus = 'uploading' | 'transcribing' | 'summarizing' | 'completed' | 'failed';
export type Segment = { t: number; speaker: string; text: string };
export type Meeting = {
  id: string;
  user_email: string;
  title: string;
  audio_path: string | null;
  audio_name: string | null;
  audio_size: number | null;
  audio_mime: string | null;
  duration_seconds: number | null;
  status: RecapStatus;
  progress: { done?: number; total?: number; stage?: string };
  error: string | null;
  segments: Segment[];
  speakers: Record<string, string>;
  recap_markdown: string | null;
  ai_provider_used: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const MAX_AUDIO_BYTES = 500 * 1024 * 1024;
export const AUDIO_EXTS = ['mp3', 'm4a', 'wav', 'mp4', 'webm'];
export const AUDIO_BUCKET = 'meeting-audio';
/** Mỗi lần gọi AI bóc băng 20 phút (vừa giới hạn thời gian chạy của máy chủ). */
export const CHUNK_SECONDS = 20 * 60;
export const AUDIO_KEEP_DAYS = 30;

export const STATUS_LABEL: Record<RecapStatus, string> = {
  uploading: 'Đang tải lên',
  transcribing: 'Đang bóc băng',
  summarizing: 'Đang tạo tóm tắt',
  completed: 'Hoàn tất',
  failed: 'Lỗi'
};

export const fileExt = (name: string) => (name.split('.').pop() || '').toLowerCase();

/** 75 → "01:15", 3725 → "1:02:05" */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}

/** "01:15" / "1:02:05" / "75" → giây */
export function parseClock(v: string | number): number {
  if (typeof v === 'number') return v;
  const parts = String(v).trim().split(':').map(Number);
  if (parts.some(n => isNaN(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** Tên hiển thị của người nói: tên đã đổi, hoặc "Speaker 01". */
export function speakerName(id: string, speakers: Record<string, string>): string {
  if (speakers[id]?.trim()) return speakers[id].trim();
  const n = Number(id.replace(/\D/g, ''));
  return n ? `Speaker ${String(n).padStart(2, '0')}` : id;
}

export function transcriptText(segments: Segment[], speakers: Record<string, string>): string {
  return segments.map(s => `[${clock(s.t)}] ${speakerName(s.speaker, speakers)}: ${s.text}`).join('\n');
}

export function fileSafe(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 60) || 'cuoc-hop'
  );
}
