import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { content, userEmail, storeName } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "제보 내용이 비어있습니다." }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("[Feedback API] Telegram bot credentials are not configured in environment variables.");
      return NextResponse.json({ error: "텔레그램 알림 설정이 되어있지 않습니다." }, { status: 500 });
    }

    // 전송 메시지 조립
    const message = `🔔 [오더캐치 개선사항 제보]\n\n• 매장명: ${storeName || "미확인 매장"}\n• 제보자 이메일: ${userEmail || "비로그인 유저"}\n• 내용:\n${content.trim()}`;

    // 텔레그램 메시지 전송
    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    if (!telegramRes.ok) {
      const errText = await telegramRes.text();
      console.error("[Feedback API] Telegram API response error:", errText);
      throw new Error("텔레그램 전송에 실패했습니다.");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Feedback API Error]:", err);
    return NextResponse.json({ error: err.message || "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
