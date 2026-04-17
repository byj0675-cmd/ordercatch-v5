"use client";

import { useState } from "react";
import { Order, STATUS_CONFIG } from "../lib/mockData";

export function OptionChips({ options }: { options: Order["options"] }) {
  const chips: string[] = [];
  if (options.count && options.count > 1) chips.push(`${options.count}개`);
  if (options.delivery) chips.push(options.delivery);
  if (options.design) chips.push(options.design);
  if (options.color?.length) chips.push(options.color.join(", "));
  if (options.nailLength) chips.push(options.nailLength);
  if (options.cooling) chips.push("냉장");
  if (options.quickDelivery) chips.push("당일배송");
  if (options.allergyInfo) chips.push(`알러지: ${options.allergyInfo}`);
  if (options.paymentMethod) chips.push(options.paymentMethod);
  if (options.couponUsed) chips.push(`쿠폰: ${options.couponUsed}`);
  if (!chips.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {chips.map((c, i) => (
        <span key={i} style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 20,
          background: "rgba(79,70,229,0.07)", color: "#4f46e5", fontWeight: 600,
        }}>{c}</span>
      ))}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="#4f46e5" strokeWidth="1.5" />
      <path d="M8 4.5V8L10.5 10" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "시간미정";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
  const highlight = order.options?.memo || order.options?.custom;
  const imageUrl = order.options?.imageUrl;
  const [imgExpanded, setImgExpanded] = useState(false);

  return (
    <>
      <button
        onClick={onClick}
        style={{
          width: "100%",
          textAlign: "left",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.05)",
          borderRadius: 18,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 9,
          cursor: "pointer",
          boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          transition: "all 0.2s ease",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(79,70,229,0.10)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(0,0,0,0.04)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }}
      >
        {/* 썸네일 (우측 상단 절대 배치) */}
        {imageUrl && (
          <div
            onClick={(e) => { e.stopPropagation(); setImgExpanded(true); }}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 52,
              height: 52,
              borderRadius: 12,
              overflow: "hidden",
              border: "2px solid rgba(0,0,0,0.06)",
              cursor: "zoom-in",
              flexShrink: 0,
            }}
          >
            <img src={imageUrl} alt="주문 이미지" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {/* Row 1: 픽업시간 + 고객명 + 상태 */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingRight: imageUrl ? 66 : 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(79,70,229,0.07)", padding: "3px 8px",
            borderRadius: 20, flexShrink: 0,
          }}>
            <ClockIcon />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>
              {formatTime(order.pickupDate)}
            </span>
          </div>
          <span style={{
            fontSize: 16, fontWeight: 800, color: "#0f172a",
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {order.customerName}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 9px",
            borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap",
            background: cfg?.bg || "#f1f5f9", color: cfg?.color || "#64748b",
          }}>
            {cfg?.label || "상태없음"}
          </span>
        </div>

        {/* Row 2: 상품명 + 금액 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          paddingRight: imageUrl ? 66 : 0,
        }}>
          <span style={{
            fontSize: 13, color: "#475569", fontWeight: 500,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {order.productName}
          </span>
          {order.amount > 0 && (
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", flexShrink: 0 }}>
              {order.amount.toLocaleString()}원
            </span>
          )}
        </div>

        {/* 요청사항 박스 */}
        {highlight && (
          <div style={{
            background: "#f8fafc",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 10,
            padding: "7px 11px",
            fontSize: 12, color: "#334155", fontWeight: 500, lineHeight: 1.5,
          }}>
            💬 {highlight}
          </div>
        )}

        {/* 옵션 칩 */}
        <OptionChips options={order.options} />
      </button>

      {/* 이미지 라이트박스 */}
      {imgExpanded && imageUrl && (
        <div
          onClick={() => setImgExpanded(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <img
            src={imageUrl}
            alt="주문 이미지 확대"
            style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 16, objectFit: "contain" }}
          />
        </div>
      )}
    </>
  );
}
