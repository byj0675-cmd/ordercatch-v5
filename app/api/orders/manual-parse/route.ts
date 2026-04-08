import { NextResponse } from "next/server";
import { parseOrderWithGemini } from "@/app/lib/gemini";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { text, storeId } = body;

    if (!text) {
      return NextResponse.json({ error: "주문 텍스트가 없습니다." }, { status: 400 });
    }

    if (!storeId) {
      return NextResponse.json({ error: "매장 식별 정보(storeId)가 없습니다." }, { status: 400 });
    }

    const parsedOrder = await parseOrderWithGemini(text);

    if (!parsedOrder) {
      return NextResponse.json({ error: "AI 분석에 실패했습니다." }, { status: 500 });
    }

    let isUpdateResult = false;
    
    // DB Upsert 진행
    if (parsedOrder.intent === 'update' && parsedOrder.phone) {
      // 기존 예약(동일 매장, 이름, 전화번호)이 있는지 조회
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('store_id', storeId)
        .eq('customer_name', parsedOrder.customerName)
        .eq('phone', parsedOrder.phone)
        .single();

      if (existing) {
        // 수정(Update) 처리
        const { error } = await supabase
          .from('orders')
          .update({
            product_name: parsedOrder.productName,
            pickup_date: parsedOrder.pickupDate ? new Date(parsedOrder.pickupDate) : null,
            options: parsedOrder.options,
            status: "수정됨"
          })
          .eq('id', existing.id);
        
        if (!error) isUpdateResult = true;
      } else {
          // 매칭되는 게 없으면 신규
          await supabase.from('orders').insert([{
          store_id: storeId,
          customer_name: parsedOrder.customerName,
          phone: parsedOrder.phone,
          product_name: parsedOrder.productName,
          pickup_date: parsedOrder.pickupDate ? new Date(parsedOrder.pickupDate) : null,
          status: '입금대기',
          source: 'manual',
          options: parsedOrder.options
        }]);
      }
    } else {
      // 의도가 신규이거나, 연락처(phone)가 없어 동일인물 확정이 불가능하면 안전하게 신규 Insert
      await supabase.from('orders').insert([{
        store_id: storeId,
        customer_name: parsedOrder.customerName,
        phone: parsedOrder.phone,
        product_name: parsedOrder.productName,
        pickup_date: parsedOrder.pickupDate ? new Date(parsedOrder.pickupDate) : null,
        status: '입금대기',
        source: 'manual',
        options: parsedOrder.options
      }]);
    }

    return NextResponse.json({ ...parsedOrder, isUpdate: isUpdateResult });
  } catch (err) {
    console.error("[Backend Error Details]:", err);
    return NextResponse.json({ error: "서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
