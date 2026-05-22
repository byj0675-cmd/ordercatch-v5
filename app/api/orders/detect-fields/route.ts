import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "edge";

const apiKey = (process.env.GEMINI_API_KEY || "").trim();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sampleText } = body;

    if (!sampleText || sampleText.trim().length < 5) {
      return NextResponse.json({ error: "샘플 주문서 텍스트가 너무 짧습니다." }, { status: 400 });
    }

    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `아래는 소상공인 매장에서 고객으로부터 받는 주문서/예약서 샘플입니다.
이 주문서에서 반복적으로 수집해야 할 '항목(필드)명'만 추출하세요.

규칙:
- 고객명, 연락처, 픽업날짜/시간, 상품명, 금액, 주소, 메모는 기본 항목이므로 제외하세요.
- 이 매장 고유의 맞춤 항목만 추출합니다. (예: 사이즈, 설기종류, 문구, 디자인, 막대초, 꽃 색상, 네일 종류 등)
- 항목명은 주문서에 실제로 사용된 표현 그대로 사용하세요.
- JSON 배열 형태로만 반환하세요. 설명이나 다른 텍스트 없이 배열만.
- 예시: ["사이즈", "설기종류", "막대초 갯수", "문구"]

주문서 샘플:
${sampleText}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      } as any,
    });

    const raw = result.response.text().trim();

    let fields: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        fields = parsed.filter((f) => typeof f === "string" && f.trim().length > 0);
      }
    } catch {
      // JSON 파싱 실패 시 빈 배열 반환
      fields = [];
    }

    return NextResponse.json({ fields });
  } catch (err: any) {
    console.error("[detect-fields] Error:", err);
    return NextResponse.json(
      { error: err.message || "필드 감지 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
