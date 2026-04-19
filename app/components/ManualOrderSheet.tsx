"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { OrderStatus, STATUS_CONFIG, Order } from "../lib/mockData";
import { showToast } from "./Toast";
import { supabase } from "@/utils/supabase/client";
import DuplicateCheckModal from "./DuplicateCheckModal";

interface ManualOrderSheetProps {
  storeId: string;
  onClose: () => void;
  onSaved: () => void;
}

type SheetMode = "order" | "personal";
const STATUSES: OrderStatus[] = ["신규주문", "제작중", "픽업대기", "완료"];

export default function ManualOrderSheet({ storeId, onClose, onSaved }: ManualOrderSheetProps) {
  const [mode, setMode] = useState<SheetMode>("order");

  // 주문 필드
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [productName, setProductName] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<OrderStatus>("신규주문");
  const [saving, setSaving] = useState(false);

  // 중복 체크 상태
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [updateOrderId, setUpdateOrderId] = useState<string | null>(null);

  // 이미지 상태
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setCustomerName("");
    setPhone("");
    setProductName("");
    setPickupDate("");
    setPickupTime("");
    setEndTime("");
    setAmount("");
    setMemo("");
    setStatus("신규주문");
    setImagePreview(null);
    setImageFile(null);
    setUpdateOrderId(null);
  };

  const handleModeChange = (next: SheetMode) => {
    setMode(next);
    resetForm();
  };

  // 클립보드 붙여넣기 (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (mode === "personal") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleImageFile(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [mode]);

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("이미지 파일만 업로드 가능합니다.", "warning");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("파일 크기는 10MB 이하여야 합니다.", "warning");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    },
    [handleImageFile]
  );

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const path = `${storeId}/order_${timestamp}.${ext}`;

      const { error } = await supabase.storage
        .from("order_images")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data } = supabase.storage
        .from("order_images")
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (err) {
      console.error("Image upload error:", err);
      showToast("이미지 업로드에 실패했습니다.", "error");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const checkDuplicate = async () => {
    if (mode === "personal") return;
    if (updateOrderId || !customerName.trim() || !phone.trim() || phone.length < 10) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeId)
        .eq("customer_name", customerName.trim())
        .eq("phone", phone.trim())
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mappedOrders: Order[] = data.map((row) => ({
          id: row.id,
          storeId: row.store_id,
          storeName: "",
          storeType: "dessert",
          customerName: row.customer_name,
          phone: row.phone,
          productName: row.product_name,
          pickupDate: row.pickup_date,
          status: row.status as OrderStatus,
          amount: row.amount,
          options: row.options || {},
          source: row.source,
          createdAt: row.created_at || new Date().toISOString(),
        } as Order));

        setExistingOrders(mappedOrders);
        setShowDuplicateModal(true);
      }
    } catch (err) {
      console.error("Duplicate check failed:", err);
    }
  };

  const handleEditOrder = (order: Order) => {
    setUpdateOrderId(order.id);
    setCustomerName(order.customerName);
    setPhone(order.phone);
    setProductName(order.productName);

    const pDate = new Date(order.pickupDate);
    if (!isNaN(pDate.getTime())) {
      setPickupDate(pDate.toISOString().split("T")[0]);
      setPickupTime(`${String(pDate.getHours()).padStart(2, "0")}:${String(pDate.getMinutes()).padStart(2, "0")}`);
    }

    setAmount(String(order.amount));
    setStatus(order.status);
    setMemo(order.options?.memo || order.options?.custom || "");
    setImagePreview(order.options?.imageUrl || null);
    setImageFile(null);
    setShowDuplicateModal(false);
  };

  const handleSave = async () => {
    if (mode === "personal") {
      if (!productName.trim()) {
        showToast("일정 제목은 필수입니다.", "warning");
        return;
      }
    } else {
      if (!customerName.trim() || !productName.trim()) {
        showToast("고객명과 상품명은 필수입니다.", "warning");
        return;
      }
    }

    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile && mode === "order") {
        const url = await uploadImageToStorage(imageFile);
        if (url) imageUrl = url;
      }

      const pickupIso = pickupDate
        ? new Date(`${pickupDate}T${pickupTime || "09:00"}:00`).toISOString()
        : new Date().toISOString();

      const options: Record<string, any> = {};

      if (mode === "personal") {
        options.isPersonal = true;
        if (memo.trim()) options.memo = memo.trim();
        if (endTime && pickupDate) {
          options.endTime = new Date(`${pickupDate}T${endTime}:00`).toISOString();
        }
      } else {
        if (memo.trim()) options.memo = memo.trim();
        if (imageUrl) options.imageUrl = imageUrl;
      }

      const payload = {
        store_id: storeId,
        customer_name: mode === "personal" ? "개인일정" : customerName.trim(),
        phone: mode === "personal" ? "" : phone.trim(),
        product_name: productName.trim(),
        pickup_date: pickupIso,
        amount: mode === "personal" ? 0 : (Number(amount.replace(/[^0-9]/g, "")) || 0),
        status: mode === "personal" ? "신규주문" as OrderStatus : status,
        source: "manual",
        options,
      };

      if (updateOrderId) {
        const { error } = await supabase.from("orders").update(payload).eq("id", updateOrderId);
        if (error) throw error;
        showToast(mode === "personal" ? "일정이 수정되었습니다 📅" : "주문이 성공적으로 수정되었습니다 ✏️", "success");
      } else {
        const { error } = await supabase.from("orders").insert(payload);
        if (error) throw error;
        showToast(mode === "personal" ? "일정이 등록되었습니다 📅" : "주문이 성공적으로 등록되었습니다 ✅", "success");
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      showToast("등록에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  const canSave = mode === "personal"
    ? productName.trim().length > 0 && !saving
    : customerName.trim().length > 0 && productName.trim().length > 0 && !saving && !uploadingImage;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          animation: "slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92dvh",
          overflow: "hidden",
        }}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: "#E5E7EB" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 0" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>
            {mode === "personal" ? "개인 일정 등록" : "수기 주문 등록"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "#F3F4F6", border: "none", cursor: "pointer",
              width: 32, height: 32, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#6B7280",
            }}
          >✕</button>
        </div>

        {/* Mode toggle tabs */}
        <div style={{ padding: "14px 24px 0", maxWidth: 600, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          <div style={{
            display: "flex",
            background: "#F3F4F6",
            borderRadius: 12,
            padding: 4,
            gap: 4,
          }}>
            {(["order", "personal"] as SheetMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 9,
                  border: "none",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#111827" : "#6B7280",
                  fontSize: 14,
                  fontWeight: mode === m ? 700 : 500,
                  cursor: "pointer",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.18s",
                }}
              >
                {m === "order" ? "주문" : "개인일정"}
              </button>
            ))}
          </div>
        </div>

        {/* Form body — scrollable */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "20px 24px 8px",
          maxWidth: 600, margin: "0 auto", width: "100%",
          display: "flex", flexDirection: "column", gap: 16,
          boxSizing: "border-box",
        }}>
          {updateOrderId && (
            <div style={{
              background: "#EFF6FF",
              border: "1.5px solid #BFDBFE",
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1D4ED8" }}>
                ✏️ 기존 주문을 수정하는 중입니다.
              </span>
              <button
                onClick={resetForm}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563EB",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                신규 등록으로 전환
              </button>
            </div>
          )}

          {mode === "personal" ? (
            /* ── 개인일정 폼 ── */
            <>
              <Field label="일정 제목 *">
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="예: 원재료 수령, 휴무일, 미팅"
                  style={inputStyle}
                />
              </Field>

              <Field label="일정 내용">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="세부 내용을 입력하세요 (선택)"
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="날짜">
                  <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="시작 시간">
                  <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="종료 시간">
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
                </Field>
              </div>
            </>
          ) : (
            /* ── 주문 폼 ── */
            <>
              <Field label="고객명 *">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} onBlur={checkDuplicate} placeholder="홍길동" style={inputStyle} />
              </Field>

              <Field label="연락처">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={checkDuplicate} placeholder="010-0000-0000" inputMode="tel" style={inputStyle} />
              </Field>

              <Field label="상품명 *">
                <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="레터링 케이크 2호" style={inputStyle} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="픽업 날짜">
                  <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="픽업 시간">
                  <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} style={inputStyle} />
                </Field>
              </div>

              <Field label="금액 (원)">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="35000" inputMode="numeric" style={inputStyle} />
              </Field>

              <Field label="레터링 / 특이 요청">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="생일 축하해 지수야! / 견과류 알러지 있어요"
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                />
              </Field>

              {/* 이미지 업로드 영역 */}
              <Field label="참고 이미지 (선택)">
                {imagePreview ? (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img
                      src={imagePreview}
                      alt="미리보기"
                      style={{
                        width: "100%",
                        maxHeight: 220,
                        objectFit: "cover",
                        borderRadius: 12,
                        border: "1.5px solid #E5E7EB",
                        display: "block",
                      }}
                    />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      style={{
                        position: "absolute",
                        top: 8, right: 8,
                        width: 28, height: 28,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.55)",
                        border: "none",
                        color: "#fff",
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >✕</button>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280", textAlign: "center" }}>
                      {imageFile?.name}
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? "#007aff" : "#D1D5DB"}`,
                      borderRadius: 12,
                      padding: "24px 16px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: isDragging ? "rgba(0,122,255,0.04)" : "#FAFAFA",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 28 }}>🖼️</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
                      드래그 & 드롭 또는 클릭하여 이미지 선택
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                      Ctrl+V로 클립보드 이미지도 붙여넣기 가능 · JPG, PNG, WEBP · 최대 10MB
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                  }}
                />
              </Field>

              <Field label="초기 상태">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s] || STATUS_CONFIG["신규주문"] || {};
                    const isActive = status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        style={{
                          padding: "7px 16px", borderRadius: 20,
                          border: `1.5px solid ${isActive ? (cfg?.color || "#6b7280") : "transparent"}`,
                          background: isActive ? (cfg?.bg || "#f3f4f6") : "#F3F4F6",
                          color: isActive ? (cfg?.color || "#6b7280") : "#6B7280",
                          fontSize: 13, fontWeight: isActive ? 700 : 500,
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        {cfg?.label || "알수없음"}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>
          )}

        </div>

        {/* ── Sticky footer: save button ── */}
        <div style={{
          flexShrink: 0,
          padding: "14px 24px",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          background: "#fff",
          maxWidth: 600, margin: "0 auto", width: "100%",
          boxSizing: "border-box",
        }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              width: "100%", height: 62,
              background: !canSave ? "#e2e8f0" : mode === "personal" ? "linear-gradient(135deg, #475569, #64748b)" : updateOrderId ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "linear-gradient(135deg, #111827, #374151)",
              color: canSave ? "#fff" : "#94a3b8",
              border: "none", borderRadius: 16,
              fontSize: 17, fontWeight: 800,
              cursor: canSave ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              boxShadow: canSave ? "0 4px 16px rgba(0,0,0,0.2)" : "none",
              WebkitTapHighlightColor: "transparent",
            } as React.CSSProperties}
          >
            {saving ? "저장 중..." : uploadingImage ? "📤 이미지 업로드 중..." : mode === "personal" ? "📅 일정 등록하기" : updateOrderId ? "✏️ 주문 수정하기" : "✅ 주문 등록하기"}
          </button>
        </div>
      </div>

      {showDuplicateModal && (
        <DuplicateCheckModal
          existingOrders={existingOrders}
          onNewOrder={() => setShowDuplicateModal(false)}
          onEditOrder={handleEditOrder}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1.5px solid #E5E7EB",
  fontSize: 15,
  outline: "none",
  background: "#FAFAFA",
  boxSizing: "border-box",
  fontFamily: "inherit",
  color: "#111827",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
      {children}
    </div>
  );
}
