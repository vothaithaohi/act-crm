import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Valid verify tokens for handshake with Meta Developer Portal
const VALID_VERIFY_TOKENS = [
  process.env.META_VERIFY_TOKEN,
  process.env.META_WEBHOOK_VERIFY_TOKEN,
  'act_secret_verify_token_2026',
  'act_crm_meta_token_secret_2025'
].filter(Boolean) as string[];

// GET: Meta Webhook Verification Handshake (hub.mode, hub.verify_token, hub.challenge)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && VALID_VERIFY_TOKENS.includes(token)) {
    console.log('[Meta Webhook Verified Successfully with token]:', token);
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[Meta Webhook Verification Failed]', { mode, token, validTokens: VALID_VERIFY_TOKENS });
  return NextResponse.json({ error: 'Verification failed. Token mismatch.' }, { status: 403 });
}

// POST: Handle Incoming Meta Events (LeadGen Form & Fanpage Messenger)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Meta Webhook Received Event]:', JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
    const supabase = createServiceClient();

    // =========================================================================
    // CASE 1: FANPAGE MESSENGER MESSAGE (Khách nhắn tin trực tiếp trên Fanpage)
    // =========================================================================
    const messagingItem = entry?.messaging?.[0] || body.messaging?.[0];
    if (messagingItem && (messagingItem.message || messagingItem.postback)) {
      const senderId = messagingItem.sender?.id || `psid_${Date.now()}`;
      const messageText = messagingItem.message?.text || messagingItem.postback?.title || 'Khách bắt đầu trò chuyện';
      const pageId = messagingItem.recipient?.id || entry?.id || 'act_fanpage';

      let customerName = `Khách nhắn Fanpage (${senderId.slice(-4)})`;
      let customerPhone = '';
      let customerEmail = '';

      // Extract phone number from message text if customer typed their phone
      const phoneMatch = messageText.match(/(0\d{9}|84\d{9}|\+84\d{9})/);
      if (phoneMatch) {
        customerPhone = phoneMatch[0].replace('+84', '0').replace(/^84/, '0');
      }

      // If Page Access Token is configured, query customer profile from Facebook Graph API
      if (pageAccessToken && senderId && !senderId.startsWith('mock_')) {
        try {
          const profileRes = await fetch(
            `https://graph.facebook.com/v20.0/${senderId}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`
          );
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.first_name || profileData.last_name) {
              customerName = `${profileData.last_name || ''} ${profileData.first_name || ''}`.trim();
            }
          }
        } catch (graphErr) {
          console.warn('Could not fetch Facebook profile for PSID:', senderId, graphErr);
        }
      }

      // Detect course interest keyword from message content
      let courseInterest = 'Tư vấn qua Fanpage Messenger';
      const textLower = messageText.toLowerCase();
      if (textLower.includes('act 4') || textLower.includes('act4')) {
        courseInterest = 'Khóa Diễn xuất Điện ảnh ACT 4';
      } else if (textLower.includes('act 3') || textLower.includes('act3')) {
        courseInterest = 'Khóa Diễn xuất Trước Ống Kính ACT 3';
      } else if (textLower.includes('act 2') || textLower.includes('act2')) {
        courseInterest = 'Khóa Diễn xuất Kỹ thuật ACT 2';
      } else if (textLower.includes('act 1') || textLower.includes('act1')) {
        courseInterest = 'Khóa Diễn xuất Căn bản ACT 1';
      } else if (textLower.includes('ssc')) {
        courseInterest = 'Khóa Chuyên đề Diễn xuất SSC';
      } else if (textLower.includes('học phí') || textLower.includes('báo giá')) {
        courseInterest = 'Tư vấn Học phí & Lịch khai giảng ACT';
      }

      const noteContent = `Tin nhắn Fanpage: "${messageText}" \nFacebook PSID: ${senderId} \nThời gian: ${new Date().toLocaleString('vi-VN')}`;

      // Insert Lead into database
      if (supabase) {
        const { data: newLead, error: insertError } = await supabase.from('leads').insert({
          full_name: customerName,
          phone: customerPhone,
          email: customerEmail,
          source: 'meta_ads',
          meta_lead_id: `msg_${senderId}`,
          campaign_name: 'Fanpage_Messenger_Direct',
          adset_name: 'Organic_Chat',
          ad_name: 'Messenger_Inbox',
          course_interest: courseInterest,
          notes: noteContent,
          status: 'intake',
          tuition_fee: 0
        }).select().single();

        if (insertError) {
          console.error('[Supabase Insert Error from Message]:', insertError);
        } else {
          console.log('[Lead Created from Fanpage Message]:', newLead);
        }

        // Record Webhook Log
        try {
          await supabase.from('webhook_logs').insert({
            event: 'messages.received',
            source: 'meta_messenger',
            payload: {
              sender_id: senderId,
              customer_name: customerName,
              message_text: messageText,
              detected_phone: customerPhone,
              course_interest: courseInterest
            },
            status: insertError ? 'failed' : 'success',
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
          });
        } catch (logErr) {
          console.warn('Could not write message log:', logErr);
        }
      }

      return NextResponse.json({
        success: true,
        type: 'messenger',
        message: 'Fanpage message processed and linked to CRM successfully',
        lead: {
          full_name: customerName,
          phone: customerPhone,
          message_text: messageText,
          status: 'intake'
        }
      }, { status: 200 });
    }

    // =========================================================================
    // CASE 2: META ADS LEADGEN FORM (Khách điền Instant Form trên Quảng cáo)
    // =========================================================================
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const leadgenId = value?.leadgen_id || body.leadgen_id || `meta_${Date.now()}`;
    const formId = value?.form_id || body.form_id || 'act_lead_form';
    const pageId = value?.page_id || body.page_id;

    let fullName = body.full_name || 'Học viên Meta Ads';
    let phone = body.phone || '';
    let email = body.email || '';
    let courseInterest = body.course_interest || 'Khóa Diễn xuất Điện ảnh (ACT Pro)';
    let campaignName = body.campaign_name || 'Meta_Ads_ACT_LeadGen';
    let adsetName = body.adset_name || 'GenZ_Cinema_Cast';
    let adName = body.ad_name || 'Video_HuongDan_DienXuat';
    const auxiliaryQuestions: Record<string, any> = {};

    // If Meta Page Access Token is provided, fetch lead details from Graph API v20.0
    if (pageAccessToken && leadgenId && !body.full_name && !String(leadgenId).startsWith('mock_')) {
      try {
        const graphRes = await fetch(
          `https://graph.facebook.com/v20.0/${leadgenId}?fields=created_time,field_data&access_token=${pageAccessToken}`
        );
        if (graphRes.ok) {
          const leadData = await graphRes.json();
          if (leadData.field_data) {
            for (const field of leadData.field_data) {
              const name = (field.name || '').toLowerCase();
              const val = field.values?.[0];
              if (name.includes('name') || name.includes('họ_tên') || name === 'full_name') {
                fullName = val;
              } else if (name.includes('phone') || name.includes('số_điện_thoại') || name === 'phone_number') {
                phone = val;
              } else if (name.includes('email')) {
                email = val;
              } else if (name.includes('course') || name.includes('khóa_học')) {
                courseInterest = val;
              } else {
                auxiliaryQuestions[field.name] = field.values?.length === 1 ? field.values[0] : field.values;
              }
            }
          }
        } else {
          console.warn('[Meta Graph API Error]:', await graphRes.text());
        }
      } catch (graphError) {
        console.error('Failed to fetch from Meta Graph API v20.0:', graphError);
      }
    }

    const notesSummary = [
      `Form ID: ${formId}`,
      auxiliaryQuestions && Object.keys(auxiliaryQuestions).length > 0 ? `Câu hỏi bổ trợ: ${JSON.stringify(auxiliaryQuestions)}` : ''
    ].filter(Boolean).join(' | ');

    // Insert directly into leads table with pipeline status "intake"
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
        notes: notesSummary,
        status: 'intake',
        tuition_fee: 0
      }).select().single();

      if (error) {
        console.error('[Supabase Insert Error]:', error);
      } else {
        console.log('[Lead Inserted via Supabase Service Role]:', data);
      }

      // Record in webhook_logs for developer & marketing visibility
      try {
        await supabase.from('webhook_logs').insert({
          event: 'leadgen.received',
          source: 'meta_ads',
          payload: {
            leadgen_id: leadgenId,
            full_name: fullName,
            phone,
            email,
            course_interest: courseInterest,
            campaign_name: campaignName,
            adset_name: adsetName,
            ad_name: adName,
            notes: notesSummary
          },
          status: error ? 'failed' : 'success',
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
        });
      } catch (logErr) {
        console.warn('Could not write to webhook_logs:', logErr);
      }
    }

    // Return HTTP 200 immediately
    return NextResponse.json({
      success: true,
      type: 'leadgen',
      message: 'Meta Lead Form processed successfully',
      lead: {
        leadgen_id: leadgenId,
        full_name: fullName,
        phone,
        email,
        source: 'meta_ads',
        status: 'intake'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[Meta Webhook Error]:', error);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
