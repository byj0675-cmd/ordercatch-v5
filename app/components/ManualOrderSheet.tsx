"use client";

import { useState } from "react";
import { OrderStatus, STATUS_CONFIG } from "../lib/mockData";
import { showToast } from "./Toast";
import { supabase } from "@/utils/supabase/client";

interface ManualOrderSheetProps {
  storeId: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES: OrderStatus[] = ["입금대기", "제작중", "픽업예정", "픽업완료"];

export default function ManualOrderSheet({ storeId, onClose, onSaved }: ManualOrderSheetProps) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [productName, setProductName] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<OrderStatus>("입금대기");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!customerName.trim() || !productName.trim()) {
      showToast("고객명과 상품명은 필수입니다.", "warning");
      return;
    }
    setSaving(true);
    try {
      const pickupIso = pickupDate
        ? new Date(`${pickupDate}T${pickupTime || "12:00"}:00`).toISOString()
        : new Date().toISOString();

      const { error } = await supabase.from("orders").insert({
        store_id: storeId,
        customer_name: customerName.trim(),
        phone: phone.trim(),
        product_name: productName.trim(),
        pickup_date: pickupIso,
        amount: Number(amount.replace(/[^0-9]/g, "")) || 0,
        status,
        source: "manual",
        options: memo.trim() ? { memo: memo.trim() } : {},
      });

      if (error) throw error;

      showToast("주문이 등록되었습니다 ✅", "success");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      showToast("등록에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  const canSave = customerName.trim().length > 0 && productName.trim().length > 0 && !saving;

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
          overflowY: "auto",
        }}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: "#E5E7EB" }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px 0",
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>
            수기 주문 등록
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "#F3F4F6", border: "none", cursor: "pointer",
              width: 32, height: 32, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#6B7280",
            }}
          >
            ✕
          </button>
        </div>

        {/* Form body — max-width centered on desktop */}
        <div style={{
          padding: "20px 24px 40px",
          maxWidth: 600, margin: "0 auto", width: "100%",
          display: "flex", flexDirection: "column", gap: 16,
          boxSizing: "border-box",
        }}>
          <Field label="고객명 *">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="홍길동"
              style={inputStyle}
            />
          </Field>

          <Field label="연락처">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              inputMode="tel"
              style={inputStyle}
            />
          </Field>

          <Field label="상품명 *">
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="레터링 케이크 2호"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="픽업 날짜">
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="픽업 시간">
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="금액 (원)">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="35000"
              inputMode="numeric"
              style={inputStyle}
            />
          </Field>

          <Field label="레터링 / 특이 요청">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="생일 축하해 지수야! / 견과류 알러지 있어요"
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
            />
          </Field>

          <Field label="초기 상태">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STATUSES.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const isActive = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      padding: "7px 16px", borderRadius: 20,
                      border: `1.5px solid ${isActive ? cfg.color : "transparent"}`,
                      background: isActive ? cfg.bg : "#F3F4F6",
                      color: isActive ? cfg.color : "#6B7280",
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              background: "#111827", color: "#fff",
              border: "none", borderRadius: 14,
              padding: "16px", fontSize: 16, fontWeight: 700,
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.45,
              transition: "opacity 0.15s",
              marginTop: 4,
            }}
          >
            {saving ? "등록 중..." : "주문 등록하기"}
          </button>
        </div>
      </div>
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
