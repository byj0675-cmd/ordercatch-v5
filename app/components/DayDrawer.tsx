"use client";

import { useEffect } from "react";
import { Order, STATUS_CONFIG, SOURCE_CONFIG } from "../lib/mockData";

interface DayDrawerProps {
  date: Date;
  orders: Order[];
  onClose: () => void;
  onOrderClick: (order: Order) => void;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
  onDelete?: (orderId: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--:--";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── 드로어 내부 주문 카드 ─────────────────────────────
function DrawerOrderCard({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
  const src = SOURCE_CONFIG[order.source] || SOURCE_CONFIG["manual"] || {};
  const highlight = order.options?.memo || order.options?.custom;
  const imageUrl = order.options?.imageUrl;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        transition: "all 0.18s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 8px 24px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.06)";
      }}
    >
      {/* 왼쪽 상태 액센트 바 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: cfg?.dot || "#9ca3af",
          borderRadius: "4px 0 0 4px",
        }}
      />

      {/* 상단: 고객명 + 시간 + 상태 뱃지 + (옵션) 썸네일 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
          paddingLeft: 8,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
              {order.customerName}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>
              {formatTime(order.pickupDate)}
            </span>
          </div>
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 20,
                background: cfg?.bg || "#f3f4f6",
                color: cfg?.color || "#6b7280",
                whiteSpace: "nowrap",
              }}
            >
              {cfg?.label || "알수없음"}
            </span>
          </div>
        </div>

        {/* 썸네일 */}
        {imageUrl && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,0.06)",
              flexShrink: 0,
            }}
          >
            <img
              src={imageUrl}
              alt="참고 이미지"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}
      </div>

      {/* 상품명 + 금액 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingLeft: 8,
        }}
      >
        <span
          style={{
            fontSize: 14,
            color: "#374151",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {order.productName}
        </span>
        {order.amount > 0 && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {order.amount.toLocaleString()}원
          </span>
        )}
      </div>

      {/* 레터링 / 메모 강조 */}
      {highlight && (
        <div
          style={{
            background: "#FFFBEB",
            borderLeft: "3px solid #F59E0B",
            borderRadius: "0 8px 8px 0",
            padding: "6px 10px",
            fontSize: 13,
            color: "#92400E",
            fontWeight: 500,
            lineHeight: 1.5,
            marginLeft: 8,
          }}
        >
          {highlight}
        </div>
      )}

      {/* 채널 뱃지 */}
      <div style={{ paddingLeft: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 5,
            background: (src?.color || "#e5e7eb") + "22",
            color: src?.color === "#FEE500" ? "#8B6914" : (src?.color || "#6b7280"),
          }}
        >
          {src?.emoji || "❓"} {src?.label || "알수없음"}
        </span>
      </div>
    </button>
  );
}

// ── 메인 DayDrawer ────────────────────────────────────
export default function DayDrawer({
  date,
  orders,
  onClose,
  onOrderClick,
}: DayDrawerProps) {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime()
  );

  const totalRevenue = sorted.reduce((s, o) => s + o.amount, 0);

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  const dateLabel = `${month}월 ${day}일 (${weekday})`;

  // 프린트 시 body에 data-drawer 속성 설정
  useEffect(() => {
    document.body.setAttribute("data-drawer", "open");
    return () => {
      document.body.removeAttribute("data-drawer");
    };
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handlePrint = () => window.print();

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* ─── 데스크톱: 우측 사이드 드로어 ─────────────── */}
      <div
        className="drawer-desktop desktop-only"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: "#F9FAFB",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <DrawerContent
          dateLabel={dateLabel}
          orders={sorted}
          totalRevenue={totalRevenue}
          onClose={onClose}
          onOrderClick={onOrderClick}
          onPrint={handlePrint}
        />
      </div>

      {/* ─── 모바일: 바텀시트 ───────────────────────────── */}
      <div
        className="drawer-mobile mobile-only"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "90vh",
          background: "#F9FAFB",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 99,
              background: "#E5E7EB",
            }}
          />
        </div>
        <DrawerContent
          dateLabel={dateLabel}
          orders={sorted}
          totalRevenue={totalRevenue}
          onClose={onClose}
          onOrderClick={onOrderClick}
          onPrint={handlePrint}
        />
      </div>

      {/* ─── 프린트 전용 섹션 ───────────────────────────── */}
      <div id="day-print-section">
        <div style={{ padding: "40px 32px", color: "#000", background: "#fff" }}>
          <div style={{ borderBottom: "3px solid #000", paddingBottom: 16, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em" }}>
                DAILY ORDER SHEET
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600, color: "#444" }}>
                {dateLabel} 주문 내역
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#666" }}>출력 일시: {new Date().toLocaleString("ko-KR")}</p>
              <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800 }}>금액 합계: {totalRevenue.toLocaleString()}원</p>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["No", "시간", "고객명", "주문 상품", "요청사항 / 메모", "금액"].map((h) => (
                  <th key={h} style={{ padding: "12px 8px", borderBottom: "2px solid #000", textAlign: "left", fontSize: 13, fontWeight: 800 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((o, i) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "12px 8px", fontSize: 12, color: "#666" }}>{i + 1}</td>
                  <td style={{ padding: "12px 8px", fontSize: 15, fontWeight: 800 }}>{formatTime(o.pickupDate)}</td>
                  <td style={{ padding: "12px 8px", fontSize: 15, fontWeight: 800 }}>{o.customerName}</td>
                  <td style={{ padding: "12px 8px", fontSize: 14 }}>{o.productName}</td>
                  <td style={{ padding: "12px 8px", fontSize: 13, lineHeight: 1.5, maxWidth: 260 }}>
                    {o.options.memo || o.options.custom || <span style={{ color: "#ccc" }}>-</span>}
                  </td>
                  <td style={{ padding: "12px 8px", fontSize: 14, fontWeight: 700, textAlign: "right" }}>
                    {o.amount.toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>해당 날짜에 등록된 주문이 없습니다.</div>
          )}

          <div style={{ marginTop: 60, borderTop: "1px solid #000", paddingTop: 16, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
            <span>OrderCatch</span>
            <span>주문 확인용 내부 문서</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 드로어 내용 (데스크톱/모바일 공유) ──────────────────
function DrawerContent({
  dateLabel,
  orders,
  totalRevenue,
  onClose,
  onOrderClick,
  onPrint,
}: {
  dateLabel: string;
  orders: Order[];
  totalRevenue: number;
  onClose: () => void;
  onOrderClick: (o: Order) => void;
  onPrint: () => void;
}) {
  return (
    <>
      {/* 헤더 */}
      <div
        style={{
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* 날짜 정보 */}
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#111827",
                letterSpacing: "-0.03em",
              }}
            >
              {dateLabel}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6B7280",
                  background: "rgba(0,0,0,0.05)",
                  padding: "2px 10px",
                  borderRadius: 20,
                }}
              >
                {orders.length}건
              </span>
              {totalRevenue > 0 && (
                <span
                  style={{ fontSize: 14, fontWeight: 700, color: "#007aff" }}
                >
                  {totalRevenue.toLocaleString()}원
                </span>
              )}
            </div>
          </div>

          {/* 버튼들 */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={onPrint}
              title="이 날짜 주문서 출력"
              style={{
                background: "rgba(0,0,0,0.06)",
                border: "none",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "#374151",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(0,0,0,0.10)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(0,0,0,0.06)")
              }
            >
              🖨️ 출력
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(0,0,0,0.06)",
                border: "none",
                borderRadius: 10,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: "#6B7280",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(0,0,0,0.10)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(0,0,0,0.06)")
              }
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* 주문 목록 영역 */}
      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 24px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {orders.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "48px 0",
              color: "#9CA3AF",
            }}
          >
            <div style={{ fontSize: 40 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>이 날 주문이 없습니다</div>
            <div style={{ fontSize: 13 }}>다른 날짜를 선택해 보세요</div>
          </div>
        ) : (
          orders.map((order) => (
            <DrawerOrderCard
              key={order.id}
              order={order}
              onClick={() => onOrderClick(order)}
            />
          ))
        )}
      </div>
    </>
  );
}
