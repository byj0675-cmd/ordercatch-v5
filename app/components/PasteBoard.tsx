"use client";

import { useState, useEffect, useRef } from "react";
import { Order, SOURCE_CONFIG } from "../lib/mockData";
import { showToast } from "./Toast";
import { useStoreProvider, UsageLimitError } from "../context/StoreContext";
import type { AddOrderPayload } from "../context/StoreContext";
import DuplicateCheckModal from "./DuplicateCheckModal";

interface PasteBoardProps {
  onParsed?: (order: Partial<Order>) => void;
  storeId: string;
}

interface CustomField {
  key: string;
  value: string;
}

interface EditedData {
  customerName: string;
  productName: string;
  pickupDate: string; // "YYYY-MM-DDTHH:mm"
  phone: string;
  amount: string;
  memo: string;
  address: string;
  customFields: CustomField[];
}

const EXAMPLE_TEXTS = [
  "이번 주 토요일 오후 3시, 백설기 1호 주문할게요. 문구는 아버지 사랑해요, 퀵 받을 주소는 서울시 송파구 가락동 010-1234-5678",
];

// Partial JSON 파서 (정규식 기반으로 스트림 중 실시간 값 추출)
function extractFieldsFromPartialJson(jsonStr: string) {
  const getMatch = (pattern: RegExp) => {
    const match = jsonStr.match(pattern);
    return match ? match[1] : "";
  };

  const customerName = getMatch(/"customerName"\s*:\s*"([^"]*)/);
  const phone = getMatch(/"phone"\s*:\s*"([^"]*)/);
  const productName = getMatch(/"productName"\s*:\s*"([^"]*)/);
  const pickupDate = getMatch(/"pickupDate"\s*:\s*"([^"]*)/);
  
  const amountMatch = jsonStr.match(/"amount"\s*:\s*(\d+)/);
  const amount = amountMatch ? amountMatch[1] : "";

  const memo = getMatch(/"memo"\s*:\s*"([^"]*)/);
  const address = getMatch(/"address"\s*:\s*"([^"]*)/);

  const customFields: CustomField[] = [];
  const regex = /\{\s*"key"\s*:\s*"([^"]*)"\s*,\s*"value"\s*:\s*"([^"]*)"\s*\}/g;
  let match;
  while ((match = regex.exec(jsonStr)) !== null) {
    if (match[1] && match[2]) {
      customFields.push({ key: match[1], value: match[2] });
    }
  }

  return { customerName, phone, productName, pickupDate, amount, memo, address, customFields };
}

function mergeEnabledCustomFields(
  extracted: CustomField[],
  config: { id: string; name: string; enabled: boolean }[]
): CustomField[] {
  const enabledNames = config.filter(f => f.enabled).map(f => f.name);
  const result: CustomField[] = [...extracted];
  
  enabledNames.forEach(name => {
    if (!result.some(r => r.key === name)) {
      result.push({ key: name, value: "" });
    }
  });
  
  return result.filter(r => enabledNames.includes(r.key));
}

export default function PasteBoard({ onParsed, storeId }: PasteBoardProps) {
  const { addOrder, profile, storeInfo } = useStoreProvider();
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<EditedData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // 활성화된 주문 필드 설정
  const [fieldsConfig, setFieldsConfig] = useState<Record<string, boolean>>({
    customerName: true,
    productName: true,
    pickupDate: true,
    phone: true,
    address: true,
    amount: true,
    memo: true,
  });

  interface CustomFieldItem {
    id: string;
    name: string;
    enabled: boolean;
  }
  const [customFieldsConfig, setCustomFieldsConfig] = useState<CustomFieldItem[]>([]);

  // 백그라운드 파싱 결과 및 상태 관리용 Ref
  const bgParsedDataRef = useRef<EditedData | null>(null);
  const bgParsingPromiseRef = useRef<Promise<any> | null>(null);
  const bgTextRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 필드 설정 로컬스토리지 로드
  const loadFieldsConfig = () => {
    if (storeId) {
      const saved = localStorage.getItem(`ordercatch_fields_config_${storeId}`);
      if (saved) {
        try {
          setFieldsConfig(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse local fields config", e);
        }
      } else {
        // 기본값 복원
        setFieldsConfig({
          customerName: true,
          productName: true,
          pickupDate: true,
          phone: true,
          address: true,
          amount: true,
          memo: true,
        });
      }

      const savedCustom = localStorage.getItem(`ordercatch_custom_fields_${storeId}`);
      if (savedCustom) {
        try {
          setCustomFieldsConfig(JSON.parse(savedCustom));
        } catch (e) {
          console.error("Failed to parse custom fields config", e);
        }
      } else {
        setCustomFieldsConfig([]);
      }
    }
  };

  useEffect(() => {
    loadFieldsConfig();

    const handleConfigChange = () => {
      loadFieldsConfig();
    };

    window.addEventListener("ordercatch_fields_changed", handleConfigChange);
    return () => {
      window.removeEventListener("ordercatch_fields_changed", handleConfigChange);
    };
  }, [storeId]);

  // 활성화된 필드 키 목록 추출
  const getEnabledFieldsArray = () => {
    const basic = Object.keys(fieldsConfig).filter(k => fieldsConfig[k]);
    const custom = customFieldsConfig.filter(f => f.enabled).map(f => f.name);
    return [...basic, ...custom];
  };

  // 백그라운드 파싱 트리거 함수 (Debounced)
  const triggerBgParse = (targetText: string) => {
    if (!targetText.trim() || targetText === bgTextRef.current) return;
    bgTextRef.current = targetText;
    bgParsedDataRef.current = null;

    const promise = (async () => {
      try {
        const res = await fetch("/api/orders/manual-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: targetText, 
            storeId,
            enabledFields: getEnabledFieldsArray()
          }),
        });
        if (!res.ok) return null;

        const reader = res.body?.getReader();
        if (!reader) return null;

        const decoder = new TextDecoder();
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
        }

        const data = JSON.parse(accumulated);
        const pickupDateStr = data.pickupDate
          ? new Date(data.pickupDate).toISOString().slice(0, 16)
          : "";

        const result: EditedData = {
          customerName: data.customerName === "customerName" ? "" : (data.customerName || ""),
          productName: data.productName || "",
          pickupDate: pickupDateStr,
          phone: data.phone || "",
          amount: data.amount ? String(data.amount) : "",
          memo: data.options?.memo || "",
          address: data.options?.address || "",
          customFields: mergeEnabledCustomFields(data.customFields || [], customFieldsConfig),
        };
        bgParsedDataRef.current = result;
        return result;
      } catch (err) {
        console.error("Background parse failed", err);
        return null;
      }
    })();

    bgParsingPromiseRef.current = promise;
  };

  // 텍스트 감지 후 자동 백그라운드 분석 시작
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (text.trim().length > 10) {
      debounceTimerRef.current = setTimeout(() => {
        triggerBgParse(text);
      }, 600);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [text]);

  const handleParse = async () => {
    if (!text.trim()) {
      showToast("주문 텍스트를 입력해 주세요.", "warning");
      return;
    }

    setIsParsing(true);
    setEditedData({
      customerName: "",
      productName: "",
      pickupDate: "",
      phone: "",
      amount: "",
      memo: "",
      address: "",
      customFields: mergeEnabledCustomFields([], customFieldsConfig),
    });

    try {
      if (bgTextRef.current === text && bgParsedDataRef.current) {
        setEditedData(bgParsedDataRef.current);
        setIsParsing(false);
        showToast("AI가 미리 정리해둔 내용을 가져왔어요!", "success");
        return;
      }

      if (bgTextRef.current === text && bgParsingPromiseRef.current) {
        const cachedResult = await bgParsingPromiseRef.current;
        if (cachedResult) {
          setEditedData(cachedResult);
          setIsParsing(false);
          showToast("AI가 정리해둔 내용을 불러왔어요!", "success");
          return;
        }
      }

      const res = await fetch("/api/orders/manual-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          storeId,
          enabledFields: getEnabledFieldsArray()
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "파싱 실패");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트림 연결 실패");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        const fields = extractFieldsFromPartialJson(accumulated);
        
        setEditedData({
          customerName: fields.customerName === "customerName" ? "" : fields.customerName,
          productName: fields.productName,
          pickupDate: fields.pickupDate ? new Date(fields.pickupDate).toISOString().slice(0, 16) : "",
          phone: fields.phone,
          amount: fields.amount,
          memo: fields.memo,
          address: fields.address,
          customFields: mergeEnabledCustomFields(fields.customFields, customFieldsConfig),
        });
      }

      try {
        const finalJson = JSON.parse(accumulated);
        const finalPickupStr = finalJson.pickupDate
          ? new Date(finalJson.pickupDate).toISOString().slice(0, 16)
          : "";
        setEditedData({
          customerName: finalJson.customerName === "customerName" ? "" : (finalJson.customerName || ""),
          productName: finalJson.productName || "",
          pickupDate: finalPickupStr,
          phone: finalJson.phone || "",
          amount: finalJson.amount ? String(finalJson.amount) : "",
          memo: finalJson.options?.memo || "",
          address: finalJson.options?.address || "",
          customFields: mergeEnabledCustomFields(finalJson.customFields || [], customFieldsConfig),
        });
      } catch {
        // 스트리밍 유지
      }

      showToast("AI 정리 완료! 내용을 확인하고 수정하세요.", "success");
    } catch (e: any) {
      console.error("[PasteBoard] Parse error:", e);
      showToast(e.message || "AI 분석 실패. 다시 시도해 주세요.", "error");
      setEditedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveClick = async () => {
    if (!editedData || isSaving) return;

    if (fieldsConfig.customerName && !editedData.customerName.trim()) {
      showToast("고객명을 입력해 주세요.", "warning");
      return;
    }
    if (fieldsConfig.productName && !editedData.productName.trim()) {
      showToast("상품명을 입력해 주세요.", "warning");
      return;
    }

    if (editedData.customerName.trim() && editedData.phone.trim().length >= 10) {
      try {
        const { db } = await import("@/app/lib/db");
        const existing = await db.orders
          .where("storeId")
          .equals(storeId)
          .filter(
            (o) =>
              !o.isDeleted &&
              o.customerName === editedData!.customerName.trim() &&
              o.phone === editedData!.phone.trim()
          )
          .toArray();

        if (existing.length > 0) {
          const mapped: Order[] = existing.map((o) => ({
            id: o.id, storeId: o.storeId, storeName: o.storeName, storeType: o.storeType as any,
            customerName: o.customerName, phone: o.phone, productName: o.productName,
            pickupDate: o.pickupDate, status: o.status as any, amount: o.amount,
            options: o.options as any, source: o.source, createdAt: o.createdAt,
          }));
          setExistingOrders(mapped);
          setShowDuplicateModal(true);
          return;
        }
      } catch (e) {
        console.error("[PasteBoard] Duplicate check error:", e);
      }
    }

    await confirmSave();
  };

  const confirmSave = async (existingId?: string) => {
    if (!editedData) return;
    setIsSaving(true);
    setShowDuplicateModal(false);

    try {
      const pickupIso = editedData.pickupDate
        ? new Date(editedData.pickupDate).toISOString()
        : new Date().toISOString();

      if (isNaN(new Date(pickupIso).getTime())) {
        throw new Error("픽업 날짜 형식이 올바르지 않습니다.");
      }

      const options: Record<string, any> = {};
      if (fieldsConfig.memo && editedData.memo.trim()) options.memo = editedData.memo.trim();
      if (fieldsConfig.address && editedData.address.trim()) options.address = editedData.address.trim();

      editedData.customFields.forEach((field) => {
        if (field.key.trim() && field.value.trim()) {
          options[field.key.trim()] = field.value.trim();
        }
      });

      const payload: AddOrderPayload = {
        storeId,
        storeName: storeInfo?.name || profile?.store_name || "",
        storeType: storeInfo?.category || profile?.category || "dessert",
        customerName: fieldsConfig.customerName ? editedData.customerName.trim() : "미지정",
        phone: fieldsConfig.phone ? editedData.phone.trim() : "",
        productName: fieldsConfig.productName ? editedData.productName.trim() : "미지정 상품",
        pickupDate: fieldsConfig.pickupDate ? pickupIso : new Date().toISOString(),
        amount: fieldsConfig.amount ? (Number(editedData.amount.replace(/[^0-9]/g, "")) || 0) : 0,
        status: "신규주문",
        source: "manual",
        options,
      };

      await addOrder(payload);

      showToast("주문이 등록되었습니다!", "success");
      setIsExpanded(false);
      setText("");
      setEditedData(null);
      if (onParsed) onParsed({ productName: editedData.productName, status: "신규주문" });
    } catch (e: any) {
      if (e instanceof UsageLimitError) {
        showToast(`무료 한도(${e.limit}건)를 초과했습니다. Pro로 업그레이드하세요.`, "error");
      } else {
        showToast(e.message || "저장 중 오류가 발생했습니다.", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomField = () => {
    if (!editedData) return;
    setEditedData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        customFields: [...prev.customFields, { key: "맞춤 항목", value: "" }],
      };
    });
  };

  const removeCustomField = (index: number) => {
    if (!editedData) return;
    setEditedData((prev) => {
      if (!prev) return null;
      const next = [...prev.customFields];
      next.splice(index, 1);
      return {
        ...prev,
        customFields: next,
      };
    });
  };

  const resetAll = () => {
    setIsExpanded(false);
    setText("");
    setEditedData(null);
    bgTextRef.current = "";
    bgParsedDataRef.current = null;
    bgParsingPromiseRef.current = null;
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          width: "100%", minHeight: 64,
          padding: "14px 20px",
          background: "linear-gradient(135deg, rgba(79,70,229,0.07), rgba(124,58,237,0.04))",
          border: "1.5px dashed rgba(79,70,229,0.28)",
          borderRadius: 16, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12,
          WebkitTapHighlightColor: "transparent",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(79,70,229,0.11)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(79,70,229,0.07), rgba(124,58,237,0.04))"; }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(79,70,229,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="13" height="18" rx="2"/>
            <path d="M5 6H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>
          </svg>
        </div>
        <div style={{ textAlign: "left", flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#4f46e5" }}>복붙 마법사로 주문 등록</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>주문서 메시지 붙여넣기 시 자동 정리</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="animate-slideUp" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, rgba(79,70,229,0.06), transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(79,70,229,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="13" height="18" rx="2"/>
              <path d="M5 6H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1e1b4b" }}>복붙 마법사</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>주문을 분석해서 자동으로 정리합니다</div>
          </div>
        </div>
        <button onClick={resetAll} style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, WebkitTapHighlightColor: "transparent" } as React.CSSProperties}>
          ✕
        </button>
      </div>

      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── Step 1: 텍스트 입력 ── */}
        {(!editedData || isParsing) && (
          <>
            {/* 예시 버튼 */}
            {!isParsing && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>예시 클릭해서 바로 사용</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {EXAMPLE_TEXTS.map((ex, i) => (
                    <button key={i} onClick={() => { setText(ex); }}
                      style={{ textAlign: "left", padding: "10px 14px", background: "#f8fafc", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 10, cursor: "pointer", fontSize: 12, color: "#475569", lineHeight: 1.5, WebkitTapHighlightColor: "transparent" } as React.CSSProperties}>
                      {ex.length > 65 ? ex.slice(0, 65) + "..." : ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 텍스트 입력 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>주문 텍스트 입력</div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="받은 주문 메시지를 그대로 복사해서 붙여넣으세요..."
                rows={4}
                disabled={isParsing}
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit", background: "#fafafa", color: "#1e293b" }}
              />
            </div>

            {/* 주문서 자동 정리 버튼 */}
            {!isParsing && (
              <button onClick={handleParse} disabled={isParsing || !text.trim()}
                style={{
                  width: "100%", height: 56,
                  background: isParsing || !text.trim() ? "#c7d2fe" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#fff", border: "none", borderRadius: 14,
                  fontSize: 16, fontWeight: 700,
                  cursor: isParsing || !text.trim() ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.15s",
                  WebkitTapHighlightColor: "transparent",
                } as React.CSSProperties}
              >
                주문서 자동 정리
              </button>
            )}
          </>
        )}

        {/* ── Step 2: 실시간 스트리밍 / 카드형 편집기 ── */}
        {editedData && (
          <div className="animate-fadeIn">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: isParsing ? "#4f46e5" : "#059669", display: "flex", alignItems: "center", gap: 6 }}>
                {isParsing ? (
                  <>
                    <div style={{ width: 14, height: 14, border: "2px solid rgba(79,70,229,0.3)", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    AI가 분석 중입니다...
                  </>
                ) : (
                  <>정리된 내용 <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>(수정 가능)</span></>
                )}
              </div>
              {!isParsing && (
                <button onClick={() => setEditedData(null)}
                  style={{ fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}>
                  ← 다시 입력
                </button>
              )}
            </div>

            {/* 편집 카드 */}
            <div style={{ background: "#f8fafc", borderRadius: 16, border: isParsing ? "1.5px solid rgba(79,70,229,0.2)" : "1.5px solid rgba(5,150,105,0.15)", overflow: "hidden", transition: "all 0.3s ease" }}>
              {(() => {
                const storeCategory = storeInfo?.category || profile?.category || "dessert";
                const isServiceStore = ["nail", "flower"].includes(storeCategory);
                const dateLabel = isServiceStore ? "예약일시" : "픽업일시";

                // 설정에 맞춰 노출할 필드 리스트 정의
                const allFields = [
                  { label: "고객명", key: "customerName", type: "text", inputMode: "text", placeholder: isParsing ? "AI 추출 중..." : "이름 입력" },
                  { label: "상품명", key: "productName", type: "text", inputMode: "text", placeholder: isParsing ? "AI 추출 중..." : "상품명 입력" },
                  { label: dateLabel, key: "pickupDate", type: "datetime-local", inputMode: "text", placeholder: "" },
                  { label: "연락처", key: "phone", type: "tel", inputMode: "tel", placeholder: isParsing ? "AI 추출 중..." : "010-0000-0000" },
                  { label: "배송주소", key: "address", type: "text", inputMode: "text", placeholder: isParsing ? "AI 추출 중..." : "배송 주소 (퀵/택배)" },
                  { label: "금액(원)", key: "amount", type: "text", inputMode: "numeric", placeholder: isParsing ? "AI 추출 중..." : "0" },
                  { label: "메모", key: "memo", type: "text", inputMode: "text", placeholder: isParsing ? "AI 추출 중..." : "특이사항" },
                ] as const;

                // 활성화된 필드만 필터링
                const visibleFields = allFields.filter(f => {
                  if (f.key === "pickupDate") return fieldsConfig.pickupDate;
                  return fieldsConfig[f.key];
                });

                return (
                  <>
                    {/* 1. 활성화된 고정 필드들 */}
                    {visibleFields.map((field, idx, arr) => (
                      <div key={field.key} style={{ display: "flex", alignItems: "center", borderBottom: (idx < arr.length - 1 || editedData.customFields.length > 0) ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                        <div style={{ width: 88, padding: "13px 14px", fontSize: 12, fontWeight: 700, color: "#64748b", flexShrink: 0, whiteSpace: "nowrap" }}>
                          {field.label}
                        </div>
                        <input
                          type={field.type}
                          inputMode={field.inputMode as any}
                          value={(editedData as any)[field.key]}
                          disabled={isParsing}
                          onChange={(e) => setEditedData(prev => prev ? { ...prev, [field.key]: e.target.value } : prev)}
                          placeholder={field.placeholder}
                          style={{ flex: 1, padding: "13px 14px 13px 4px", fontSize: 15, fontWeight: 600, color: isParsing && !(editedData as any)[field.key] ? "#cbd5e1" : "#1e293b", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", minWidth: 0 }}
                        />
                      </div>
                    ))}

                    {/* 2. 동적 맞춤 필드 목록 */}
                    {editedData.customFields.map((field, fIdx) => (
                      <div key={`custom-${fIdx}`} style={{ display: "flex", alignItems: "center", borderBottom: fIdx < editedData.customFields.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: "rgba(79,70,229,0.02)" }}>
                        <div style={{ width: 88, padding: "11px 14px", flexShrink: 0 }}>
                          <input
                            type="text"
                            value={field.key}
                            disabled={isParsing}
                            onChange={(e) => {
                              const next = [...editedData.customFields];
                              next[fIdx].key = e.target.value;
                              setEditedData((prev) => (prev ? { ...prev, customFields: next } : prev));
                            }}
                            style={{ width: "100%", fontSize: 12, fontWeight: 800, color: "#4f46e5", border: "none", outline: "none", background: "transparent", padding: 0 }}
                          />
                        </div>
                        <input
                          type="text"
                          value={field.value}
                          disabled={isParsing}
                          onChange={(e) => {
                            const next = [...editedData.customFields];
                            next[fIdx].value = e.target.value;
                            setEditedData((prev) => (prev ? { ...prev, customFields: next } : prev));
                          }}
                          placeholder="추출 정보 입력"
                          style={{ flex: 1, padding: "11px 14px 11px 4px", fontSize: 14, fontWeight: 600, color: "#1e293b", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", minWidth: 0 }}
                        />
                        {!isParsing && (
                          <button
                            onClick={() => removeCustomField(fIdx)}
                            style={{ padding: "0 14px", color: "#ef4444", border: "none", background: "transparent", fontSize: 13, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            {/* 맞춤 필드 직접 추가 */}
            {!isParsing && (
              <button
                onClick={addCustomField}
                style={{
                  width: "100%",
                  height: 38,
                  marginTop: 10,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "background 0.15s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                주문 맞춤 필드 직접 추가
              </button>
            )}

            {/* 이대로 주문 등록하기 */}
            <button
              onClick={handleSaveClick}
              disabled={isSaving || isParsing}
              style={{
                width: "100%", height: 62,
                marginTop: 16,
                background: isSaving || isParsing ? "#cbd5e1" : "linear-gradient(135deg, #059669, #10b981)",
                color: "#fff", border: "none", borderRadius: 16,
                fontSize: 17, fontWeight: 800,
                cursor: isSaving || isParsing ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: isSaving || isParsing ? "none" : "0 4px 20px rgba(5,150,105,0.35)",
                WebkitTapHighlightColor: "transparent",
                transition: "all 0.15s",
              } as React.CSSProperties}
            >
              {isSaving
                ? <><div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />등록 중...</>
                : <>이대로 주문 등록하기</>}
            </button>
          </div>
        )}
      </div>

      {showDuplicateModal && (
        <DuplicateCheckModal
          existingOrders={existingOrders}
          onNewOrder={() => confirmSave()}
          onEditOrder={(order) => confirmSave(order.id)}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
