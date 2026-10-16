import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};
const ALLOWED_KINDS = ['headshot', 'fullbody', 'compcard'];

// Tải ảnh hồ sơ diễn viên công khai lên Supabase Storage (bucket talent-media, thư mục dienvienvn/).
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const kindRaw = String(formData.get('kind') || 'headshot');
    const kind = ALLOWED_KINDS.includes(kindRaw) ? kindRaw : 'headshot';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Chưa chọn ảnh.' }, { status: 400 });
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Ảnh vượt quá 8MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = createServiceClient();

    if (!supabase) {
      // Chế độ demo: trả về data URL để vẫn xem trước & lưu được hồ sơ.
      return NextResponse.json({ url: `data:${file.type};base64,${buffer.toString('base64')}`, stored: 'inline' });
    }

    const month = new Date().toISOString().slice(0, 7);
    const path = `dienvienvn/${month}/${kind}_${Date.now()}_${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('talent-media').upload(path, buffer, {
      contentType: file.type,
      upsert: false
    });

    if (error) {
      console.error('[dienvienvn] Upload ảnh thất bại:', error);
      return NextResponse.json({ error: 'Không tải được ảnh lên. Vui lòng thử lại.' }, { status: 500 });
    }

    const { data } = supabase.storage.from('talent-media').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, stored: 'supabase' });
  } catch (err) {
    console.error('[dienvienvn] Upload handler error:', err);
    return NextResponse.json({ error: 'Không tải được ảnh lên. Vui lòng thử lại.' }, { status: 500 });
  }
}
