import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { orderData, storeId } = body;

    if (!orderData || !storeId) {
      return NextResponse.json({ error: "주문 데이터 또는 매장 정보가 누락되었습니다." }, { status: 400 });
    }

    let isUpdateResult = false;

    if (orderData.intent === 'update' || orderData.existingId) {
      // 수정 의도 — 기존 주문 찾기 (우선순위 순)
      let existingId: string | null = orderData.existingId || null;

      // 방법 1: 고객명 + 전화번호로 찾기 (가장 최근 주문)
      if (!existingId && orderData.customerName && orderData.phone) {
        const { data } = await supabase
          .from('orders')
          .select('id')
          .eq('store_id', storeId)
          .eq('customer_name', orderData.customerName)
          .eq('phone', orderData.phone)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        existingId = data?.id || null;
      }

      // 방법 2: 고객명 + 기존 픽업날짜로 찾기 (전화번호 없을 때)
      if (!existingId && orderData.customerName && orderData.originalPickupDate) {
        const { data } = await supabase
          .from('orders')
          .select('id')
          .eq('store_id', storeId)
          .eq('customer_name', orderData.customerName)
          .eq('pickup_date', new Date(orderData.originalPickupDate).toISOString())
          .maybeSingle();
        existingId = data?.id || null;
      }

      // 방법 3: 고객명만으로 찾기 (가장 최근 주문)
      if (!existingId && orderData.customerName) {
        const { data } = await supabase
          .from('orders')
          .select('id, product_name, pickup_date')
          .eq('store_id', storeId)
          .eq('customer_name', orderData.customerName)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        existingId = data?.id || null;
      }

      if (existingId) {
        // 변경된 필드만 업데이트 (null이면 기존 값 유지)
        const updatePayload: Record<string, any> = {};
        if (orderData.productName) updatePayload.product_name = orderData.productName;
        if (orderData.pickupDate) updatePayload.pickup_date = new Date(orderData.pickupDate);
        if (orderData.options && Object.keys(orderData.options).length > 0) updatePayload.options = orderData.options;

        const { error: updateError } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('id', existingId);

        if (updateError) throw updateError;
        isUpdateResult = true;
      }
      // 수정 의도지만 기존 주문 못 찾은 경우 → 신규 등록으로 fallback
    }

    if (!isUpdateResult) {
      const { error: insertError } = await supabase.from('orders').insert([{
        store_id: storeId,
        customer_name: orderData.customerName,
        phone: orderData.phone,
        product_name: orderData.productName,
        pickup_date: orderData.pickupDate ? new Date(orderData.pickupDate) : null,
        status: '신규주문',
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
