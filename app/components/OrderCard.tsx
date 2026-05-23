"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useAnimation } from "framer-motion";
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
          background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 700,
          border: "1px solid var(--accent-border)",
        }}>{c}</span>
      ))}
    </div>
  );
}

function ClockIcon({ color = "var(--accent)" }: { color?: string }) {
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

export default function OrderCard({
  order,
  onClick,
  onStatusChange,
}: {
  order: Order;
  onClick: () => void;
  onStatusChange?: (id: string, s: Order["status"]) => void;
}) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
  const highlight = order.options?.memo || order.options?.custom;
  const imageUrl = order.options?.imageUrl;
  const [imgExpanded, setImgExpanded] = useState(false);

  // Swipe Logic (framer-motion)
  const controls = useAnimation();
  const [dragAction, setDragAction] = useState<"call" | "complete" | null>(null);

  const handleDrag = (_event: any, info: any) => {
    const x = info.offset.x;
    if (x > 50) setDragAction("call");
    else if (x < -50 && order.status !== "완료") setDragAction("complete");
    else setDragAction(null);
  };

  const handleDragEnd = (_event: any, info: any) => {
    const x = info.offset.x;

    if (x > 80 && order.phone) {
      // 전화 걸기
      const a = document.createElement("a");
      a.href = `tel:${order.phone}`;
      a.click();
      // fire-and-forget: await 없이 즉시 반환
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    } else if (x < -80 && onStatusChange && order.status !== "완료") {
      // 로컬 DB 즉시 반영 (await 없이 — useLiveQuery가 자동 갱신)
      onStatusChange(order.id, "완료");
      // 슬라이드 아웃 애니메이션 (non-blocking)
      controls.start({ x: -400, opacity: 0, transition: { duration: 0.25 } });
    } else {
      // 제자리 복귀
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }

    setDragAction(null);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, marginBottom: 12 }}>
      {/* Swipe Backgrounds */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
        background: dragAction === "call" ? "#10b981" : dragAction === "complete" ? "var(--accent)" : "#cbd5e1",
        color: "#fff", fontSize: 16, fontWeight: 800,
      }}>
        <span style={{ opacity: dragAction === "call" ? 1 : 0.5 }}>전화</span>
        <span style={{ opacity: dragAction === "complete" ? 1 : 0.5 }}>완료</span>
      </div>

      <motion.div
        role="button"
        tabIndex={0}
        onTap={() => onClick()}
        onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileHover={{
          y: -4,
          borderColor: "rgba(255, 111, 67, 0.25)",
          boxShadow: "0 12px 28px rgba(255, 111, 67, 0.08), 0 1px 2px rgba(0, 0, 0, 0.01)",
          background: "rgba(255, 255, 255, 0.75)"
        }}
        transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
        style={{
          touchAction: "pan-y",
          width: "100%",
          textAlign: "left",
          background: "rgba(255, 255, 255, 0.65)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.45)",
          borderRadius: 20,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
          position: "relative",
          outline: "none",
          userSelect: "none",
          zIndex: 10,
        }}
      >
        {/* Row 1: Time + Status Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent-soft)", padding: "4px 10px", borderRadius: 100 }}>
             <ClockIcon color="var(--accent)" />
             <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{formatTime(order.pickupDate)}</span>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 100,
            background: cfg?.bg || "#f8fafc", color: cfg?.color || "#64748b",
            border: `1px solid ${cfg?.color}20`
          }}>
            {cfg?.label || "상태없음"}
          </span>
        </div>

        {/* Row 2: Customer Name */}
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

        {/* Memo */}
        {highlight && (
          <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 12, border: "1px solid #f1f5f9", fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
            {highlight}
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
      </motion.div>

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
