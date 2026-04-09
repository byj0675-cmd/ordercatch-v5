import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { orderData, storeId } = body;

    if (!orderData || !storeId) {
      return NextResponse.json({ error: "주문 데이터 또는 매장 정보가 누락되었습니다." }, { status: 400 });
    }

    let isUpdateResult = false;

    // DB Upsert/Insert 로직
    // 연락처(phone)가 있는 경우 기존 주문 조회 및 업데이트 시도
    if (orderData.intent === 'update' && orderData.phone) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('store_id', storeId)
        .eq('customer_name', orderData.customerName)
        .eq('phone', orderData.phone)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            product_name: orderData.productName,
            pickup_date: orderData.pickupDate ? new Date(orderData.pickupDate) : null,
            options: orderData.options,
            status: "수정됨"
          })
          .eq('id', existing.id);
        
        if (updateError) throw updateError;
        isUpdateResult = true;
      }
    }

    // 업데이트가 아니거나 매칭되는 기존 주문이 없는 경우 신규 등록
    if (!isUpdateResult) {
      const { error: insertError } = await supabase.from('orders').insert([{
        store_id: storeId,
        customer_name: orderData.customerName,
        phone: orderData.phone,
        product_name: orderData.productName,
        pickup_date: orderData.pickupDate ? new Date(orderData.pickupDate) : null,
        status: '입금대기',
        source: 'manual',
        options: orderData.options
      }]);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, isUpdate: isUpdateResult });
  } catch (err: any) {
    console.error("[Order Registration Error]:", err);
    return NextResponse.json({ error: err.message || "주문 등록 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
