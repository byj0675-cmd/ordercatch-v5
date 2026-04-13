"use client";

import { useState } from "react";

interface FABProps {
  onAddOrder: () => void;
  onPrint: () => void;
}

export default function FAB({ onAddOrder, onPrint }: FABProps) {
  const [open, setOpen] = useState(false);

  const handleAddOrder = () => {
    setOpen(false);
    onAddOrder();
  };

  const handlePrint = () => {
    setOpen(false);
    onPrint();
  };

  return (
    <>
      {/* Backdrop to close speed dial */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 98 }}
        />
      )}

      <div
        className="fab-wrap"
        style={{
          position: "fixed",
          bottom: 28,
          right: 24,
          zIndex: 99,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        {/* Speed dial items */}
        {open && (
          <>
            <SpeedDialItem
              icon="🖨️"
              label="오늘 주문 출력"
              onClick={handlePrint}
              delay="0.08s"
            />
            <SpeedDialItem
              icon="✏️"
              label="수기 주문 등록"
              onClick={handleAddOrder}
              delay="0s"
            />
          </>
        )}

        {/* Main FAB button */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="주문 관리 메뉴"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: open ? "#374151" : "#111827",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 300,
            boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
            transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), background 0.15s",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </button>
      </div>
    </>
  );
}

function SpeedDialItem({
  icon,
  label,
  onClick,
  delay,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  delay: string;
}) {
  return (
    <div
      className="animate-fadeIn"
      style={{ animationDelay: delay, display: "flex", alignItems: "center", gap: 10 }}
    >
      {/* Label chip */}
      <span
        style={{
          background: "#111827",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          padding: "6px 12px",
          borderRadius: 20,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        {label}
      </span>
      {/* Icon button */}
      <button
        onClick={onClick}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </button>
    </div>
  );
}
