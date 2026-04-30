"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/utils/supabase/client";
import { type Order, type OrderStatus } from "../lib/mockData";
import { showToast } from "./Toast";
import ImageLightbox from "./ImageLightbox";
import { useStoreProvider } from "../context/StoreContext";

// --- 디자인 시스템 상수 (Indigo & Slate 테마) ---
const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string; label: string; dot: string }> = {
  신규주문: { color: "#4F46E5", bg: "rgba(79, 70, 229, 0.1)", label: "신규주문", dot: "#4F46E5" },
  제작중:   { color: "#2563EB", bg: "rgba(37, 99, 235, 0.1)", label: "제작중",   dot: "#3B82F6" },
  픽업대기: { color: "#D97706", bg: "rgba(217, 119, 6, 0.1)", label: "픽업대기", dot: "#F59E0B" },
  완료:     { color: "#475569", bg: "rgba(71, 85, 105, 0.1)", label: "완료",    dot: "#64748B" },
  취소:     { color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", label: "취소",    dot: "#F87171" },
};

const SOURCE_CONFIG = {
  kakao: { label: "카카오톡", color: "#FEE500", textColor: "#3B1E08", emoji: "💬" },
  instagram: { label: "인스타", color: "#E1306C", textColor: "#fff", emoji: "📷" },
  manual: { label: "직접입력", color: "#64748B", textColor: "#fff", emoji: "✏️" },
  link: { label: "링크주문", color: "#4F46E5", textColor: "#fff", emoji: "🔗" },
};

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
  onDelete?: (orderId: string) => void;
  onUpdated?: (updatedOrder: Order) => void;
}

const STATUSES: Order["status"][] = ["신규주문", "제작중", "픽업대기", "완료", "취소"];

export default function OrderDetailModal({ order, onClose, onStatusChange, onDelete, onUpdated }: OrderDetailModalProps) {
  const { updateOrderFields } = useStoreProvider();
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // --- 편집 가능 상태 관리 ---
  const [editName, setEditName] = useState(order.customerName);
  const [editPhone, setEditPhone] = useState(order.phone);
  const [editProduct, setEditProduct] = useState(order.productName);
  const [editStatus, setEditStatus] = useState<Order["status"]>(order.status);
  const [editAmount, setEditAmount] = useState(String(order.amount));
  const [editMemo, setEditMemo] = useState(order.options?.memo || order.options?.custom || "");

  // 날짜/시간 분리 처리
  const initialDate = new Date(order.pickupDate);
  const isValidInitialDate = !isNaN(initialDate.getTime());
  const [editDate, setEditDate] = useState(isValidInitialDate ? initialDate.toISOString().split("T")[0] : "");
  const [editTime, setEditTime] = useState(isValidInitialDate ? `${String(initialDate.getHours()).padStart(2, "0")}:${String(initialDate.getMinutes()).padStart(2, "0")}` : "");

  // --- 이미지 상태 관리 ---
  const [imagePreview, setImagePreview] = useState<string | null>(order.options?.imageUrl || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  // 이미 업로드된 URL (선택 즉시 백그라운드 업로드 시작)
  const uploadedImageUrlRef = useRef<string | null>(order.options?.imageUrl || null);
  const uploadPromiseRef = useRef<Promise<string | null> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cfg = STATUS_CONFIG[editStatus] || STATUS_CONFIG["신규주문"] || {};
  const src = SOURCE_CONFIG[order.source] || SOURCE_CONFIG["manual"] || {};

  // 클립보드 이미지 붙여넣기 감지 (onPaste 이벤트 통합)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
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
  }, []);

  // 파일 선택 즉시 백그라운드 업로드 시작 — 저장 시 이미 완료되어 있음
  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("이미지 파일만 가능합니다.", "warning");
      return;
    }
    // 프리뷰 즉시 표시
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // 백그라운드 업로드 시작
    setUploadingImage(true);
    const promise = (async (): Promise<string | null> => {
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${order.storeId}/order_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("order_images").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("order_images").getPublicUrl(path);
        uploadedImageUrlRef.current = data.publicUrl;
        showToast("사진 업로드 완료!", "success", "📸");
        return data.publicUrl;
      } catch (err) {
        console.error("Upload error:", err);
        showToast("사진 업로드 실패. 다시 시도해주세요.", "error");
        return null;
      } finally {
        setUploadingImage(false);
      }
    })();
    uploadPromiseRef.current = promise;
    showToast("사진 업로드 중... 다른 정보를 계속 수정할 수 있습니다.", "info", "📸");
  }, [order.storeId]);

  const handleSave = async () => {
    // 이미지 업로드 대기 (이미 백그라운드 진행 중이면 완료 대기)
    let finalImageUrl: string | null = uploadedImageUrlRef.current;
    if (!imagePreview) {
      finalImageUrl = null;
    } else if (uploadingImage && uploadPromiseRef.current) {
      setIsSaving(true);
      finalImageUrl = await uploadPromiseRef.current;
      setIsSaving(false);
      if (!finalImageUrl) return;
    }

    const pickupIso = editDate
      ? new Date(`${editDate}T${editTime || "12:00"}:00`).toISOString()
      : order.pickupDate;

    // ── Local-First: Dexie 즉시 업데이트 → Pro: 백그라운드 sync ──
    await updateOrderFields(order.id, {
      customerName: editName,
      phone: editPhone,
      productName: editProduct,
      pickupDate: pickupIso,
      amount: Number(editAmount.replace(/[^0-9]/g, "")) || 0,
      status: editStatus,
      options: { ...order.options, memo: editMemo, imageUrl: finalImageUrl ?? undefined },
    });

    const updatedOrder: Order = {
      ...order,
      customerName: editName,
      phone: editPhone,
      productName: editProduct,
      pickupDate: pickupIso,
      amount: Number(editAmount.replace(/[^0-9]/g, "")) || 0,
      status: editStatus,
      options: { ...order.options, memo: editMemo, imageUrl: finalImageUrl ?? undefined },
    };

    if (onUpdated) onUpdated(updatedOrder);
    onClose();
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(40px)",
            borderRadius: 28,
            width: "100%",
            maxWidth: 580,
            boxShadow: "0 50px 100px rgba(0,0,0,0.25)",
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.08)",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Color strip header */}
          <div
            style={{
              height: 6,
              background: `linear-gradient(90deg, ${cfg?.dot || "#4F46E5"}, ${cfg?.dot || "#4F46E5"}88)`,
            }}
          />

          {/* Header */}
          <div style={{ padding: "24px 32px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span
                    style={{ 
                      fontSize: 11, 
                      fontWeight: 700, 
                      padding: "4px 12px", 
                      borderRadius: 20, 
                      background: cfg?.bg || "rgba(79, 70, 229, 0.1)", 
                      color: cfg?.color || "#4F46E5",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg?.dot || "#4F46E5" }} />
                    {cfg?.label || "상태알수없음"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: "rgba(100, 116, 139, 0.1)",
                      color: "#64748B",
                    }}
                  >
                    {src?.emoji || "✏️"} {src?.label || "직접입력"}
                  </span>
                </div>
                <textarea
                  value={editProduct}
                  onChange={(e) => setEditProduct(e.target.value)}
                  placeholder="주문 상품명 입력"
                  style={{
                    width: "100%",
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#1E293B",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    padding: 0,
                    margin: 0,
                    lineHeight: 1.2,
                    fontFamily: "inherit",
                    letterSpacing: "-0.02em"
                  }}
                  rows={1}
                />
              </div>
              <button
                onClick={onClose}
                style={{ background: "#F1F5F9", border: "none", borderRadius: 12, padding: "8px", cursor: "pointer", color: "#64748B", marginLeft: 16 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Body Scroll Area */}
          <div style={{ padding: "28px 32px 32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 28 }}>
            
            {/* 사진 관리 영역 */}
            <div>
              <SectionTitle>📸 사진 관리</SectionTitle>
              <div style={{ marginTop: 14 }}>
                {imagePreview ? (
                  <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,0,0,0.1)", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                    <img
                      src={imagePreview}
                      alt="주문 이미지"
                      onClick={() => setLightboxOpen(true)}
                      style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block", cursor: "zoom-in" }}
                    />
                    <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        style={{ background: "rgba(255,255,255,0.95)", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", color: "#1E293B" }}
                      >사진 변경</button>
                      <button 
                        onClick={() => { uploadedImageUrlRef.current = null; uploadPromiseRef.current = null; setImagePreview(null); }}
                        style={{ background: "#EF4444", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)" }}
                      >삭제</button>
                    </div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", padding: "24px 16px 12px", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                      💡 Ctrl+V를 눌러 이미지를 즉시 붙여넣을 수 있습니다.
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      height: 140,
                      borderRadius: 20,
                      border: "2.5px dashed #CBD5E1",
                      background: "#F8FAFC",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <span style={{ fontSize: 32 }}>🖼️</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#64748B" }}>사진 추가 (클릭하거나 Ctrl+V)</div>
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
              </div>
            </div>

            {/* 주요 정보 편집 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={labelStyle}>결제 금액 (원)</label>
                <input 
                  type="text"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  style={modalInputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={labelStyle}>픽업 일자</label>
                <input 
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={modalInputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={labelStyle}>고객 성함</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="성함 입력"
                  style={modalInputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={labelStyle}>픽업 시간</label>
                <input 
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  style={modalInputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: 'span 2' }}>
                <label style={labelStyle}>연락처</label>
                <input 
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  style={modalInputStyle}
                />
              </div>
            </div>

            {/* 요청사항/메모 */}
            <div>
              <SectionTitle>📝 요청사항 및 메모</SectionTitle>
              <textarea
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value)}
                placeholder="레터링 문구, 알러지 정보 등을 상세히 기록하세요..."
                style={{
                  width: "100%",
                  minHeight: 140,
                  marginTop: 14,
                  padding: "16px 18px",
                  borderRadius: 18,
                  border: "1.5px solid #E2E8F0",
                  background: "#F8FAFC",
                  fontSize: 15,
                  lineHeight: 1.6,
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                  color: "#1E293B"
                }}
              />
            </div>

            {/* 상태 변경 탭 */}
            <div>
              <SectionTitle>📂 진행 상태 변경</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                {STATUSES.map((s) => {
                  const c = STATUS_CONFIG[s] || STATUS_CONFIG["신규주문"] || {};
                  const isActive = editStatus === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      style={{
                        flex: 1,
                        minWidth: "100px",
                        padding: "12px 10px",
                        borderRadius: 14,
                        border: `2px solid ${isActive ? c.dot : "transparent"}`,
                        background: isActive ? c.bg : "#F1F5F9",
                        color: isActive ? c.color : "#64748B",
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isActive ? `0 4px 12px ${c.bg}` : "none"
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "18px",
                  borderRadius: 20,
                  background: "#F1F5F9",
                  color: "#64748B",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >닫기</button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  flex: 2,
                  padding: "18px",
                  borderRadius: 20,
                  background: "#4F46E5",
                  color: "#fff",
                  border: "none",
                  fontWeight: 900,
                  fontSize: 17,
                  cursor: isSaving ? "not-allowed" : "pointer",
                  boxShadow: "0 10px 20px rgba(79, 70, 229, 0.3)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => !isSaving && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={e => !isSaving && (e.currentTarget.style.transform = "translateY(0)")}
              >
                {isSaving ? "사진 업로드 대기 중..." : (uploadingImage ? "📤 사진 업로드 중 (저장 가능)" : "주문 정보 업데이트")}
              </button>
            </div>

            {/* Footer Meta */}
            <div style={{ paddingTop: 24, borderTop: "1.5px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, display: "flex", gap: 16 }}>
                <span>ID: {order.id.slice(0, 12)}</span>
                <span>최초 등록: {new Date(order.createdAt).toLocaleString("ko-KR")}</span>
              </div>
              
              {onDelete && (
                <button
                  onClick={() => onDelete(order.id)}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#EF4444",
                    fontSize: 12,
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 14px",
                    borderRadius: 12,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")}
                >
                  🗑️ 주문 영구 삭제
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && imagePreview && (
        <ImageLightbox
          src={imagePreview}
          alt={`${editName} 참고 사진`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

// --- 공통 스타일 핸들러 ---
const modalInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1.5px solid #E2E8F0",
  fontSize: 15,
  outline: "none",
  background: "#F8FAFC",
  color: "#1E293B",
  fontFamily: "inherit",
  transition: "all 0.2s ease",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#64748B",
  marginLeft: 4,
  display: "block"
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 900,
        color: "#94A3B8",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        paddingBottom: 6,
        borderBottom: "1.5px solid #F1F5F9",
      }}
    >
      {children}
    </div>
  );
}
