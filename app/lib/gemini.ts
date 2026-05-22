import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const runtime = 'edge';

const apiKey = (process.env.GEMINI_API_KEY || "").trim();
const genAI = new GoogleGenerativeAI(apiKey);

export interface CustomField {
  key: string;
  value: string;
}

export interface ParsedOrder {
  customerName: string;
  phone: string;
  productName: string;
  pickupDate: string;
  intent: "new" | "update";
  options: {
    delivery?: string;
    address?: string;
    memo?: string;
    allergyInfo?: string;
    paymentMethod?: string;
    [key: string]: string | undefined;
  };
  amount?: number;
  customFields?: CustomField[];
}

// Response Schema for Google Generative AI
const responseSchema: any = {
  type: SchemaType.OBJECT,
  properties: {
    customerName: { type: SchemaType.STRING },
    phone: { type: SchemaType.STRING },
    productName: { type: SchemaType.STRING },
    pickupDate: { type: SchemaType.STRING },
    intent: { type: SchemaType.STRING },
    amount: { type: SchemaType.NUMBER },
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
    customFields: {
      type: SchemaType.ARRAY,
      description: "주문서에서 추출한 기본 필드 이외의 매장별 맞춤 필드 목록 (예: 케이크 문구, 맛 선택, 꽃 종류, 디자인 옵션 등)",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          key: { type: SchemaType.STRING, description: "항목의 이름 (예: '레터링 문구', '꽃 종류', '디자인', '추가 요구사항')" },
          value: { type: SchemaType.STRING, description: "해당 항목의 값" },
        },
        required: ["key", "value"],
      },
    },
  },
  required: ["customerName", "phone", "productName", "pickupDate", "intent", "options", "customFields"],
};

// ── Streaming Parser ──────────────────────────────────
export async function parseOrderStreamWithGemini(text: string, enabledFields?: string[]): Promise<ReadableStream> {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error("GEMINI_API_KEY is missing or invalid.");
  }

  const now = new Date().toISOString();

  // 사용 안 하는 필드 가이드라인 생성
  let disabledGuide = "";
  if (enabledFields && enabledFields.length > 0) {
    const allPossible = ["customerName", "productName", "pickupDate", "phone", "address", "amount", "memo"];
    const disabled = allPossible.filter(f => !enabledFields.includes(f));
    if (disabled.length > 0) {
      disabledGuide = `\n[중요 알림] 다음 필드는 사용하지 않으므로 본문에서 아무리 찾을 수 있어도 절대 추출하지 말고 반드시 빈 문자열("") 혹은 0으로 반환하세요: ${disabled.join(", ")}`;
    }
  }

  const prompt = `주문 정보 추출. 현재 KST: ${now}.
반드시 제공된 JSON Schema 형태로만 출력하세요. 설명 금지.
이름:customerName, 연락처:phone, 상품:productName, 일시:pickupDate(ISO8601 or ""), 금액:amount(number).${disabledGuide}
- 상대시점(예: '내일 3시')은 KST 기준으로 정확한 ISO로 연산하세요.
- 고객명이 본문에 없거나 애매하면 "customerName" 같은 필드명이나 설명문을 넣지 말고 반드시 빈 문자열("")로 반환하세요.
- 퀵 주소, 배송 주소 등 주소 정보는 options.address에 추출하여 매핑하세요.
- 기본 정보(이름, 연락처, 상품명, 일시, 주소, 금액, 메모)를 제외한 모든 맞춤 주문 조건들(예: 레터링 문구, 맛 선택, 꽃 색상, 네일 디자인 옵션 등)은 customFields 배열로 분류하여 key와 value 형식으로 상세히 리스트업하세요.
- 그 외 특이사항이나 메모는 options.memo에 넣으세요.
intent는 신규: new, 수정: update.`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const resultStream = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt + "\n\n" + text }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    } as any,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of resultStream.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            controller.enqueue(encoder.encode(chunkText));
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    }
  });
}

// ── Legacy Non-stream fallback ─────────────────────────
export async function parseOrderWithGemini(text: string, enabledFields?: string[]): Promise<ParsedOrder | null> {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error("GEMINI_API_KEY is missing or invalid.");
  }

  const now = new Date().toISOString();
  
  let disabledGuide = "";
  if (enabledFields && enabledFields.length > 0) {
    const allPossible = ["customerName", "productName", "pickupDate", "phone", "address", "amount", "memo"];
    const disabled = allPossible.filter(f => !enabledFields.includes(f));
    if (disabled.length > 0) {
      disabledGuide = `\n다음 필드는 사용 안하므로 빈 문자열("") 또는 0으로 반환하세요: ${disabled.join(", ")}`;
    }
  }

  const prompt = `주문 정보 추출. 현재 KST: ${now}. JSON으로만 출력.${disabledGuide}
- 고객명이 본문에 없거나 애매하면 "customerName" 같은 필드명이나 설명문을 넣지 말고 반드시 빈 문자열("")로 반환하세요.
- 주소 정보는 options.address에 추출하여 매핑하세요.
- 기본 정보를 제외한 맞춤 주문 사양은 customFields 배열로 분류하여 key, value로 추출해 주십시오.
- 그 외 특이사항이나 메모는 options.memo에 넣으세요.`;
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt + "\n\n" + text }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    } as any,
  });

  const raw = result.response.text();
  return JSON.parse(raw) as ParsedOrder;
}
