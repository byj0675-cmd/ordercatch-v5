import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const { ownerName, phone, storeName, item, snsLink } = await req.json();

    if (!ownerName || !phone || !storeName) {
      return NextResponse.json(
        { error: "필수 정보(이름, 연락처, 매장명)가 누락되었습니다." },
        { status: 400 }
      );
    }

    const timestamp = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

    // 1. Supabase DB 저장 시도 (옵션 - 테이블이 없을 수 있으므로 try-catch로 예외 처리)
    try {
      const supabase = await createClient();
      // beta_applications 테이블이 생성되어 있을 경우에만 정상 동작함
      const { error: dbError } = await supabase
        .from("beta_applications")
        .insert({
          owner_name: ownerName,
          phone: phone,
          store_name: storeName,
          item: item || "",
          sns_link: snsLink || "",
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.warn("[Beta Apply API] Supabase DB insert failed (probably table doesn't exist yet):", dbError.message);
      }
    } catch (dbErr) {
      console.warn("[Beta Apply API] Database operation skipped or failed:", dbErr);
    }

    // 2. Google Sheets Webhook 전송 (BETA_SHEET_WEBHOOK_URL 또는 GOOGLE_SHEET_WEBHOOK_URL 사용)
    const sheetWebhookUrl = process.env.BETA_SHEET_WEBHOOK_URL || process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (sheetWebhookUrl) {
      try {
        const payload = {
          name: ownerName,
          phone: phone,
          storeName: storeName,
          item: item || "미기입",
          snsLink: snsLink || "미기입",
          timestamp: timestamp,
        };

        const sheetRes = await fetch(sheetWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!sheetRes.ok) {
          console.warn("[Beta Apply API] Google Sheets response not OK:", await sheetRes.text());
        }
      } catch (sheetErr) {
        console.error("[Beta Apply API] Google Sheets webhook error:", sheetErr);
      }
    }

    // 3. Telegram 알림 발송
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const message = `✨ <b>[오더캐치 1기 사전경험단 신청]</b>\n\n` +
                      `• 매장명: <b>${storeName}</b>\n` +
                      `• 대표자명: ${ownerName}\n` +
                      `• 연락처: <code>${phone}</code>\n` +
                      `• 주요품목: ${item || "미기입"}\n` +
                      `• SNS/카톡 링크: ${snsLink || "미기입"}\n\n` +
                      `신청 일시: ${timestamp}`;

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
        console.error("[Beta Apply API] Telegram notification error:", await telegramRes.text());
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Beta Apply API Error]:", err);
    return NextResponse.json(
      { error: err.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
