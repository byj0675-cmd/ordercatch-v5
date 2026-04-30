"use server";

import { createClient } from "@/utils/supabase/server";
import { sendTelegramMessage } from "@/app/lib/telegram";
import { revalidatePath } from "next/cache";

export async function requestPayment(storeId: string, depositorName: string, cashReceiptInfo?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Create payment request
  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      store_id: storeId,
      applicant_id: user.id,
      depositor_name: depositorName,
      cash_receipt_info: cashReceiptInfo || null,
      status: "pending",
    })
    .select("*, stores(name)")
    .single();

  if (error) {
    console.error("Failed to insert payment request:", error);
    throw new Error("Failed to request payment");
  }

  // 2. Send Telegram notification
  const storeName = data?.stores?.name || "알 수 없는 매장";
  const receiptText = cashReceiptInfo ? `\n현금영수증 정보: <b>${cashReceiptInfo}</b>` : "\n현금영수증 정보: <b>신청안함</b>";
  const message = `🔔 <b>입금 확인 요청!</b>\n매장명: ${storeName}\n입금자명: <b>${depositorName}</b>${receiptText}\n\n<a href="https://ordercatch.example.com/admin">관리자 페이지 바로가기</a>`;
  
  await sendTelegramMessage(message);

  return { success: true, data };
}

// Admin only actions
export async function approvePayment(requestId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check super admin status
  const isLocalDev = process.env.NODE_ENV === "development";
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin && !isLocalDev) {
    throw new Error("Forbidden: Super Admin only");
  }

  // 1. Get request details
  const { data: request, error: reqError } = await supabase
    .from("payment_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqError || !request) {
    throw new Error("Request not found");
  }

  // 2. Update store subscription
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30); // 30 days from now

  const { error: storeError } = await supabase
    .from("stores")
    .update({
      subscription_status: "pro",
      subscription_start_date: now.toISOString(),
      subscription_end_date: endDate.toISOString(),
    })
    .eq("id", request.store_id);

  if (storeError) {
    console.error("Failed to update store subscription:", storeError);
    throw new Error("Failed to update subscription");
  }

  // 3. Update request status
  const { error: updateError } = await supabase
    .from("payment_requests")
    .update({
      status: "approved",
      updated_at: now.toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("Failed to update request status:", updateError);
    // Ideally we should rollback the store update here, but for simplicity we throw
    throw new Error("Failed to approve payment");
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function rejectPayment(requestId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check super admin status
  const isLocalDev = process.env.NODE_ENV === "development";
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin && !isLocalDev) {
    throw new Error("Forbidden: Super Admin only");
  }

  // Update request status to rejected
  const { error: updateError } = await supabase
    .from("payment_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("Failed to update request status:", updateError);
    throw new Error("Failed to reject payment");
  }

  revalidatePath("/admin");
  return { success: true };
}
