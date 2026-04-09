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

    // Diagnostics for Production
    const geminiKey = process.env.GEMINI_API_KEY || "";
    if (!geminiKey) {
      const errorMsg = "GEMINI_API_KEY environment variable is not defined or is empty.";
      console.error(`[Gemini AI Error]: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    if (geminiKey.trim().length < 10) {
      const errorMsg = `GEMINI_API_KEY seems invalid (too short): ${geminiKey.substring(0, 3)}...`;
      console.error(`[Gemini AI Error]: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    console.log(`[Diagnostic] GEMINI_API_KEY status: ${geminiKey ? "Present" : "Missing"}`);
    if (geminiKey) {
      console.log(`[Diagnostic] GEMINI_API_KEY starts with: ${geminiKey.substring(0, 6)}... ends with: ...${geminiKey.substring(geminiKey.length - 4)}`);
    }

    const parsedOrder = await parseOrderWithGemini(text);

    if (!parsedOrder) {
      return NextResponse.json({ error: "AI 분석에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ ...parsedOrder });
  } catch (err: any) {
    console.error("[Backend Error Details]:", err);
    // Return specific model connection error if thrown, otherwise fallback to generic
    const errorMessage = err.message || "AI 분석 과정에서 알 수 없는 서버 오류가 발생했습니다.";
    
    // Detailed error trace for debugging (helpful for Vercel logs)
    return NextResponse.json({ 
        error: errorMessage,
        details: process.env.NODE_ENV !== "production" ? err.stack : undefined,
        code: err.code || "INTERNAL_SERVER_ERROR"
    }, { status: 500 });
  }
}
