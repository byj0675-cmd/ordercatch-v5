"use client";

import { useMemo } from "react";
import { Order, STATUS_CONFIG } from "../lib/mockData";

interface VerticalTimelineProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onAddOrder?: () => void;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
}

function isPersonal(order: Order) {
  return !!(order.options as any)?.isPersonal;
}
function getEventCfg(order: Order) {
  if (isPersonal(order)) return { bg: "#f8fafc", color: "#475569", dot: "#cbd5e1", label: "개인일정" };
  return STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
}
function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--:--";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface DayInfo {
  date: Date;
  key: string;
  relLabel: string | null;
  relColor: string;
  isToday: boolean;
  orders: Order[];
}

export default function VerticalTimeline({ orders, onOrderClick, onAddOrder, onStatusChange }: VerticalTimelineProps) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);

  const days = useMemo((): DayInfo[] => {
    const dow = ["일", "월", "화", "수", "목", "금", "토"];
    const result: DayInfo[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const isToday = i === 0;
      result.push({
        date: d, key, isToday,
        relLabel: i === 0 ? "오늘" : i === 1 ? "내일" : i === 2 ? "모레" : `${d.getMonth() + 1}/${d.getDate()} (${dow[d.getDay()]})`,
        relColor: i === 0 ? "#4f46e5" : i === 1 ? "#059669" : "#64748b",
        orders: [],
      });
    }
    // distribute orders
    orders.forEach(o => {
      const d = new Date(o.pickupDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const found = result.find(r => r.key === key);
      if (found) found.orders.push(o);
    });
    result.forEach(r => r.orders.sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime()));
    return result;
  }, [orders, today]);

  // Today stats
  const todayStats = useMemo(() => {
    const todayDay = days[0];
    const real = todayDay?.orders.filter(o => !isPersonal(o)) || [];
    return { count: real.length, revenue: real.reduce((s, o) => s + (o.amount || 0), 0) };
  }, [days]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "16px 18px 14px",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        background: "#fff",
        borderRadius: "20px 20px 0 0",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>30일 타임라인</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>오늘부터 30일 주문 흐름</div>
          </div>
          {onAddOrder && (
            <button
              onClick={onAddOrder}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#fff", border: "none", borderRadius: 12,
                padding: "9px 16px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 10px rgba(79,70,229,0.3)",
              }}
            >
              <span>✏️</span> 주문 등록
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: "rgba(79,70,229,0.06)", borderRadius: 10, padding: "9px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginBottom: 2 }}>오늘 픽업</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#4f46e5" }}>{todayStats.count}<span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 2, fontWeight: 500 }}>건</span></div>
          </div>
          <div style={{ flex: 1, background: "rgba(5,150,105,0.06)", borderRadius: 10, padding: "9px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginBottom: 2 }}>오늘 매출</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>{todayStats.revenue.toLocaleString()}<span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 2, fontWeight: 500 }}>원</span></div>
          </div>
        </div>
      </div>

      {/* Scrollable timeline */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 40px", background: "#fafafa", borderRadius: "0 0 20px 20px" }}>
        {days.map((day) => {
          const realOrders = day.orders.filter(o => !isPersonal(o));
          const dayRevenue = realOrders.reduce((s, o) => s + (o.amount || 0), 0);

          return (
            <div key={day.key} style={{ marginBottom: 6 }}>
              {/* Day header */}
              <div style={{
                position: "sticky",
                top: 0, zIndex: 5,
                background: day.isToday
                  ? "linear-gradient(90deg, #4f46e5, #7c3aed)"
                  : "rgba(248,250,252,0.96)",
                backdropFilter: "blur(8px)",
                borderRadius: 9,
                padding: "6px 12px",
                marginBottom: 5,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 800,
                  color: day.isToday ? "#fff" : "#374151",
                  flex: 1,
                }}>
                  {day.isToday ? `오늘 · ${day.date.getMonth() + 1}월 ${day.date.getDate()}일` : day.relLabel}
                </span>
                {realOrders.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: day.isToday ? "rgba(255,255,255,0.75)" : "#94a3b8" }}>
                    {realOrders.length}건{dayRevenue > 0 ? ` · ${dayRevenue.toLocaleString()}원` : ""}
                  </span>
                )}
              </div>

              {/* Orders */}
              {day.orders.length === 0 ? (
                <div style={{ padding: "6px 12px 10px", display: "flex", alignItems: "center", gap: 6, color: "#cbd5e1", fontSize: 11 }}>
                  <span>━</span> <span style={{ fontStyle: "italic" }}>주문 없음</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingBottom: 8 }}>
                  {day.orders.map(o => {
                    const cfg = getEventCfg(o);
                    const personal = isPersonal(o);
                    const quickStatuses = (["제작중", "픽업대기", "완료"] as Order["status"][])
                      .filter(s => s !== o.status).slice(0, 2);
                    return (
                      <button
                        key={o.id}
                        onClick={() => onOrderClick(o)}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 8,
                          background: personal ? "#f8fafc" : "#fff",
                          border: "1px solid rgba(0,0,0,0.05)",
                          borderLeft: personal ? "4px solid #cbd5e1" : `4px solid ${cfg?.dot || "#e5e7eb"}`,
                          borderRadius: 10, padding: "9px 11px",
                          cursor: "pointer", textAlign: "left", width: "100%",
                          transition: "box-shadow 0.15s, transform 0.15s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(79,70,229,0.10)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                      >
                        {/* Time */}
                        <span style={{ fontSize: 11, fontWeight: 700, color: personal ? "#94a3b8" : "#4f46e5", minWidth: 38, flexShrink: 0, marginTop: 1 }}>
                          {formatTime(o.pickupDate)}
                        </span>
                        {/* Info */}
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {personal ? "📅 " : ""}{o.customerName}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: cfg?.bg || "#f3f4f6", color: cfg?.color || "#6b7280", flexShrink: 0 }}>
                              {cfg?.label || o.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {o.productName}
                          </div>
                          {!personal && onStatusChange && quickStatuses.length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 5 }} onClick={e => e.stopPropagation()}>
                              {quickStatuses.map(s => {
                                const sc = STATUS_CONFIG[s] || {};
                                return (
                                  <button key={s} onClick={(e) => { e.stopPropagation(); onStatusChange(o.id, s); }}
                                    style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: sc?.bg || "#f3f4f6", color: sc?.color || "#6b7280", border: "none", cursor: "pointer" }}>
                                    → {sc?.label || s}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {/* Amount */}
                        {!personal && o.amount > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", flexShrink: 0 }}>
                            {o.amount.toLocaleString()}원
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
