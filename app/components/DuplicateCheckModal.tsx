"use client";

import { Order, STATUS_CONFIG } from "../lib/mockData";
import { useEffect } from "react";

interface DuplicateCheckModalProps {
  existingOrders: Order[];
  onNewOrder: () => void;
  onEditOrder: (order: Order) => void;
  onClose: () => void;
}

export default function DuplicateCheckModal({
  existingOrders,
  onNewOrder,
  onEditOrder,
  onClose,
}: DuplicateCheckModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "24px 24px 16px" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🔔</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>
            중복된 고객 정보가 있습니다!
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: "#6B7280", lineHeight: 1.5 }}>
            입력하신 고객명과 연락처로 이미 등록된 주문 내역이 발견되었습니다. 어떻게 처리할까요?
          </p>
        </div>

        <div style={{ padding: "0 24px 20px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "50vh", overflowY: "auto" }}>
          {existingOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
            const d = new Date(order.pickupDate);
            const timeStr = isNaN(d.getTime()) ? "미정" : `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

            return (
              <div
                key={order.id}
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                    {order.productName}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: cfg?.bg || "#f3f4f6",
                      color: cfg?.color || "#6b7280",
                      padding: "2px 8px",
                      borderRadius: 12,
                    }}
                  >
                    {cfg?.label || "상태알수없음"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  픽업일: {timeStr}
                </div>
                <button
                  onClick={() => onEditOrder(order)}
                  style={{
                    background: "transparent",
                    border: "1.5px solid #007aff",
                    color: "#007aff",
                    borderRadius: 8,
                    padding: "8px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    marginTop: 4,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,122,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  ✏️ 이 주문 내용으로 수정하기
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "16px 24px 24px", background: "#F9FAFB", display: "flex", gap: 10 }}>
          <button
            onClick={onNewOrder}
            style={{
              flex: 1,
              background: "#111827",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            ➕ 새로운 주문으로 등록
          </button>
          <button
            onClick={onClose}
            style={{
              background: "#E5E7EB",
              color: "#374151",
              border: "none",
              borderRadius: 12,
              padding: "12px 16px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
