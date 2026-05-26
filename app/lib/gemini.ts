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

const groqApiKey = (process.env.GROQ_API_KEY || "").trim();
const groqModelName = (process.env.GROQ_MODEL_NAME || "llama-3.1-8b-instant").trim();

// ── Streaming Parser ──────────────────────────────────
export async function parseOrderStreamWithGemini(
  text: string,
  enabledFields?: string[],
  storeFields?: string[],
  storeProducts?: string
): Promise<ReadableStream> {
  if (!groqApiKey || groqApiKey.length < 10) {
    throw new Error("GROQ_API_KEY is missing or invalid.");
  }

  // 한국 시간(KST)으로 기준시 설정 (UTC+9)
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "");

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

  // 매장 취급 상품 힌트 가이드 생성
  let storeProductsGuide = "";
  if (storeProducts && storeProducts.trim()) {
    storeProductsGuide = `\n[매장 취급 상품 목록 필독] 이 매장에서 취급하는 대표 상품/메뉴 목록입니다. 주문서 텍스트에서 이 목록(혹은 줄임말, 매우 유사한 명칭)에 해당하는 단어가 발견되면 최우선적으로 productName 필드에 포함하여 추출해 주세요: ${storeProducts}`;
  }

  const prompt = `주문 정보 추출. 현재 한국 시간(KST): ${now}.
반드시 아래의 JSON 스펙에 맞춰 JSON 객체 하나만 출력하세요. 다른 잡담이나 설명은 절대 금지하고, 백틱(\`\`\`)도 포함하지 말고 오직 순수 JSON 데이터만 출력해야 합니다.
${disabledGuide}${storeFieldsGuide}${storeProductsGuide}

[JSON 스키마 규격]
{
  "customerName": "고객명 (없으면 빈 문자열 \\"\\". 절대 필드명 자체나 임의의 이름을 쓰지 마세요)",
  "phone": "전화번호 (없으면 \\"\\")",
  "productName": "주문서에 명시된 구체적인 상품명/서비스명. 만약 주문서에 여러 개의 상품(예: 꽃케이크, 조각설기, 수수팥경단 등)이 나열되어 있는 경우, 모든 상품명을 반드시 쉼표(,)나 플러스(+) 기호로 합쳐서 최종 상품명으로 작성하세요 (예: \\"꽃케이크, 설기9조각, 수수팥경단, 송편\\"). 절대 일부 상품만 임의로 선택하여 누락시키지 마십시오. 없으면 \\"미지정 상품\\")",
  "pickupDate": "픽업/예약 일시를 반드시 한국 로컬 시간대 기준으로 'YYYY-MM-DDTHH:mm:ss' 형식(예: \\"2026-05-24T14:00:00\\")으로 작성하세요. 절대 문자열 끝에 'Z'를 붙이거나 타임존을 UTC로 변환하지 마십시오. 시간대 규칙: 오전/오후 명시가 없고 1~9시이면 오후(PM)로 해석합니다 (예: \\"2시\\"=14:00, \\"3시\\"=15:00, \\"2시반\\"=14:30). 날짜가 상대적(예: 이번주 토요일)이면 현재 KST 기준으로 정확히 날짜를 계산하여 반영합니다. 모르면 \\"\\")",
  "amount": 숫자 금액 (단위: 원). 주문서에 명시적으로 금액(예: 80000원, 8만원, 입금액 등)이 기재된 경우에만 추출하고, 기재되지 않았거나 불확실한 경우(예: 나이인 '팔순', 사이즈 옵션 등인 '#80'과 같은 숫자)에는 절대로 금액으로 오해하여 추출하지 말고 0으로 반환하세요. 금액 단어('원', '입금액', '원금', '만원') 근처의 숫자만 추출해야 합니다. 없으면 0),
  "intent": "신규 주문은 \\"new\\", 수정/변경 요청은 \\"update\\"",
  "options": {
    "delivery": "배송 유형 (퀵, 택배, 픽업 등)",
    "address": "배송/퀵 주소",
    "memo": "기타 특이사항 및 메모",
    "allergyInfo": "알레르기 정보",
    "paymentMethod": "결제 방식"
  },
  "customFields": [
    { "key": "항목명", "value": "값" }
  ]
}

[필드 추출 규칙]
- customFields: 기본 필드(이름/연락처/상품명/일시/주소/금액/메모) 외의 모든 주문별 맞춤 정보를 빠짐없이 key-value 배열로 추출하세요. 예: 사이즈, 설기종류, 막대초 갯수, 문구, 레터링, 맛, 색상, 디자인 옵션 등 주문서에 기재된 추가 옵션 사양은 전부 key와 value로 분리하여 customFields에 담아주세요.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: groqModelName,
      messages: [
        { role: "system", content: "You are a helpful assistant that extracts structured order details into precise JSON format." },
        { role: "user", content: prompt + "\n\n[주문서 텍스트]:\n" + text }
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const cleaned = line.trim();
            if (!cleaned) continue;
            if (cleaned === "data: [DONE]") continue;
            if (cleaned.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(cleaned.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) {
                // 무시
              }
            }
          }
        }
        if (buffer) {
          const cleaned = buffer.trim();
          if (cleaned.startsWith("data: ") && cleaned !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(cleaned.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch (e) {}
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
  storeFields?: string[],
  storeProducts?: string
): Promise<ParsedOrder | null> {
  if (!groqApiKey || groqApiKey.length < 10) {
    throw new Error("GROQ_API_KEY is missing or invalid.");
  }

  // 한국 시간(KST)으로 기준시 설정 (UTC+9)
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "");
  
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

  let storeProductsGuide = "";
  if (storeProducts && storeProducts.trim()) {
    storeProductsGuide = `\n[매장 취급 상품 목록 필독] 이 매장에서 취급하는 대표 상품/메뉴 목록입니다. 주문서 텍스트에서 이 목록(혹은 줄임말, 매우 유사한 명칭)에 해당하는 단어가 발견되면 최우선적으로 productName 필드에 포함하여 추출해 주세요: ${storeProducts}`;
  }

  const prompt = `주문 정보 추출. 현재 한국 시간(KST): ${now}.
반드시 아래의 JSON 스펙에 맞춰 JSON 객체 하나만 출력하세요. 다른 잡담이나 설명은 절대 금지하고, 백틱(\`\`\`)도 포함하지 말고 오직 순수 JSON 데이터만 출력해야 합니다.
${disabledGuide}${storeFieldsGuide}${storeProductsGuide}

[JSON 스키마 규격]
{
  "customerName": "고객명 (없으면 빈 문자열 \\"\\". 절대 필드명 자체나 임의의 이름을 쓰지 마세요)",
  "phone": "전화번호 (없으면 \\"\\")",
  "productName": "주문서에 명시된 구체적인 상품명/서비스명. 만약 주문서에 여러 개의 상품(예: 꽃케이크, 조각설기, 수수팥경단 등)이 나열되어 있는 경우, 모든 상품명을 반드시 쉼표(,)나 플러스(+) 기호로 합쳐서 최종 상품명으로 작성하세요 (예: \\"꽃케이크, 설기9조각, 수수팥경단, 송편\\"). 절대 일부 상품만 임의로 선택하여 누락시키지 마십시오. 없으면 \\"미지정 상품\\")",
  "pickupDate": "픽업/예약 일시를 반드시 한국 로컬 시간대 기준으로 'YYYY-MM-DDTHH:mm:ss' 형식(예: \\"2026-05-24T14:00:00\\")으로 작성하세요. 절대 문자열 끝에 'Z'를 붙이거나 타임존을 UTC로 변환하지 마십시오. 시간대 규칙: 오전/오후 명시가 없고 1~9시이면 오후(PM)로 해석합니다 (예: \\"2시\\"=14:00, \\"3시\\"=15:00, \\"2시반\\"=14:30). 날짜가 상대적(예: 이번주 토요일)이면 현재 KST 기준으로 정확히 날짜를 계산하여 반영합니다. 모르면 \\"\\")",
  "amount": 숫자 금액 (단위: 원). 주문서에 명시적으로 금액(예: 80000원, 8만원, 입금액 등)이 기재된 경우에만 추출하고, 기재되지 않았거나 불확실한 경우(예: 나이인 '팔순', 사이즈 옵션 등인 '#80'과 같은 숫자)에는 절대로 금액으로 오해하여 추출하지 말고 0으로 반환하세요. 금액 단어('원', '입금액', '원금', '만원') 근처의 숫자만 추출해야 합니다. 없으면 0),
  "intent": "신규 주문은 \\"new\\", 수정/변경 요청은 \\"update\\"",
  "options": {
    "delivery": "배송 유형 (퀵, 택배, 픽업 등)",
    "address": "배송/퀵 주소",
    "memo": "기타 특이사항 및 메모",
    "allergyInfo": "알레르기 정보",
    "paymentMethod": "결제 방식"
  },
  "customFields": [
    { "key": "항목명", "value": "값" }
  ]
}

[필드 추출 규칙]
- customFields: 기본 필드(이름/연락처/상품명/일시/주소/금액/메모) 외의 모든 주문별 맞춤 정보를 빠짐없이 key-value 배열로 추출하세요.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: groqModelName,
      messages: [
        { role: "system", content: "You are a helpful assistant that extracts structured order details into precise JSON format." },
        { role: "user", content: prompt + "\n\n[주문서 텍스트]:\n" + text }
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(raw) as ParsedOrder;
}
