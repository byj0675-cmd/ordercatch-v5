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
      // URL 파라미터로 매장 직접 조회
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('store_slug', slugFromParam)
        .single();
      storeId = profile?.id || null;
    } else {
      // 폴백: 메시지 본문에서 oc-xxxxxxxx 슬러그 추출
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
      return kakaoSimpleText(
        '매장 연결에 실패했습니다.\n설정에서 웹훅 URL을 다시 확인해 주세요.'
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

    if (parsedOrder.intent === 'update' && custPhone) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('store_id', storeId)
        .eq('customer_name', custName)
        .eq('phone', custPhone)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('orders')
          .update({
            product_name: parsedOrder.productName,
            pickup_date: parsedOrder.pickupDate ? new Date(parsedOrder.pickupDate) : null,
            options: parsedOrder.options,
            status: '수정됨',
          })
          .eq('id', existing.id);

        return kakaoSimpleText(
          `✅ 주문이 수정되었습니다!\n고객명: ${custName}\n상품: ${parsedOrder.productName}`
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
