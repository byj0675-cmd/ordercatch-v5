import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseOrderWithGemini } from '@/app/lib/gemini';

function kakaoSimpleText(text: string) {
  return NextResponse.json({
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
    },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // 카카오 챗봇 utterance 추출
    const utterance: string = body.userRequest?.utterance || '';

    if (!utterance.trim()) {
      return kakaoSimpleText('주문 내용을 입력해 주세요.');
    }

    // ── 매장 식별 ──────────────────────────────────────
    // 방법 1: URL 쿼리 파라미터 ?storeSlug=oc-xxxxxxxx (권장)
    // 방법 2: 메시지 본문에서 슬러그 추출 (하위 호환)
    const url = new URL(req.url);
    const slugFromParam = url.searchParams.get('storeSlug') || url.searchParams.get('storeId');

    let storeId: string | null = null;

    if (slugFromParam) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('store_slug', slugFromParam)
        .single();
      if (profileError) console.error('[Kakao Webhook] Profile lookup error:', profileError.message, 'slug:', slugFromParam);
      storeId = profile?.id || null;
    } else {
      const slugMatch = utterance.match(/oc-[a-z0-9]{8}/i);
      if (slugMatch) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('store_slug', slugMatch[0].toLowerCase())
          .single();
        storeId = profile?.id || null;
      }
    }

    if (!storeId) {
      console.error('[Kakao Webhook] storeId not found. slugFromParam:', slugFromParam);
      return kakaoSimpleText(
        `[오류] 매장을 찾을 수 없습니다. (코드: ${slugFromParam || '없음'})\n설정에서 웹훅 URL을 다시 확인해 주세요.`
      );
    }

    // ── Gemini AI 파싱 (4.5초 타임아웃 — 카카오 5초 제한 대응) ──
    let parsedOrder;
    try {
      const parsePromise = parseOrderWithGemini(utterance);
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 4500)
      );
      parsedOrder = await Promise.race([parsePromise, timeoutPromise]);
    } catch (err: any) {
      if (err.message === 'TIMEOUT') {
        return kakaoSimpleText(
          'AI 분석이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.\n(주문 내용이 너무 길면 짧게 줄여 보내 주세요)'
        );
      }
      return kakaoSimpleText('AI 분석 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }

    if (!parsedOrder) {
      return kakaoSimpleText('주문서 분석에 실패했습니다. 다시 시도해 주세요.');
    }

    // ── DB 저장 ────────────────────────────────────────
    const custName = parsedOrder.customerName || '미상';
    const custPhone = parsedOrder.phone || '';

    if (parsedOrder.intent === 'update') {
      let existingId: string | null = null;

      // 방법 1: 고객명 + 전화번호
      if (custPhone) {
        const { data } = await supabase
          .from('orders').select('id')
          .eq('store_id', storeId).eq('customer_name', custName).eq('phone', custPhone)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        existingId = data?.id || null;
      }

      // 방법 2: 고객명만 (가장 최근 주문)
      if (!existingId) {
        const { data } = await supabase
          .from('orders').select('id')
          .eq('store_id', storeId).eq('customer_name', custName)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        existingId = data?.id || null;
      }

      if (existingId) {
        const updatePayload: Record<string, any> = { status: '수정됨' };
        if (parsedOrder.productName) updatePayload.product_name = parsedOrder.productName;
        if (parsedOrder.pickupDate) updatePayload.pickup_date = new Date(parsedOrder.pickupDate);
        if (parsedOrder.options && Object.keys(parsedOrder.options).length > 0) updatePayload.options = parsedOrder.options;

        await supabase.from('orders').update(updatePayload).eq('id', existingId);

        return kakaoSimpleText(
          `✅ 주문이 수정되었습니다!\n고객명: ${custName}\n${parsedOrder.productName ? `상품: ${parsedOrder.productName}\n` : ''}${parsedOrder.pickupDate ? `픽업일: ${new Date(parsedOrder.pickupDate).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}`
        );
      }
    }

    const { error: insertError } = await supabase.from('orders').insert([{
      store_id: storeId,
      customer_name: custName,
      phone: custPhone,
      product_name: parsedOrder.productName,
      pickup_date: parsedOrder.pickupDate ? new Date(parsedOrder.pickupDate) : null,
      status: '입금대기',
      source: 'kakao_bot',
      options: parsedOrder.options,
    }]);

    if (insertError) {
      console.error('[Kakao Webhook Insert Error]:', insertError);
      return kakaoSimpleText('주문 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }

    return kakaoSimpleText(
      `✅ 주문이 접수되었습니다!\n고객명: ${custName}\n상품: ${parsedOrder.productName}\n사장님 장부에 바로 등록되었어요 📋`
    );

  } catch (error) {
    console.error('[Kakao Webhook Error]:', error);
    return kakaoSimpleText('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
}
