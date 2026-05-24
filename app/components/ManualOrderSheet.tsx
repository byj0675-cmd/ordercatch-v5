"use client";

import { useState, useRef, useEffect } from "react";
import { OrderStatus, STATUS_CONFIG } from "../lib/mockData";
import { showToast } from "./Toast";
import { useStoreProvider, UsageLimitError } from "../context/StoreContext";
import type { AddOrderPayload } from "../context/StoreContext";
import DuplicateCheckModal from "./DuplicateCheckModal";
import { Order } from "../lib/mockData";

interface ManualOrderSheetProps {
  storeId: string;
  onClose: () => void;
  onSaved: () => void;
  onUsageLimitExceeded: (used: number, limit: number) => void;
}

type SheetMode = "ai" | "manual" | "personal";

// ── Monochrome SVG icons ──────────────────────────────────────────────────────
function IconPaste() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="13" height="18" rx="2" />
      <path d="M5 6H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

const TAB_CONFIG: { mode: SheetMode; label: string; sublabel?: string; Icon: React.FC }[] = [
  { mode: "ai",       label: "카톡/문자",  sublabel: "붙여넣기",  Icon: IconPaste },
  { mode: "manual",   label: "수기 등록",                         Icon: IconEdit },
  { mode: "personal", label: "일정",                              Icon: IconCalendar },
];

export default function ManualOrderSheet({
  storeId,
  onClose,
  onSaved,
  onUsageLimitExceeded,
}: ManualOrderSheetProps) {
  const { addOrder, profile, storeInfo } = useStoreProvider();

  const [mode, setMode] = useState<SheetMode>("ai");
  const [isParsing, setIsParsing] = useState(false);
  const [parsingText, setParsingText] = useState("");

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [productName, setProductName] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("11:00");
  const [endTime, setEndTime] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<OrderStatus>("신규주문");

  // 중복 체크 상태
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<AddOrderPayload | null>(null);

  interface CustomFieldVal {
    name: string;
    value: string;
  }
  const [customFields, setCustomFields] = useState<CustomFieldVal[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로드 설정 커스텀 필드
  const loadCustomFieldsConfig = () => {
    if (storeId) {
      const savedCustom = localStorage.getItem(`ordercatch_custom_fields_${storeId}`);
      if (savedCustom) {
        try {
          const config = JSON.parse(savedCustom) as { id: string; name: string; enabled: boolean }[];
          const initialFields = config.filter(f => f.enabled).map(f => ({ name: f.name, value: "" }));
          setCustomFields(initialFields);
        } catch (e) {
          console.error("Failed to parse custom fields in ManualOrderSheet", e);
        }
      } else {
        setCustomFields([]);
      }
    }
  };

  useEffect(() => {
    loadCustomFieldsConfig();

    const handleConfigChange = () => {
      loadCustomFieldsConfig();
    };

    window.addEventListener("ordercatch_fields_changed", handleConfigChange);
    return () => {
      window.removeEventListener("ordercatch_fields_changed", handleConfigChange);
    };
  }, [storeId]);

  const resetForm = () => {
    setCustomerName("");
    setPhone("");
    setProductName("");
    setAmount("");
    setMemo("");
    setPickupDate("");
    setPickupTime("11:00");
    setEndTime("");
    setImagePreview(null);
    setImageFile(null);
    setCustomFields(prev => prev.map(f => ({ ...f, value: "" })));
  };

  const handleModeChange = (m: SheetMode) => {
    setMode(m);
    resetForm();
  };

  const handleParse = async () => {
    if (!parsingText.trim()) return showToast("주문 텍스트를 입력해 주세요.", "warning");
    setIsParsing(true);
    try {
      const basicFields = ["customerName", "productName", "pickupDate", "phone", "amount", "memo"];
      const customFieldsNames = customFields.map(f => f.name);
      const enabledFields = [...basicFields, ...customFieldsNames];

      const res = await fetch("/api/orders/manual-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: parsingText, 
          storeId,
          enabledFields,
          storeFields: customFieldsNames
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCustomerName(data.customerName || "");
      setPhone(data.phone || "");
      setProductName(data.productName || "");
      setAmount(data.amount ? String(data.amount) : "");
      setMemo(data.options?.memo || "");

      if (data.pickupDate) {
        const d = new Date(data.pickupDate);
        setPickupDate(d.toISOString().split("T")[0]);
        setPickupTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      }

      // AI가 추출한 커스텀 필드 데이터를 로컬 필드에 동기화
      const parsedCustom = data.customFields || [];
      setCustomFields(prev => prev.map(f => {
        const match = parsedCustom.find((pc: any) => pc.key === f.name);
        return { ...f, value: match ? match.value : "" };
      }));

      showToast("주문 내용을 정리했어요.", "success");
      setMode("manual");
    } catch (err: any) {
      showToast(err.message || "처리 중 오류가 발생했습니다.", "error");
    } finally {
      setIsParsing(false);
    }
  };

  const buildPayload = (): AddOrderPayload | null => {
    if ((mode === "manual" || mode === "ai") && (!customerName || !productName)) {
      showToast("필수 정보를 입력해주세요.", "warning");
      return null;
    }
    if (mode === "personal" && !productName) {
      showToast("일정 제목을 입력해주세요.", "warning");
      return null;
    }

    const pickupIso = pickupDate
      ? new Date(`${pickupDate}T${pickupTime || "09:00"}:00`).toISOString()
      : new Date().toISOString();

    const options: Record<string, any> = { memo: memo.trim() };
    if (mode === "personal") {
      options.isPersonal = true;
      if (endTime) options.endTime = new Date(`${pickupDate}T${endTime}:00`).toISOString();
    } else {
      customFields.forEach((field) => {
        if (field.name.trim() && field.value.trim()) {
          options[field.name.trim()] = field.value.trim();
        }
      });
    }

    return {
      storeId,
      storeName: storeInfo?.name || profile?.store_name || "",
      storeType: storeInfo?.category || profile?.category || "dessert",
      customerName: mode === "personal" ? "개인일정" : customerName.trim(),
      phone: mode === "personal" ? "" : phone.trim(),
      productName: productName.trim(),
      pickupDate: pickupIso,
      amount: mode === "personal" ? 0 : Number(amount.replace(/[^0-9]/g, "")) || 0,
      status: mode === "personal" ? "신규주문" : status,
      source: "manual",
      options,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;

    // 중복 체크 (C안: 같은 이름 + 같은 번호 + 같은 픽업 날짜)
    if (mode !== "personal" && customerName.trim() && phone.trim().length >= 10) {
      try {
        const { db } = await import("@/app/lib/db");
        const newPickupDay = payload.pickupDate.slice(0, 10);
        const existing = await db.orders
          .where("storeId")
          .equals(storeId)
          .filter(
            (o) =>
              !o.isDeleted &&
              o.customerName === customerName.trim() &&
              o.phone === phone.trim() &&
              o.pickupDate.slice(0, 10) === newPickupDay
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
          setPendingPayload(payload);
          setShowDuplicateModal(true);
          return;
        }
      } catch (e) {
        console.error("[ManualOrderSheet] Duplicate check error:", e);
      }
    }

    await doSave(payload);
  };

  const doSave = async (payload: AddOrderPayload) => {
    setShowDuplicateModal(false);
    try {
      await addOrder(payload);

      showToast(mode === "personal" ? "일정이 등록되었습니다." : "주문이 등록되었습니다.", "success");
      onSaved();
      onClose();
    } catch (err: any) {
      if (err instanceof UsageLimitError) {
        onClose();
        onUsageLimitExceeded(err.used, err.limit);
      } else {
        showToast("저장에 실패했습니다.", "error");
      }
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: "rgba(15, 23, 42, 0.48)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full bg-white shadow-2xl animate-slideUp flex flex-col"
        style={{ borderRadius: "20px 20px 0 0", maxHeight: "92dvh", maxWidth: 680 }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "#e2e8f0" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "16px 24px 0" }} className="flex items-center justify-between">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
            {mode === "ai" ? "주문 등록" : mode === "personal" ? "일정 등록" : "주문 등록"}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#f1f5f9", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#64748b", WebkitTapHighlightColor: "transparent",
            }}
          >
            <IconClose />
          </button>
        </div>

        {/* Tab Bar */}
        <div style={{ padding: "16px 24px 0" }}>
          <div style={{ display: "flex", gap: 6, background: "#f1f5f9", borderRadius: 14, padding: 5 }}>
            {TAB_CONFIG.map(({ mode: m, label, sublabel, Icon }) => {
              const isActive = mode === m;
              const isPrimary = m === "ai"; // 가장 많이 쓰이는 탭
              return (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  style={{
                    flex: isPrimary ? 1.4 : 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    WebkitTapHighlightColor: "transparent",
                    background: isActive
                      ? (isPrimary && isActive ? "#4f46e5" : "#fff")
                      : "transparent",
                    color: isActive
                      ? (isPrimary ? "#fff" : "#0f172a")
                      : "#94a3b8",
                    boxShadow: isActive ? "0 1px 6px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  <Icon />
                  <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, marginTop: 2 }}>
                    {label}
                  </span>
                  {sublabel && (
                    <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.1, opacity: isActive ? 0.85 : 0.6 }}>
                      {sublabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto" }} className="no-scrollbar">
          {mode === "ai" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                받은 주문 메시지를 그대로 복사해서 붙여넣으세요.
              </p>
              <textarea
                value={parsingText}
                onChange={(e) => setParsingText(e.target.value)}
                placeholder={"예) 이번 주 토요일 오후 3시, 백설기 1호 주문할게요.\n문구는 아버지 사랑해요, 퀵 받을 주소는\n서울시 송파구 가락동 010-1234-5678"}
                style={{
                  width: "100%",
                  height: 148,
                  padding: "16px",
                  borderRadius: 14,
                  border: "1.5px solid #e2e8f0",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#0f172a",
                  background: "#fafafa",
                  outline: "none",
                  resize: "none",
                  lineHeight: 1.7,
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#a5b4fc")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
              <button
                onClick={handleParse}
                disabled={isParsing || !parsingText.trim()}
                style={{
                  width: "100%",
                  height: 52,
                  background: isParsing || !parsingText.trim()
                    ? "#c7d2fe"
                    : "#4f46e5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: isParsing || !parsingText.trim() ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  letterSpacing: "-0.01em",
                  WebkitTapHighlightColor: "transparent",
                  transition: "background 0.15s",
                }}
              >
                {isParsing ? (
                  <>
                    <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    주문 내용 정리 중...
                  </>
                ) : (
                  <>
                    <IconArrowRight />
                    주문서 자동 정리
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fadeIn">
              {mode === "manual" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="고객명">
                    <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="홍길동" className="field-input" />
                  </Field>
                  <Field label="연락처">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className="field-input" />
                  </Field>
                </div>
              )}
              <Field label={mode === "personal" ? "일정 제목" : "상품명"}>
                <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={mode === "personal" ? "예: 재료 수급" : "예: 레터링 케이크 2호"} className="field-input" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="날짜">
                  <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="field-input" />
                </Field>
                <Field label="시간">
                  <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="field-input" />
                </Field>
              </div>
              {mode === "manual" && (
                <Field label="금액 (원)">
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="field-input" />
                </Field>
              )}
              <Field label="메모 / 요청사항">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="특이사항을 기록하세요"
                  className="field-input"
                  style={{ height: 88, resize: "none" }}
                />
              </Field>
              {mode === "manual" && customFields.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>맞춤 주문 항목</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {customFields.map((field, idx) => (
                      <Field key={field.name} label={field.name}>
                        <input
                          value={field.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomFields(prev => prev.map((f, i) => i === idx ? { ...f, value: val } : f));
                          }}
                          placeholder={`${field.name} 입력`}
                          className="field-input"
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              )}
              {mode === "manual" && (
                <Field label="주문 상태">
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {(["신규주문", "완료", "취소"] as OrderStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1.5px solid",
                          borderColor: status === s ? "#4f46e5" : "#e2e8f0",
                          background: status === s ? "#eef2ff" : "#fff",
                          color: status === s ? "#4f46e5" : "#94a3b8",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          WebkitTapHighlightColor: "transparent",
                          transition: "all 0.12s",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          )}
        </div>

        {/* Save CTA */}
        {mode !== "ai" && (
          <div style={{ padding: "12px 24px 28px", borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={handleSave}
              style={{
                width: "100%",
                height: 52,
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "-0.01em",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <IconCheck />
              {mode === "personal" ? "일정 등록하기" : "주문 등록하기"}
            </button>
          </div>
        )}
      </div>

      {showDuplicateModal && (
        <DuplicateCheckModal
          existingOrders={existingOrders}
          onNewOrder={() => { if (pendingPayload) doSave(pendingPayload); }}
          onEditOrder={() => { setShowDuplicateModal(false); }}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .field-input {
          width: 100%;
          margin-top: 6px;
          padding: 12px 14px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
          box-sizing: border-box;
        }
        .field-input:focus {
          border-color: #a5b4fc;
        }
        .field-input::placeholder {
          color: #cbd5e1;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
