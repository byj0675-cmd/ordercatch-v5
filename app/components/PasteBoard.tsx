"use client";

import { useState } from "react";
import { Order, SOURCE_CONFIG } from "../lib/mockData";
import { showToast } from "./Toast";
import { useStoreProvider, UsageLimitError } from "../context/StoreContext";
import type { AddOrderPayload } from "../context/StoreContext";
import DuplicateCheckModal from "./DuplicateCheckModal";

interface PasteBoardProps {
  onParsed?: (order: Partial<Order>) => void;
  storeId: string;
}

interface EditedData {
  customerName: string;
  productName: string;
  pickupDate: string; // "YYYY-MM-DDTHH:mm"
  phone: string;
  amount: string;
  memo: string;
}

const EXAMPLE_TEXTS = [
  "안녕하세요~ 내일 오후 3시에 뚱카롱 20개 픽업 예약하고 싶어요. 딸기/초코/바닐라 혼합으로요. 견과류 알러지 있어요. 카드 결제할게요!",
  "포레스트 베이커리 예약해요. 이번 주 토요일 오전 11시 레터링 케이크 2호 주문이요. 문구는 '생일 축하해 지수야!' 로 부탁드려요.",
  "네일 예약 문의요. 4월 5일 오전 10시에 젤 손발 세트 가능할까요? 디자인은 누드핑크 + 실버 체인 아트. 연락처 010-1234-5678.",
];

export default function PasteBoard({ onParsed, storeId }: PasteBoardProps) {
  const { addOrder, profile, storeInfo } = useStoreProvider();
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<EditedData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) {
      showToast("주문 텍스트를 입력해 주세요.", "warning", "⚠️");
      return;
    }
    setIsParsing(true);
    setEditedData(null);
    try {
      const res = await fetch("/api/orders/manual-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, storeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "파싱 실패");

      const pickupDateStr = data.pickupDate
        ? new Date(data.pickupDate).toISOString().slice(0, 16)
        : "";

      setEditedData({
        customerName: data.customerName || "",
        productName: data.productName || "",
        pickupDate: pickupDateStr,
        phone: data.phone || "",
        amount: data.amount ? String(data.amount) : "",
        memo: data.options?.memo || "",
      });

      showToast("AI 정리 완료! 내용을 확인하고 수정하세요.", "success", "✅");
    } catch (e: any) {
      console.error("[PasteBoard] Parse error:", e);
      showToast(e.message || "AI 분석 실패. 다시 시도해 주세요.", "error");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveClick = async () => {
    if (!editedData || isSaving) return;

    if (!editedData.customerName.trim()) {
      showToast("고객명을 입력해 주세요.", "warning");
      return;
    }
    if (!editedData.productName.trim()) {
      showToast("상품명을 입력해 주세요.", "warning");
      return;
    }

    // Duplicate check (Dexie 로컬 DB 조회)
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
      if (editedData.memo.trim()) options.memo = editedData.memo.trim();

      const payload: AddOrderPayload = {
        storeId,
        storeName: storeInfo?.name || profile?.store_name || "",
        storeType: storeInfo?.category || profile?.category || "dessert",
        customerName: editedData.customerName.trim(),
        phone: editedData.phone.trim(),
        productName: editedData.productName.trim(),
        pickupDate: pickupIso,
        amount: Number(editedData.amount.replace(/[^0-9]/g, "")) || 0,
        status: "신규주문",
        source: "manual",
        options,
      };

      // ── Local-First 저장 (즉각, 스피너 없음) ──
      await addOrder(payload);

      showToast("주문이 등록되었습니다! 🎉", "success");
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

  const resetAll = () => {
    setIsExpanded(false);
    setText("");
    setEditedData(null);
  };

  /* ── 접힌 상태 ── */
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
        <span style={{ fontSize: 24 }}>✨</span>
        <div style={{ textAlign: "left", flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#4f46e5" }}>복붙 마법사로 주문 등록</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>카카오·인스타 메시지 → AI 자동 정리</div>
        </div>
        <span style={{ fontSize: 22, color: "#4f46e5", fontWeight: 300 }}>+</span>
      </button>
    );
  }

  /* ── 펼친 상태 ── */
  return (
    <div className="animate-slideUp" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, rgba(79,70,229,0.06), transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>✨</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1e1b4b" }}>복붙 마법사</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>AI가 주문을 자동으로 정리해요</div>
          </div>
        </div>
        <button onClick={resetAll} style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, WebkitTapHighlightColor: "transparent" } as React.CSSProperties}>
          ✕
        </button>
      </div>

      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── Step 1: 텍스트 입력 (파싱 전) ── */}
        {!editedData && (
          <>
            {/* 예시 버튼 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>예시 클릭해서 바로 사용</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {EXAMPLE_TEXTS.map((ex, i) => (
                  <button key={i} onClick={() => { setText(ex); }}
                    style={{ textAlign: "left", padding: "10px 14px", background: "#f8fafc", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 10, cursor: "pointer", fontSize: 12, color: "#475569", lineHeight: 1.5, WebkitTapHighlightColor: "transparent" } as React.CSSProperties}>
                    <span style={{ marginRight: 6 }}>{SOURCE_CONFIG[i === 0 ? "kakao" : i === 1 ? "instagram" : "manual"].emoji}</span>
                    {ex.length > 65 ? ex.slice(0, 65) + "..." : ex}
                  </button>
                ))}
              </div>
            </div>

            {/* 텍스트 입력 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>주문 텍스트 입력</div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="카카오·인스타 주문 메시지를 그대로 붙여넣어 주세요..."
                rows={4}
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit", background: "#fafafa", color: "#1e293b" }}
              />
            </div>

            {/* 주문서 자동 정리 버튼 */}
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
              {isParsing
                ? <><div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />AI 분석 중...</>
                : <>✨ 주문서 자동 정리</>}
            </button>
          </>
        )}

        {/* ── Step 2: 카드형 편집기 (파싱 후) ── */}
        {editedData && (
          <div className="animate-fadeIn">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: 6 }}>
                ✅ 정리된 내용 <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>(수정 가능)</span>
              </div>
              <button onClick={() => setEditedData(null)}
                style={{ fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}>
                ← 다시 입력
              </button>
            </div>

            {/* 편집 카드 */}
            <div style={{ background: "#f8fafc", borderRadius: 16, border: "1.5px solid rgba(5,150,105,0.15)", overflow: "hidden" }}>
              {([
                { label: "👤 고객명", key: "customerName", type: "text", inputMode: "text", placeholder: "이름 입력" },
                { label: "📦 상품명", key: "productName", type: "text", inputMode: "text", placeholder: "상품명 입력" },
                { label: "📅 픽업일시", key: "pickupDate", type: "datetime-local", inputMode: "text", placeholder: "" },
                { label: "📞 연락처", key: "phone", type: "tel", inputMode: "tel", placeholder: "010-0000-0000" },
                { label: "💰 금액(원)", key: "amount", type: "text", inputMode: "numeric", placeholder: "0" },
                { label: "📝 메모", key: "memo", type: "text", inputMode: "text", placeholder: "특이사항" },
              ] as const).map((field, idx, arr) => (
                <div key={field.key} style={{ display: "flex", alignItems: "center", borderBottom: idx < arr.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <div style={{ width: 88, padding: "13px 14px", fontSize: 12, fontWeight: 600, color: "#64748b", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {field.label}
                  </div>
                  <input
                    type={field.type}
                    inputMode={field.inputMode as any}
                    value={(editedData as any)[field.key]}
                    onChange={(e) => setEditedData(prev => prev ? { ...prev, [field.key]: e.target.value } : prev)}
                    placeholder={field.placeholder}
                    style={{ flex: 1, padding: "13px 14px 13px 4px", fontSize: 15, fontWeight: 600, color: "#1e293b", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", minWidth: 0 }}
                  />
                </div>
              ))}
            </div>

            {/* 이대로 주문 등록하기 */}
            <button
              onClick={handleSaveClick}
              disabled={isSaving}
              style={{
                width: "100%", height: 62,
                marginTop: 16,
                background: isSaving ? "#94a3b8" : "linear-gradient(135deg, #059669, #10b981)",
                color: "#fff", border: "none", borderRadius: 16,
                fontSize: 17, fontWeight: 800,
                cursor: isSaving ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: isSaving ? "none" : "0 4px 20px rgba(5,150,105,0.35)",
                WebkitTapHighlightColor: "transparent",
                transition: "all 0.15s",
              } as React.CSSProperties}
            >
              {isSaving
                ? <><div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />등록 중...</>
                : <>✅ 이대로 주문 등록하기</>}
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
