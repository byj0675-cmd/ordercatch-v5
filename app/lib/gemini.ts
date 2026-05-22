import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
export async function parseOrderStreamWithGemini(
  text: string,
  enabledFields?: string[],
  storeFields?: string[]
): Promise<ReadableStream> {
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

  // 매장별 지정 항목 가이드 생성
  let storeFieldsGuide = "";
  if (storeFields && storeFields.length > 0) {
    storeFieldsGuide = `\n[매장 맞춤 항목 필독] 이 매장에서는 다음 항목들을 중요하게 관리합니다. 본문에서 반드시 이 항목들을 찾아내어 customFields에 포함시키세요: ${storeFields.join(", ")}`;
  }

  const prompt = `주문 정보 추출. 현재 KST: ${now}.
반드시 제공된 JSON Schema 형태로만 출력하세요. 설명 금지.${disabledGuide}${storeFieldsGuide}

[필드 추출 규칙]
- customerName: 고객 이름. 없으면 빈 문자열 "". 절대 "customerName" 같은 필드명 자체를 값으로 쓰지 말 것.
- phone: 전화번호. 없으면 "".
- productName: 주문서에 명시된 구체적인 상품명/서비스명을 그대로 추출. 예시: "흑임자설기 3호", "레터링 케이크 1호", "네일아트", "꽃다발". 절대 임의로 "케이크","상품" 등 일반명사로 바꾸지 말 것.
- pickupDate: 픽업/예약 일시의 ISO8601. 시간대 규칙: 오전/오후 명시 없고 1~9시이면 오후(PM)로 해석. "2시반"="14:30", "3시"="15:00". 날짜가 상대적(예: 이번주 토요일)이면 KST 기준으로 정확히 계산. 모르면 "".
- amount: 숫자 금액. 없으면 0.
- options.address: 배송/퀵 주소.
- options.memo: 기타 특이사항.
- customFields: 기본 필드(이름/연락처/상품명/일시/주소/금액/메모) 외의 모든 주문별 맞춤 정보를 빠짐없이 key-value 배열로 추출. 예: 사이즈, 설기종류, 막대초 갯수, 문구, 레터링, 맛, 색상, 디자인 옵션 등 주문서에 있는 항목은 전부 포함할 것.
- intent: 신규="new", 수정/변경 요청="update".`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
export async function parseOrderWithGemini(
  text: string,
  enabledFields?: string[],
  storeFields?: string[]
): Promise<ParsedOrder | null> {
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

  let storeFieldsGuide = "";
  if (storeFields && storeFields.length > 0) {
    storeFieldsGuide = `\n[매장 맞춤 항목 필독] 본문에서 다음 항목들을 찾아내어 customFields에 포함시키세요: ${storeFields.join(", ")}`;
  }

  const prompt = `주문 정보 추출. 현재 KST: ${now}. JSON으로만 출력.${disabledGuide}${storeFieldsGuide}
- customerName: 고객 이름. 없으면 "". 절대 필드명 자체를 값으로 쓰지 말 것.
- productName: 주문서에 명시된 구체적 상품명을 그대로 추출. 임의로 일반명사로 바꾸지 말 것.
- pickupDate: 오전/오후 명시 없고 1~9시이면 오후(PM)로 해석. "2시반"=14:30, "3시"=15:00.
- 주소 정보는 options.address에 추출하여 매핑하세요.
- 기본 정보 외 맞춤 주문 사양은 customFields 배열로 key, value로 전부 추출.
- 그 외 특이사항이나 메모는 options.memo에 넣으세요.`;
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


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
