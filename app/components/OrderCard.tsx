"use client";

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
          fontSize: 11, padding: "2px 7px", borderRadius: 20,
          background: "#F3F4F6", color: "#6B7280", fontWeight: 500,
        }}>{c}</span>
      ))}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
  const highlight = order.options?.memo || order.options?.custom;
  return (
    <button
      onClick={onClick}
      className="order-card-btn"
      style={{
        width: "100%", textAlign: "left",
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 16, padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 8,
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        transition: "all 0.18s ease",
      }}
    >
      {/* 1순위: 고객명 + 픽업시간 + 상태 뱃지 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#111827", lineHeight: 1.2, flexShrink: 0 }}>
            {order.customerName}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#374151", flexShrink: 0 }}>
            {formatTime(order.pickupDate)}
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
          background: cfg?.bg || "#f3f4f6", color: cfg?.color || "#6b7280", flexShrink: 0, whiteSpace: "nowrap",
        }}>
          {cfg?.label || "상태알수없음"}
        </span>
      </div>

      {/* 2순위: 상품명 + 금액 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {order.productName}
        </span>
        {order.amount > 0 && (
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", flexShrink: 0, marginLeft: 8 }}>
            {order.amount.toLocaleString()}원
          </span>
        )}
      </div>

      {/* 형광펜 강조: 레터링 / 특이 요청 */}
      {highlight && (
        <div style={{
          background: "#FFFBEB",
          borderLeft: "3px solid #F59E0B",
          borderRadius: "0 8px 8px 0",
          padding: "6px 10px",
          fontSize: 13, color: "#92400E", fontWeight: 500, lineHeight: 1.5,
        }}>
          {highlight}
        </div>
      )}

      {/* 옵션 칩 */}
      <OptionChips options={order.options} />
    </button>
  );
}
