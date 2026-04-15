"use client";

import { Order, STATUS_CONFIG, SOURCE_CONFIG } from "../lib/mockData";
import { showToast } from "./Toast";
import ImageLightbox from "./ImageLightbox";
import { useState } from "react";

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
  onDelete?: (orderId: string) => void;
}

const STATUSES: Order["status"][] = ["신규주문", "제작중", "픽업대기", "완료", "취소"];

export default function OrderDetailModal({ order, onClose, onStatusChange, onDelete }: OrderDetailModalProps) {
  const cfg = STATUS_CONFIG[order.status];
  const src = SOURCE_CONFIG[order.source];
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const imageUrl = order.options.imageUrl;

  const pickupDate = new Date(order.pickupDate);
  const isValidDate = !isNaN(pickupDate.getTime());

  const formatDate = (d: Date) => {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = d.getHours();
    const mm = d.getMinutes();
    const isPM = hh >= 12;
    const h12 = hh % 12 || 12;
    const timeStr = mm === 0 ? `${h12}시 ${isPM ? "오후" : "오전"}` : `${h12}:${String(mm).padStart(2, "0")} ${isPM ? "오후" : "오전"}`;
    return `${m}월 ${day}일 ${timeStr}`;
  };

  const handleStatusChange = (newStatus: Order["status"]) => {
    if (onStatusChange) onStatusChange(order.id, newStatus);
  };

  const optionEntries = Object.entries(order.options).filter(
    ([key, v]) => key !== "imageUrl" && v !== undefined && v !== false && v !== "" && !(Array.isArray(v) && v.length === 0)
  );

  const optionLabels: Record<string, string> = {
    count: "수량",
    delivery: "배송 방법",
    address: "배송 주소",
    memo: "메모",
    allergyInfo: "알러지 정보",
    cooling: "보냉 포장",
    quickDelivery: "퀵 배달",
    design: "디자인",
    color: "컬러",
    nailLength: "손톱 길이",
    custom: "커스텀 문구",
    couponUsed: "쿠폰",
    paymentMethod: "결제 수단",
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
        className="animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(30px)",
          borderRadius: 24,
          width: "100%",
          maxWidth: 560,
          boxShadow: "0 40px 80px rgba(0,0,0,0.2)",
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.07)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Color strip header */}
        <div
          style={{
            height: 5,
            background: `linear-gradient(90deg, ${cfg.dot}, ${cfg.dot}88)`,
          }}
        />

        {/* Header */}
        <div style={{ padding: "22px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span
                  className="status-badge"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
                  {cfg.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: src.color + "22",
                    color: src.color === "#FEE500" ? "#8B6914" : src.color,
                  }}
                >
                  {src.emoji} {src.label}
                </span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.3 }}>
                {order.productName}
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4, marginBottom: 0 }}>
                {order.storeName}
              </p>
            </div>
            <button
              className="btn btn-ghost"
              onClick={onClose}
              style={{ borderRadius: 10, padding: "6px 10px", flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 이미지 썸네일 (있을 때만) */}
          {imageUrl && (
            <div
              onClick={() => setLightboxOpen(true)}
              style={{
                borderRadius: 14,
                overflow: "hidden",
                cursor: "zoom-in",
                position: "relative",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <img
                src={imageUrl}
                alt="참고 이미지"
                style={{
                  width: "100%",
                  maxHeight: 220,
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "linear-gradient(transparent, rgba(0,0,0,0.45))",
                  padding: "20px 14px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                  🔍 클릭하여 원본 크기로 보기
                </span>
              </div>
            </div>
          )}
          {/* Amount + Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <MetaCard
              icon="💰"
              label="결제 금액"
              value={`${order.amount.toLocaleString()}원`}
              highlight
            />
            <MetaCard
              icon="📅"
              label="픽업 일시"
              value={isValidDate ? formatDate(pickupDate) : "미정"}
            />
          </div>

          {/* Customer */}
          <div>
            <SectionTitle>고객 정보</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <DetailRow label="성함" value={order.customerName} />
              <DetailRow label="연락처" value={order.phone} />
            </div>
          </div>

          {/* Options */}
          {optionEntries.length > 0 && (
            <div>
              <SectionTitle>주문 상세 옵션</SectionTitle>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {optionEntries.map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.03)",
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)", width: 80, flexShrink: 0, paddingTop: 1 }}>
                      {optionLabels[key] || key}
                    </span>
                    <span style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.5 }}>
                      {renderOptionValue(key, val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status change */}
          <div>
            <SectionTitle>상태 변경</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {STATUSES.map((s) => {
                const c = STATUS_CONFIG[s];
                const isActive = order.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => !isActive && handleStatusChange(s)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 9,
                      border: `1.5px solid ${isActive ? c.dot : "transparent"}`,
                      background: isActive ? c.bg : "rgba(0,0,0,0.05)",
                      color: isActive ? c.color : "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 500,
                      cursor: isActive ? "default" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toss payment stub */}
          <div
            style={{
              padding: "16px 18px",
              background: "linear-gradient(135deg, #0064FF11, #1A9CFF11)",
              borderRadius: 14,
              border: "1px solid rgba(0,100,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0064FF" }}>💳 토스페이먼츠</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                결제 링크 생성 및 결제창 호출
              </div>
            </div>
            <button
              className="btn"
              style={{
                background: "#0064FF",
                color: "#fff",
                borderRadius: 9,
                padding: "7px 14px",
                fontSize: 13,
              }}
              onClick={() => showToast("결제 링크 생성 기능은 준비 중입니다.", "info", "💳")}
            >
              결제 링크 생성
            </button>
          </div>

          <div style={{ padding: "16px 0 0", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", gap: 16 }}>
              <span>주문 ID: <code style={{ fontFamily: "var(--font-geist-mono)" }}>{order.id.slice(0, 8)}</code></span>
              <span>등록: {new Date(order.createdAt).toLocaleDateString("ko-KR")}</span>
            </div>
            
            {onDelete && (
              <button
                onClick={() => onDelete(order.id)}
                style={{
                  background: "transparent",
                  color: "#FF3B30",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderRadius: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,59,48,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                🗑️ 삭제
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Lightbox */}
      {lightboxOpen && imageUrl && (
        <ImageLightbox
          src={imageUrl}
          alt={`${order.customerName} 참고 이미지`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

function renderOptionValue(key: string, val: unknown): string {
  if (typeof val === "boolean") return val ? "예" : "아니오";
  if (Array.isArray(val)) {
    if (key === "color") {
      return (val as string[]).join(", ");
    }
    return (val as string[]).join(", ");
  }
  return String(val);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        paddingBottom: 2,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}

function MetaCard({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: highlight ? "linear-gradient(135deg, #007aff0d, #007aff06)" : "rgba(0,0,0,0.03)",
        borderRadius: 12,
        border: highlight ? "1px solid rgba(0,122,255,0.12)" : "1px solid transparent",
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: highlight ? "var(--accent)" : "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
