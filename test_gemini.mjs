import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBoBLeH-JvgJIvHpXnA93hYFgjK_3mNd0U";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash" });

const text = "연락처: 010-1234-5678\n픽업일시: 2026년 4월 10일 오후 3시\n상품명: 꿀설기 레터링 케이크 1호\n수량: 1개\n요청사항: 하트 초 2개 챙겨주시고, 레터링은 \"결혼기념일 축하해\"로 해주세요!";

async function test() {
  const systemPrompt = `당신은 네일샵, 가죽공방, 베이커리, 디저트, 식당, 헤어샵 등 모든 예약 및 주문 기반 소상공인 매장을 위한 범용 AI 비서입니다.
현재 시스템 날짜와 시간은 [2026-04-07T12:00:00Z] (한국 표준시 기준) 입니다.
이 날짜와 시간을 기준으로 고객이 말한 '내일 오후 3시', '4월 5일' 등의 시간을 정확한 ISO 날짜 형식으로 계산하세요.
시간 정보가 없을 경우 임의로 채우지 마세요.

또한, 텍스트가 신규 예약/주문 건인지, 아니면 기존 예약에 대한 날짜/시간/품목/옵션 변경(수정) 요청인지 파악하여 'intent' 필드에 'new' 또는 'update'로 명시하십시오.
다음 주문 메시지에서 주문 정보를 추출하십시오. 카카오톡 웹훅을 통해 전달된 "오더캐치 주문서" 전문일 수 있습니다. 본문 내에 있는 매장 고유 코드(oc-로 시작)나 안내 문구 등은 제외하고 실제 주문 데이터만 추출하세요.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n주문 메시지:\n" + text }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            customerName: { type: SchemaType.STRING, description: "고객 이름" },
            phone: { type: SchemaType.STRING, description: "전화번호 (모르면 빈 문자열)" },
            productName: { type: SchemaType.STRING, description: "주문한 상품명 또는 서비스 종류 요약" },
            pickupDate: { type: SchemaType.STRING, description: "픽업/방문 일시의 ISO 8601 문자열. 알 수 없으면 빈 문자열" },
            intent: { type: SchemaType.STRING, description: "주문 의도. 반드시 'new' 또는 'update' 중 하나로 반환" },
            options: {
              type: SchemaType.OBJECT,
              properties: {
                delivery: { type: SchemaType.STRING },
                address: { type: SchemaType.STRING },
                memo: { type: SchemaType.STRING },
                allergyInfo: { type: SchemaType.STRING },
                paymentMethod: { type: SchemaType.STRING },
              },
            },
          },
          required: ["customerName", "phone", "productName", "pickupDate", "intent", "options"],
        },
      },
    });

    console.log(result.response.text());
  } catch (error) {
    console.error("Gemini AI Parsing Error:", error);
  }
}
test();
