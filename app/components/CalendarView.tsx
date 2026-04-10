"use client";

import { useState } from "react";
import { Order, STATUS_CONFIG } from "../lib/mockData";

interface CalendarViewProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
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

// ── 주문 카드 (모바일용) ───────────────────────────
function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["입금대기"];
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left", background: "#fff",
        border: `1px solid ${cfg.color}33`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 12, padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 4,
        cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
          {order.customerName}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
          background: cfg.bg, color: cfg.color,
        }}>
          {cfg.label}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {order.productName}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          🕐 {formatTime(order.pickupDate)}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          {order.amount > 0 ? `${order.amount.toLocaleString()}원` : ""}
        </span>
      </div>
    </button>
  );
}

// ── 날짜 섹션 헤더 ────────────────────────────────
function DaySection({ label, sublabel, orders, onOrderClick, accent }: {
  label: string;
  sublabel?: string;
  orders: Order[];
  onOrderClick: (o: Order) => void;
  accent?: string;
}) {
  const revenue = orders.reduce((s, o) => s + o.amount, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: accent || "var(--text-primary)" }}>{label}</span>
        {sublabel && <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{sublabel}</span>}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginLeft: "auto" }}>
          {orders.length}건{revenue > 0 ? ` · ${revenue.toLocaleString()}원` : ""}
        </span>
      </div>
      {orders.length === 0 ? (
        <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "var(--text-tertiary)" }}>
          주문 없음
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.map(o => <OrderCard key={o.id} order={o} onClick={() => onOrderClick(o)} />)}
        </div>
      )}
    </div>
  );
}

// ── 모바일 뷰 ─────────────────────────────────────
function MobileView({ orders, onOrderClick }: CalendarViewProps) {
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
  const upcomingByDay: { label: string; orders: Order[] }[] = [];
  afterTomorrow.forEach(o => {
    const d = new Date(o.pickupDate);
    const label = formatDate(d);
    const existing = upcomingByDay.find(g => g.label === label);
    if (existing) existing.orders.push(o);
    else upcomingByDay.push({ label, orders: [o] });
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 데스크톱 캘린더 뷰 (기존 유지) ──────────────────
function DesktopCalendar({ orders, onOrderClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
          return (
            <div key={idx} style={{ minHeight: 110, padding: "8px 6px 6px", borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid rgba(0,0,0,0.05)", borderBottom: idx < cells.length - 7 ? "1px solid rgba(0,0,0,0.05)" : "none", background: day && isToday(day) ? "rgba(0,122,255,0.04)" : "transparent" }}>
              {day && (
                <>
                  <div style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 13, fontWeight: isToday(day) ? 800 : 500, background: isToday(day) ? "var(--accent)" : "transparent", color: isToday(day) ? "#fff" : isSun ? "#ff3b30" : isSat ? "#007aff" : "var(--text-primary)", marginBottom: 4 }}>{day}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayOrders.slice(0, 3).map((order) => {
                      const cfg = STATUS_CONFIG[order.status];
                      const d = new Date(order.pickupDate);
                      const timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
                      return (
                        <button key={order.id} onClick={() => onOrderClick(order)} style={{ display: "block", width: "100%", padding: "3px 6px", borderRadius: 5, background: cfg.bg, border: "none", cursor: "pointer", textAlign: "left" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, lineHeight: 1.2 }}>{timeStr} {order.customerName}</div>
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
export default function CalendarView({ orders, onOrderClick }: CalendarViewProps) {
  return (
    <>
      {/* 모바일 (768px 미만) */}
      <div className="mobile-only">
        <MobileView orders={orders} onOrderClick={onOrderClick} />
      </div>
      {/* 데스크톱 (768px 이상) */}
      <div className="desktop-only">
        <DesktopCalendar orders={orders} onOrderClick={onOrderClick} />
      </div>
    </>
  );
}
