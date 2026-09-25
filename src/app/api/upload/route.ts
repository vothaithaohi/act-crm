import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'talents';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${folder}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = createServiceClient();
    if (supabase) {
      const { data, error } = await supabase.storage
        .from('talent-media')
        .upload(fileName, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const { data: publicUrlData } = supabase.storage
        .from('talent-media')
        .getPublicUrl(fileName);

      return NextResponse.json({
        success: true,
        url: publicUrlData.publicUrl,
      });
    }

    // Fallback if Supabase credentials are not set up yet
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64Data}`;
    return NextResponse.json({
      success: true,
      url: dataUrl,
      note: 'Uploaded as data URL (cấu hình NEXT_PUBLIC_SUPABASE_URL để lưu vào cloud storage)'
    });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
