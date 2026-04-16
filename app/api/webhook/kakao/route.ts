import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseOrderWithGemini } from '@/app/lib/gemini';

export const runtime = 'nodejs';

const ORDER_FORM_MARKER = '[오더캐치 주문서]';

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

    const utterance: string = body.userRequest?.utterance || '';

    // ── 주문서 양식 없으면 무시 ────────────────────────────
    if (!utterance.includes(ORDER_FORM_MARKER)) {
      return new NextResponse(null, { status: 200 });
    }

    // ── 매장 식별 (URL 파라미터 storeSlug 필수) ────────────
    const url = new URL(req.url);
    const slugFromParam = url.searchParams.get('storeSlug') || url.searchParams.get('storeId');

    if (!slugFromParam) {
      console.error('[Kakao Webhook] storeSlug 파라미터 없음');
      return new NextResponse(null, { status: 200 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('store_slug', slugFromParam)
      .single();

    if (profileError || !profile) {
      console.error('[Kakao Webhook] 매장 없음. slug:', slugFromParam, profileError?.message);
      return new NextResponse(null, { status: 200 });
    }

    const storeId = profile.id;

    // ── 주문서 블록 추출 (마커 이전 잡담 제거) ──────────────
    const markerIdx = utterance.indexOf(ORDER_FORM_MARKER);
    const textToParse = utterance.slice(markerIdx);

    // ── Gemini 파싱 (4.5초 타임아웃 — 카카오 5초 제한 대응) ─
    let parsedOrder;
    try {
      const parsePromise = parseOrderWithGemini(textToParse);
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 4500)
      );
      parsedOrder = await Promise.race([parsePromise, timeoutPromise]);
    } catch (err: any) {
      console.error('[Kakao Webhook] Gemini 오류:', err.message);
      return kakaoSimpleText('주문서 분석 중 오류가 발생했습니다. 잠시 후 다시 보내주세요.');
    }

    if (!parsedOrder) {
      return kakaoSimpleText('주문서를 읽지 못했습니다. 양식을 확인 후 다시 보내주세요.');
    }

    const custName = parsedOrder.customerName || '미상';
    const custPhone = parsedOrder.phone || '';

    // ── 수정 의도 처리 ──────────────────────────────────────
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

      // 방법 2: 고객명만 (가장 최근)
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

        const pickupStr = parsedOrder.pickupDate
          ? new Date(parsedOrder.pickupDate).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '';

        return kakaoSimpleText(
          `✅ 주문이 수정되었습니다!\n\n고객명: ${custName}${parsedOrder.productName ? `\n상품: ${parsedOrder.productName}` : ''}${pickupStr ? `\n픽업일: ${pickupStr}` : ''}`
        );
      }
      // 기존 주문 못 찾으면 신규 등록으로 계속 진행
    }

    // ── 신규 주문 저장 ──────────────────────────────────────
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

    const pickupStr = parsedOrder.pickupDate
      ? new Date(parsedOrder.pickupDate).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '미정';

    return kakaoSimpleText(
      `✅ 주문이 접수되었습니다!\n\n고객명: ${custName}\n상품: ${parsedOrder.productName}\n픽업일: ${pickupStr}\n\n장부에 등록되었어요 📋`
    );

  } catch (error) {
    console.error('[Kakao Webhook Error]:', error);
    return new NextResponse(null, { status: 200 });
  }
}
