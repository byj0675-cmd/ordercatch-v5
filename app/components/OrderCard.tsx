"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
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
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
      {chips.map((c, i) => (
        <span key={i} style={{
          fontSize: 12, padding: "3px 10px", borderRadius: 20,
          background: "rgba(79,70,229,0.06)", color: "#4f46e5", fontWeight: 700,
          border: "1px solid rgba(79,70,229,0.1)",
        }}>{c}</span>
      ))}
    </div>
  );
}

function ClockIcon({ color = "#4f46e5" }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.8" />
      <path d="M8 4.5V8L10.5 10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "시간미정";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function OrderCard({ order, onClick, onStatusChange }: { order: Order; onClick: () => void; onStatusChange?: (id: string, s: Order["status"]) => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
  const highlight = order.options?.memo || order.options?.custom;
  const imageUrl = order.options?.imageUrl;
  const [imgExpanded, setImgExpanded] = useState(false);
  
  // Swipe Logic
  const [offsetX, setOffsetX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Limit swipe range
    if (Math.abs(diff) < 10) return;
    setOffsetX(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (offsetX > 60 && order.phone) {
      window.location.href = `tel:${order.phone}`;
    } else if (offsetX < -60 && onStatusChange && order.status !== "완료") {
      onStatusChange(order.id, "완료");
    }
    setOffsetX(0);
    touchStartX.current = null;
    isSwiping.current = false;
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, marginBottom: 12 }}>
      {/* Swipe Backgrounds */}
      <div style={{
        position: "absolute", inset: 0, 
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
        background: offsetX > 0 ? "#10b981" : offsetX < 0 ? "#4f46e5" : "transparent",
        color: "#fff", fontSize: 16, fontWeight: 800,
        opacity: Math.abs(offsetX) / 100,
      }}>
        <span>📞 전화</span>
        <span>✅ 완료</span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => { if (!isSwiping.current || Math.abs(offsetX) < 5) onClick(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: "100%",
          textAlign: "left",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.05)",
          borderRadius: 20,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          transition: offsetX === 0 ? "all 0.2s ease" : "none",
          position: "relative",
          transform: `translateX(${offsetX}px)`,
          outline: "none",
          userSelect: "none",
        }}
      >
        {/* Row 1: Time + Status Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(79,70,229,0.06)", padding: "4px 10px", borderRadius: 100 }}>
             <ClockIcon color="#4f46e5" />
             <span style={{ fontSize: 13, fontWeight: 700, color: "#4f46e5" }}>{formatTime(order.pickupDate)}</span>
          </div>
          <span style={{ 
            fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 100,
            background: cfg?.bg || "#f8fafc", color: cfg?.color || "#64748b",
            border: `1px solid ${cfg?.color}20` 
          }}>
            {cfg?.label || "상태없음"}
          </span>
        </div>

        {/* Row 2: Customer Name (Master Title) */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 2 }}>{order.customerName}</div>
            <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>{order.productName}</div>
          </div>
          {imageUrl && (
            <div 
              onClick={(e) => { e.stopPropagation(); setImgExpanded(true); }}
              style={{ width: 56, height: 56, borderRadius: 14, overflow: "hidden", border: "2px solid #f1f5f9", flexShrink: 0 }}
            >
              <Image src={imageUrl} alt="주문 이미지" width={56} height={56} style={{ objectFit: "cover" }} />
            </div>
          )}
        </div>

        {/* Memo / Options */}
        {highlight && (
          <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 12, border: "1px solid #f1f5f9", fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
            💬 {highlight}
          </div>
        )}

        {/* Chips */}
        <OptionChips options={order.options} />

        {/* Amount */}
        {order.amount > 0 && (
           <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
             <span style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>{order.amount.toLocaleString()}원</span>
           </div>
        )}
      </div>

      {/* Image Lightbox */}
      {imgExpanded && imageUrl && (
        <div 
          onClick={() => setImgExpanded(false)}
          style={{ 
            position: "fixed", inset: 0, zIndex: 9999, 
            background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out"
          }}
        >
          <img src={imageUrl} alt="확대" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 20 }} />
        </div>
      )}
    </div>
  );
}
