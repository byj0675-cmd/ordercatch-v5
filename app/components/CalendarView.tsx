"use client";

import { useState } from "react";
import { Order, STATUS_CONFIG } from "../lib/mockData";

interface CalendarViewProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onDayClick?: (date: Date) => void;
  selectedDay?: Date | null;
  onImageUpload?: (orderId: string, file: File) => Promise<void>;
}

// ── 날짜 유틸 ──────────────────────────────────────
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function formatDate(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ── 옵션 칩 ──────────────────────────────────────
function OptionChips({ options }: { options: Order["options"] }) {
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

// ── 주문 카드 (모바일용) ───────────────────────────
function OrderCard({ order, onClick, onImageUpload }: {
  order: Order;
  onClick: () => void;
  onImageUpload?: (file: File) => Promise<void>;
}) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
  const highlight = order.options.memo || order.options.custom;
  const imageUrl = order.options.imageUrl;
  const inputId = `img-${order.id}`;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onClick}
        className="order-card-btn"
        style={{
          width: "100%", textAlign: "left",
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.05)",
          borderRadius: 18, padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 8,
          cursor: "pointer",
          boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(79,70,229,0.10)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
      >
        {/* Row 1: 픽업시간 + 고객명 + 상태 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: imageUrl ? 92 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(79,70,229,0.07)", padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5" }}>🕐 {formatTime(order.pickupDate)}</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {order.customerName}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap", background: cfg?.bg || "#f1f5f9", color: cfg?.color || "#64748b" }}>
            {cfg?.label || "상태없음"}
          </span>
        </div>

        {/* Row 2: 상품명 + 금액 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, paddingRight: imageUrl ? 92 : 0 }}>
          <span style={{ fontSize: 13, color: "#475569", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {order.productName}
          </span>
          {order.amount > 0 && (
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", flexShrink: 0 }}>
              {order.amount.toLocaleString()}원
            </span>
          )}
        </div>

        {/* 요청사항 */}
        {highlight && (
          <div style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, padding: "7px 11px", fontSize: 12, color: "#334155", fontWeight: 500, lineHeight: 1.5 }}>
            💬 {highlight}
          </div>
        )}

        {/* 옵션 칩 */}
        <OptionChips options={order.options} />

        {/* 사진 추가 버튼 */}
        <label
          htmlFor={inputId}
          onClick={(e) => e.stopPropagation()}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer", padding: "4px 10px", borderRadius: 8, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)", transition: "all 0.15s", userSelect: "none", alignSelf: "flex-start" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(79,70,229,0.08)"; (e.currentTarget as HTMLElement).style.color = "#4f46e5"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(79,70,229,0.2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.color = "#64748b"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.06)"; }}
        >
          📷 {imageUrl ? "사진 변경" : "사진 추가"}
        </label>
      </button>

      {/* 썸네일 (카드 우측에 절대 배치) */}
      {imageUrl && (
        <div style={{ position: "absolute", top: 14, right: 14, width: 80, height: 80, borderRadius: 14, overflow: "hidden", border: "2px solid rgba(0,0,0,0.06)", pointerEvents: "none" }}>
          <img src={imageUrl} alt="주문 이미지" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {/* 파일 선택 인풋 */}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !onImageUpload) return;
          e.target.value = "";
          await onImageUpload(file);
        }}
      />
    </div>
  );
}

// ── 날짜 섹션 헤더 ────────────────────────────────
function DaySection({ label, sublabel, orders, onOrderClick, accent, onHeaderClick, onImageUpload }: {
  label: string;
  sublabel?: string;
  orders: Order[];
  onOrderClick: (o: Order) => void;
  accent?: string;
  onHeaderClick?: () => void;
  onImageUpload?: (orderId: string, file: File) => Promise<void>;
}) {
  const revenue = orders.reduce((s, o) => s + o.amount, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        onClick={onHeaderClick}
        style={{
          display: "flex", alignItems: "baseline", gap: 8,
          cursor: onHeaderClick ? "pointer" : "default",
          padding: "4px 0",
          borderRadius: 8,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (onHeaderClick) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)"; }}
        onMouseLeave={(e) => { if (onHeaderClick) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span style={{ fontSize: 16, fontWeight: 800, color: accent || "var(--text-primary)" }}>{label}</span>
        {sublabel && <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{sublabel}</span>}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginLeft: "auto" }}>
          {orders.length}건{revenue > 0 ? ` · ${revenue.toLocaleString()}원` : ""}
        </span>
        {onHeaderClick && (
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>상세 보기 ›</span>
        )}
      </div>
      {orders.length === 0 ? (
        <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "var(--text-tertiary)" }}>
          주문 없음
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.map(o => <OrderCard key={o.id} order={o} onClick={() => onOrderClick(o)} onImageUpload={onImageUpload ? (file) => onImageUpload(o.id, file) : undefined} />)}
        </div>
      )}
    </div>
  );
}

// ── 모바일 뷰 ─────────────────────────────────────
function MobileView({ orders, onOrderClick, onDayClick, onImageUpload }: CalendarViewProps) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // 날짜별 분류
  const todayOrders = orders.filter(o => isSameDay(new Date(o.pickupDate), today))
    .sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());
  const tomorrowOrders = orders.filter(o => isSameDay(new Date(o.pickupDate), tomorrow))
    .sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());

  // 이번 달 통계
  const thisMonth = orders.filter(o => {
    const d = new Date(o.pickupDate);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  });
  const monthRevenue = thisMonth.reduce((s, o) => s + o.amount, 0);

  // 이후 주문 (모레 이후)
  const afterTomorrow = orders.filter(o => {
    const d = new Date(o.pickupDate);
    return d > tomorrow && !isSameDay(d, tomorrow);
  }).sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());

  // 이후 주문을 날짜별로 그룹핑
  const upcomingByDay: { label: string; date: Date; orders: Order[] }[] = [];
  afterTomorrow.forEach(o => {
    const d = new Date(o.pickupDate);
    const label = formatDate(d);
    const existing = upcomingByDay.find(g => g.label === label);
    if (existing) existing.orders.push(o);
    else upcomingByDay.push({ label, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), orders: [o] });
  });

  return (
    <div style={{ padding: "16px" }}>

      {/* 이번 달 요약 배너 */}
      <div style={{
        background: "linear-gradient(135deg, #007aff, #5856d6)",
        borderRadius: 16, padding: "16px 20px", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        color: "#fff",
      }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
            {today.getMonth() + 1}월 누적 매출
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {monthRevenue > 0 ? `${monthRevenue.toLocaleString()}원` : "—"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>총 주문</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{thisMonth.length}건</div>
        </div>
      </div>

      {/* 오늘 */}
      <div style={{ marginBottom: 24 }}>
        <DaySection
          label="오늘"
          sublabel={formatDate(today)}
          orders={todayOrders}
          onOrderClick={onOrderClick}
          accent="#007aff"
          onHeaderClick={onDayClick ? () => onDayClick(new Date(today.getFullYear(), today.getMonth(), today.getDate())) : undefined}
          onImageUpload={onImageUpload}
        />
      </div>

      {/* 내일 */}
      <div style={{ marginBottom: 24 }}>
        <DaySection
          label="내일"
          sublabel={formatDate(tomorrow)}
          orders={tomorrowOrders}
          onOrderClick={onOrderClick}
          accent="#af52de"
          onHeaderClick={onDayClick ? () => onDayClick(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())) : undefined}
          onImageUpload={onImageUpload}
        />
      </div>

      {/* 이후 일정 */}
      {upcomingByDay.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.04em" }}>
            이후 일정
          </span>
          {upcomingByDay.map(group => (
            <DaySection
              key={group.label}
              label={group.label}
              orders={group.orders}
              onOrderClick={onOrderClick}
              onHeaderClick={onDayClick ? () => onDayClick(group.date) : undefined}
              onImageUpload={onImageUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 데스크톱 캘린더 뷰 ──────────────────────────────
function DesktopCalendar({ orders, onOrderClick, onDayClick, selectedDay }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (d: number) =>
    selectedDay !== null &&
    selectedDay !== undefined &&
    d === selectedDay.getDate() &&
    month === selectedDay.getMonth() &&
    year === selectedDay.getFullYear();

  const ordersByDay: Record<number, Order[]> = {};
  orders.forEach((order) => {
    const d = new Date(order.pickupDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!ordersByDay[day]) ordersByDay[day] = [];
      ordersByDay[day].push(order);
    }
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{year}년 {month + 1}월</h2>
          <span style={{ fontSize: 13, color: "var(--text-secondary)", background: "rgba(0,0,0,0.06)", padding: "3px 10px", borderRadius: 20 }}>{orders.length}건</span>
          {totalRevenue > 0 && <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{totalRevenue.toLocaleString()}원</span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost" onClick={goToday} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8 }}>오늘</button>
          <button className="btn btn-ghost" onClick={prevMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>‹</button>
          <button className="btn btn-ghost" onClick={nextMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>›</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
        {weekdays.map((w, i) => (
          <div key={w} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? "#ff3b30" : i === 6 ? "#007aff" : "var(--text-tertiary)" }}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flex: 1 }}>
        {cells.map((day, idx) => {
          const dayOrders = day ? (ordersByDay[day] || []) : [];
          const isSun = idx % 7 === 0;
          const isSat = idx % 7 === 6;
          const selected = day ? isSelected(day) : false;
          return (
            <div
              key={idx}
              onClick={() => {
                if (day && onDayClick) {
                  onDayClick(new Date(year, month, day));
                }
              }}
              style={{
                minHeight: 110,
                padding: "8px 6px 6px",
                borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid rgba(0,0,0,0.05)",
                borderBottom: idx < cells.length - 7 ? "1px solid rgba(0,0,0,0.05)" : "none",
                background: selected
                  ? "rgba(0,122,255,0.08)"
                  : day && isToday(day)
                  ? "rgba(0,122,255,0.04)"
                  : "transparent",
                cursor: day ? "pointer" : "default",
                transition: "background 0.15s",
                outline: selected ? "2px solid rgba(0,122,255,0.35)" : "none",
                outlineOffset: "-2px",
                borderRadius: selected ? 8 : 0,
              }}
              onMouseEnter={(e) => {
                if (day) (e.currentTarget as HTMLElement).style.background = selected ? "rgba(0,122,255,0.12)" : "rgba(0,0,0,0.03)";
              }}
              onMouseLeave={(e) => {
                if (day) (e.currentTarget as HTMLElement).style.background = selected ? "rgba(0,122,255,0.08)" : (isToday(day!) ? "rgba(0,122,255,0.04)" : "transparent");
              }}
            >
              {day && (
                <>
                  <div style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 13, fontWeight: isToday(day) ? 800 : 500, background: isToday(day) ? "var(--accent)" : "transparent", color: isToday(day) ? "#fff" : isSun ? "#ff3b30" : isSat ? "#007aff" : "var(--text-primary)", marginBottom: 4 }}>{day}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayOrders.slice(0, 3).map((order) => {
                      const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
                      const d = new Date(order.pickupDate);
                      const timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
                      return (
                        <button key={order.id} onClick={(e) => { e.stopPropagation(); onOrderClick(order); }} style={{ display: "block", width: "100%", padding: "3px 6px", borderRadius: 5, background: cfg?.bg || "#f3f4f6", border: "none", cursor: "pointer", textAlign: "left" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: cfg?.color || "#6b7280", lineHeight: 1.2 }}>{timeStr} {order.customerName}</div>
                          <div style={{ fontSize: 10, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{order.productName}</div>
                        </button>
                      );
                    })}
                    {dayOrders.length > 3 && <div style={{ fontSize: 10, color: "var(--text-tertiary)", padding: "1px 6px", fontWeight: 600 }}>+{dayOrders.length - 3}건 더보기</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────
export default function CalendarView({ orders, onOrderClick, onDayClick, selectedDay }: CalendarViewProps) {
  return (
    <>
      {/* 모바일 (768px 미만) */}
      <div className="mobile-only">
        <MobileView orders={orders} onOrderClick={onOrderClick} onDayClick={onDayClick} />
      </div>
      {/* 데스크톱 (768px 이상) */}
      <div className="desktop-only">
        <DesktopCalendar orders={orders} onOrderClick={onOrderClick} onDayClick={onDayClick} selectedDay={selectedDay} />
      </div>
    </>
  );
}
