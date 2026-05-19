import { NextResponse } from "next/server";
import { parseOrderStreamWithGemini } from "@/app/lib/gemini";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, storeId, enabledFields } = body;

    if (!text) {
      return NextResponse.json({ error: "주문 텍스트가 없습니다." }, { status: 400 });
    }

    if (!storeId) {
      return NextResponse.json({ error: "매장 식별 정보(storeId)가 없습니다." }, { status: 400 });
    }

    const stream = await parseOrderStreamWithGemini(text, enabledFields);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("[Backend Error Details]:", err);
    const errorMessage = err.message || "AI 분석 과정에서 알 수 없는 서버 오류가 발생했습니다.";
    return NextResponse.json({ 
        error: errorMessage,
        code: err.code || "INTERNAL_SERVER_ERROR"
    }, { status: 500 });
  }
}
