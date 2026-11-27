-- Recap cuộc họp (recap.dienvienvn.com): tải file ghi âm → bóc băng → tóm tắt + Action Items.
-- Mỗi người thấy cuộc họp mình tải lên, Super Admin thấy tất cả. Đọc / ghi qua máy chủ (API). Chạy lại nhiều lần vẫn an toàn.
CREATE TABLE IF NOT EXISTS public.meeting_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  audio_path TEXT,
  audio_name TEXT,
  audio_size BIGINT,
  audio_mime TEXT,
  duration_seconds INTEGER,
  -- uploading | transcribing | summarizing | completed | failed
  status TEXT NOT NULL DEFAULT 'uploading',
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  -- Transcript: [{ "t": giây, "speaker": "S1", "text": "..." }]; speakers: { "S1": "Thảo" }
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  speakers JSONB NOT NULL DEFAULT '{}'::jsonb,
  recap_markdown TEXT,
  ai_provider_used TEXT,
  ai_file TEXT,
  ai_file_uri TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  lock_until TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_recaps_user ON public.meeting_recaps (user_email, created_at DESC);
ALTER TABLE public.meeting_recaps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meeting_recaps FROM anon, authenticated;

-- Kho file ghi âm (riêng tư, tối đa 500MB/file). File tự xoá sau 30 ngày, chỉ giữ chữ.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meeting-audio', 'meeting-audio', false, 524288000, NULL)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 524288000;

NOTIFY pgrst, 'reload schema';
