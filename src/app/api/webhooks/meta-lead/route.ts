import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET: Meta Webhook Verification Challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'act_crm_meta_token_secret_2025';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook Verified]');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[Meta Webhook Verification Failed]', { mode, token });
  return NextResponse.json({ error: 'Verification failed. Token mismatch.' }, { status: 403 });
}

// POST: Handle Incoming Meta Lead Event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Meta Webhook Received Event]:', JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const leadgenId = value?.leadgen_id || body.leadgen_id || `meta_${Date.now()}`;
    const formId = value?.form_id || body.form_id || 'act_lead_form';
    const pageId = value?.page_id || body.page_id;

    let fullName = body.full_name || 'Học viên Meta Ads';
    let phone = body.phone || '0900000000';
    let email = body.email || `lead_${leadgenId}@gmail.com`;
    let courseInterest = body.course_interest || 'Khóa Diễn xuất Điện ảnh (ACT Pro)';
    let campaignName = body.campaign_name || 'Meta_Ads_ACT_LeadGen';
    let adsetName = body.adset_name || 'GenZ_Cinema_Cast';
    let adName = body.ad_name || 'Video_HuongDan_DienXuat';

    // If Meta Page Access Token is provided, fetch lead details from Graph API
    const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (pageAccessToken && leadgenId && !body.full_name) {
      try {
        const graphRes = await fetch(
          `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${pageAccessToken}`
        );
        if (graphRes.ok) {
          const leadData = await graphRes.json();
          if (leadData.field_data) {
            for (const field of leadData.field_data) {
              const name = field.name?.toLowerCase();
              const val = field.values?.[0];
              if (name.includes('name') || name.includes('họ_tên')) fullName = val;
              if (name.includes('phone') || name.includes('số_điện_thoại')) phone = val;
              if (name.includes('email')) email = val;
              if (name.includes('course') || name.includes('khóa_học')) courseInterest = val;
            }
          }
        }
      } catch (graphError) {
        console.error('Failed to fetch from Meta Graph API:', graphError);
      }
    }

    const supabase = createServiceClient();
    if (supabase) {
      const { data, error } = await supabase.from('leads').insert({
        full_name: fullName,
        phone: phone,
        email: email,
        source: 'meta_ads',
        meta_lead_id: String(leadgenId),
        campaign_name: campaignName,
        adset_name: adsetName,
        ad_name: adName,
        course_interest: courseInterest,
        notes: `Tự động nhận qua Meta Webhook (Form ID: ${formId}, Page ID: ${pageId || 'N/A'})`,
        status: 'new'
      }).select().single();

      if (error) {
        console.error('[Supabase Insert Error]:', error);
      } else {
        console.log('[Lead Inserted via Supabase]:', data);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Meta Lead processed successfully',
      lead: {
        leadgen_id: leadgenId,
        full_name: fullName,
        phone,
        email,
        source: 'meta_ads',
        status: 'new'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[Meta Webhook Error]:', error);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
