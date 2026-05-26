import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const { storeId, storeName, ownerName, phone } = await req.json();

    if (!storeId || !ownerName || !phone) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 로그인된 사용자 정보 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 1. Supabase payment_requests 테이블에 기록 저장 (기존 스키마 재사용)
    // depositor_name: 신청자 대표 이름 (ownerName)
    // cash_receipt_info: "결제선생 연락처: [휴대폰번호]" 형식으로 저장하여 호환성 유지
    const { data: requestData, error: dbError } = await supabase
      .from("payment_requests")
      .insert({
        store_id: storeId,
        applicant_id: user.id,
        depositor_name: ownerName,
        cash_receipt_info: `결제선생 연락처: ${phone}`,
        status: "pending",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("[Payment Request API] DB insert error:", dbError);
      return NextResponse.json(
        { error: "신청 정보 저장에 실패했습니다." },
        { status: 500 }
      );
    }

    // 2. Google Sheets Webhook 전송 (환경 변수가 있을 때만)
    const sheetWebhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (sheetWebhookUrl) {
      try {
        const payload = {
          recipient: ownerName,                            // A열: 수취인
          phone: phone,                                    // B열: 전화번호
          amount: 4950,                                    // C열: 청구금액
          reason: "오더캐치 PRO 1개월 이용권",                // D열: 청구사유
          message: `안녕하세요 사장님, 오더캐치 PRO 1개월 이용 요금 청구서입니다. 결제 완료 시 PRO 기능이 즉시 활성화됩니다.`, // E열: 안내메세지
          storeName: storeName,                            // F열: 매장명 (관리용)
          timestamp: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }), // G열: 신청시간
        };

        const sheetRes = await fetch(sheetWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!sheetRes.ok) {
          console.warn("[Payment Request API] Google Sheets response not OK:", await sheetRes.text());
        }
      } catch (sheetErr) {
        console.error("[Payment Request API] Google Sheets webhook error:", sheetErr);
        // 구글 시트 오류가 나더라도 주 기능(DB 저장, 텔레그램)은 성공했으므로 사용자 요청은 완료 처리합니다.
      }
    }

    // 3. Telegram 알림 발송
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      // 배포 환경 도메인 혹은 로컬 환경 호스트네임에 맞춰 관리자 페이지 URL 자동 설정
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const adminUrl = `${origin}/admin`;

      const message = `💳 <b>[결제선생 PRO 신청 알림]</b>\n\n` +
                      `• 매장명: ${storeName}\n` +
                      `• 대표자명: ${ownerName}\n` +
                      `• 결제선생 수신 연락처: <code>${phone}</code>\n` +
                      `• 청구금액: 4,950원 (PRO 1개월)\n\n` +
                      `결제선생 청구 후 결제가 확인되면 아래 링크에서 승인 버튼을 눌러주세요.\n\n` +
                      `👉 <a href="${adminUrl}">오더캐치 관리자 승인하기</a>`;

      const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      });

      if (!telegramRes.ok) {
        console.error("[Payment Request API] Telegram webhook error:", await telegramRes.text());
      }
    }

    return NextResponse.json({ success: true, requestId: requestData.id });
  } catch (err: any) {
    console.error("[Payment Request API Error]:", err);
    return NextResponse.json(
      { error: err.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
