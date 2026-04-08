"use client";

import { useState } from "react";
import { Order, STATUS_CONFIG, SOURCE_CONFIG } from "../lib/mockData";

interface CalendarViewProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
}

export default function CalendarView({ orders, onOrderClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Group orders by day of month
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

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Calendar Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            {year}년 {month + 1}월
          </h2>
          <span style={{ fontSize: 13, color: "var(--text-secondary)", background: "rgba(0,0,0,0.06)", padding: "3px 10px", borderRadius: 20 }}>
            {orders.length}건
          </span>
          {orders.length > 0 && (
            <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
              {totalRevenue.toLocaleString()}원
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost" onClick={goToday} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8 }}>
            오늘
          </button>
          <button className="btn btn-ghost" onClick={prevMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>
            ‹
          </button>
          <button className="btn btn-ghost" onClick={nextMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>
            ›
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {weekdays.map((w, i) => (
          <div
            key={w}
            style={{
              padding: "10px 0",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              color: i === 0 ? "#ff3b30" : i === 6 ? "#007aff" : "var(--text-tertiary)",
              letterSpacing: "0.02em",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          flex: 1,
        }}
      >
        {cells.map((day, idx) => {
          const dayOrders = day ? (ordersByDay[day] || []) : [];
          const isSun = idx % 7 === 0;
          const isSat = idx % 7 === 6;

          return (
            <div
              key={idx}
              style={{
                minHeight: 110,
                padding: "8px 6px 6px",
                borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid rgba(0,0,0,0.05)",
                borderBottom: idx < cells.length - 7 ? "1px solid rgba(0,0,0,0.05)" : "none",
                background: day && isToday(day) ? "rgba(0,122,255,0.04)" : "transparent",
                transition: "background 0.15s",
              }}
            >
              {day && (
                <>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      fontSize: 13,
                      fontWeight: isToday(day) ? 800 : 500,
                      background: isToday(day) ? "var(--accent)" : "transparent",
                      color: isToday(day)
                        ? "#fff"
                        : isSun
                        ? "#ff3b30"
                        : isSat
                        ? "#007aff"
                        : "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {day}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayOrders.slice(0, 3).map((order) => {
                      const cfg = STATUS_CONFIG[order.status];
                      const pickupD = new Date(order.pickupDate);
                      const hh = pickupD.getHours();
                      const mm = pickupD.getMinutes();
                      const timeStr = `${hh}:${String(mm).padStart(2, "0")}`;
                      return (
                        <button
                          key={order.id}
                          onClick={() => onOrderClick(order)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "3px 6px",
                            borderRadius: 5,
                            background: cfg.bg,
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.filter = "brightness(0.92)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.filter = "none";
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, lineHeight: 1.2 }}>
                            {timeStr} {order.customerName}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--text-secondary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              lineHeight: 1.3,
                              maxWidth: "100%",
                            }}
                          >
                            {order.productName}
                          </div>
                        </button>
                      );
                    })}
                    {dayOrders.length > 3 && (
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)", padding: "1px 6px", fontWeight: 600 }}>
                        +{dayOrders.length - 3}건 더보기
                      </div>
                    )}
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
