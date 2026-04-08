import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseOrderWithGemini } from '@/app/lib/gemini';

// 카카오 챗봇 응답 포맷 렌더러
function kakaoSimpleText(text: string) {
  return NextResponse.json({
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: {
            text: text,
          },
        },
      ],
    },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // 카카오 챗봇 페이로드 검증 (userRequest.utterance)
    const utterance = body.userRequest?.utterance || '';

    // 1. 안전장치: "오더캐치 주문서" 키워드 검사
    if (!utterance.includes('오더캐치 주문서')) {
      return kakaoSimpleText('주문서 양식에 맞춰 입력해 주세요. (예: "오더캐치 주문서" 라는 단어를 포함해주세요)');
    }

    // 2. 매장 식별 (정규식 기반 store_slug 추출)
    // 패턴: oc- 로 시작하고 소문자+숫자 조합 8자리
    const slugMatch = utterance.match(/oc-[a-z0-9]{8}/i);
    
    if (!slugMatch) {
      return kakaoSimpleText('매장 고유 코드를 찾을 수 없습니다. (예: 매장코드: oc-a1b2c3d4 형식을 포함해 주세요)');
    }
    
    const storeSlug = slugMatch[0].toLowerCase();

    // DB에서 store_slug 로 profiles 의 id(store_id) 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('store_slug', storeSlug)
      .single();

    if (profileError || !profile) {
      return kakaoSimpleText('유효하지 않은 매장 코드입니다. 사장님께 올바른 코드를 확인해 주세요!');
    }

    const storeId = profile.id;

    // 3. Gemini AI 기반 비정형 주문 텍스트 파싱
    const parsedOrder = await parseOrderWithGemini(utterance);

    if (!parsedOrder) {
      return kakaoSimpleText('주문서 분석에 실패했습니다. 형식에 맞게 다시 시도해 주세요.');
    }

    // 4. 데이터베이스 Upsert 로직 (신규 / 기존 병합)
    // 고객 정보가 모자랄 경우를 대비해 기본값 할당 (AI가 추출 실패 시)
    const custName = parsedOrder.customerName || "미상";
    const custPhone = parsedOrder.phone || "";

    if (parsedOrder.intent === 'update' && custPhone) {
      // 연락처가 있고 업데이트 의도일 경우 기존 건 수정 시도
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('store_id', storeId)
        .eq('customer_name', custName)
        .eq('phone', custPhone)
        .single();

      if (existing) {
        // 기존 주문 업데이트
        await supabase
          .from('orders')
          .update({
            product_name: parsedOrder.productName,
            pickup_date: parsedOrder.pickupDate ? new Date(parsedOrder.pickupDate) : null,
            options: parsedOrder.options,
            status: '수정됨'
          })
          .eq('id', existing.id);
          
        return kakaoSimpleText('사장님의 장부에 주문 수정이 성공적으로 등록되었습니다! ✅');
      }
    } 

    // 업데이트로 감지되었으나 원본이 없거나 (or 전화번호 누락), 완전히 새로운 주문일 경우 신규 추가
    await supabase.from('orders').insert([{
      store_id: storeId,
      customer_name: custName,
      phone: custPhone,
      product_name: parsedOrder.productName,
      pickup_date: parsedOrder.pickupDate ? new Date(parsedOrder.pickupDate) : null,
      status: '입금대기',
      source: 'kakao_bot',
      options: parsedOrder.options
    }]);

    // 5. 카카오 챗봇 최종 응답 반환
    return kakaoSimpleText('사장님의 장부에 신규 주문이 성공적으로 등록되었습니다! ✅');

  } catch (error) {
    console.error('Kakao Webhook Error:', error);
    return kakaoSimpleText('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
}
