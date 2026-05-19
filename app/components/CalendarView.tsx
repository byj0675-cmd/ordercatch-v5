"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, useAnimation } from "framer-motion";
import { Order, STATUS_CONFIG } from "../lib/mockData";

// ── 날짜 유틸 ──────────────────────────────────────────
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Props ─────────────────────────────────────────────
interface CalendarViewProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onDayClick?: (date: Date) => void;
  selectedDay?: Date | null;
  onImageUpload?: (orderId: string, file: File) => Promise<void>;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
}

function isPersonalEvent(order: Order) {
  return !!order.options.isPersonal;
}
function getEventCfg(order: Order) {
  if (isPersonalEvent(order)) {
    return { bg: "rgba(100,116,139,0.1)", color: "#475569", dot: "#94a3b8", label: "개인일정" };
  }
  return STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
}

// ── SVG Icons ─────────────────────────────────────────
function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

// ── 주문 카드 (compact) ────────
function OrderCard({ order, onClick, onStatusChange }: {
  order: Order;
  onClick: () => void;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
}) {
  const cfg = getEventCfg(order);
  const isPersonal = isPersonalEvent(order);
  const imageUrl = order.options.imageUrl;
  const controls = useAnimation();
  const [dragAction, setDragAction] = useState<"call" | "complete" | null>(null);

  const handleDrag = (_: any, info: any) => {
    const x = info.offset.x;
    if (x > 50) setDragAction("call");
    else if (x < -50 && order.status !== "완료") setDragAction("complete");
    else setDragAction(null);
  };

  const handleDragEnd = async (_: any, info: any) => {
    const x = info.offset.x;
    if (x > 80 && order.phone) {
      const a = document.createElement("a");
      a.href = `tel:${order.phone}`;
      a.click();
      controls.start({ x: 0 });
    } else if (x < -80 && onStatusChange && order.status !== "완료") {
      onStatusChange(order.id, "완료");
      await controls.start({ x: -400, opacity: 0, transition: { duration: 0.25 } });
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 22 } });
    }
    setDragAction(null);
  };

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 8 }}>
      {/* Swipe reveal */}
      <div style={{
        position: "absolute", inset: 0,
        background: dragAction === "call" ? "#10b981" : dragAction === "complete" ? "#4f46e5" : "#e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
      }}>
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, opacity: dragAction === "call" ? 1 : 0.5, display: "flex", alignItems: "center", gap: 4 }}>
          <IconPhone /> 전화
        </span>
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, opacity: dragAction === "complete" ? 1 : 0.5, display: "flex", alignItems: "center", gap: 4 }}>
          완료 <IconCheck />
        </span>
      </div>

      <motion.div
        onTap={onClick}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ touchAction: "pan-y", zIndex: 10, position: "relative",
          background: "#fff", borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Left: time pill */}
          <div style={{ flexShrink: 0, textAlign: "center", minWidth: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#4f46e5" }}>
              {formatTime(order.pickupDate)}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 36, background: "#f1f5f9", flexShrink: 0 }} />

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isPersonal ? order.productName : order.customerName}
              </span>
            </div>
            {!isPersonal && (
              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {order.productName}
              </div>
            )}
          </div>

          {/* Status chip */}
          <div style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── 모바일 뷰 ──────────
function MobileView({ orders, onOrderClick, onStatusChange }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const stripRef = useRef<HTMLDivElement>(null);
  const todayBtnRef = useRef<HTMLButtonElement>(null);

  // 날짜 범위: 오늘 기준 -7 ~ +21
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = -7; i <= 21; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const todayIndex = 7; // -7부터 시작하므로 오늘은 index 7

  // 오늘 버튼 클릭 시 → 선택 날짜를 오늘로 + 스트립 스크롤을 오늘로
  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
    // 스트립에서 오늘 버튼 위치로 스크롤
    if (stripRef.current) {
      const buttons = stripRef.current.querySelectorAll("button");
      const btn = buttons[todayIndex] as HTMLElement | undefined;
      if (btn) {
        btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [todayIndex]);

  // 처음 마운트 시 오늘 날짜가 화면 중앙에 오도록
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (stripRef.current) {
        const buttons = stripRef.current.querySelectorAll("button");
        const btn = buttons[todayIndex] as HTMLElement | undefined;
        if (btn) btn.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [todayIndex]);

  const filteredOrders = useMemo(() =>
    orders
      .filter((o) => isSameDay(new Date(o.pickupDate), selectedDate))
      .sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime()),
    [orders, selectedDate]
  );

  // 날짜별 주문 있는지 dot 표시용
  const hasOrders = useCallback((date: Date) =>
    orders.some((o) => isSameDay(new Date(o.pickupDate), date)),
    [orders]
  );

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", background: "#f8fafc" }}>

      {/* ── Compact Sticky Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(248,250,252,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        paddingBottom: 8,
        borderBottom: "1px solid rgba(0,0,0,0.05)",
      }}>
        {/* 날짜 + 오늘 버튼 */}
        <div style={{ padding: "14px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#4f46e5", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
              Schedule
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
              <span style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", marginLeft: 6 }}>
                ({dayNames[selectedDate.getDay()]})
              </span>
            </div>
          </div>
          <button
            ref={todayBtnRef}
            onClick={goToToday}
            style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: "#fff",
              border: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#64748b",
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
            title="오늘로"
          >
            <IconClock />
          </button>
        </div>

        {/* Week Strip — horizontal scroll */}
        <div
          ref={stripRef}
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: "4px 20px 4px",
            scrollbarWidth: "none",
          }}
          className="no-scrollbar"
        >
          {weekDates.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            const hasDot = hasOrders(date);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                style={{
                  flexShrink: 0,
                  width: 44, height: 62,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 2,
                  borderRadius: 14,
                  border: isToday && !isSelected ? "1.5px solid #c7d2fe" : "1.5px solid transparent",
                  background: isSelected ? "#4f46e5" : "#fff",
                  color: isSelected ? "#fff" : "#475569",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 4px 12px rgba(79,70,229,0.25)" : "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", opacity: isSelected ? 0.7 : 0.5, textTransform: "uppercase" }}>
                  {["일","월","화","수","목","금","토"][date.getDay()]}
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>
                  {date.getDate()}
                </span>
                {/* Order dot */}
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: hasDot ? (isSelected ? "rgba(255,255,255,0.7)" : "#4f46e5") : "transparent" }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Order List ── */}
      <div style={{ flex: 1, padding: "16px 16px 120px" }}>
        {filteredOrders.length > 0 ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 4 }}>
              {filteredOrders.length}건의 주문
            </div>
            {filteredOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onClick={() => onOrderClick(o)}
                onStatusChange={onStatusChange}
              />
            ))}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, opacity: 0.35 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#475569", margin: 0 }}>이날은 주문이 없어요</p>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>여유로운 하루예요</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 데스크톱 뷰 ──────────
function DesktopView({ orders, onOrderClick, onDayClick, selectedDay }: CalendarViewProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getDayOrders = (day: number) =>
    orders.filter((o) => {
      const d = new Date(o.pickupDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="p-8 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black text-slate-900">{year}년 {month + 1}월</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setViewDate(new Date(year, month - 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600">‹</button>
            <button onClick={() => setViewDate(new Date())} className="px-4 py-2 hover:bg-white rounded-lg transition-all text-xs font-black text-slate-900">오늘</button>
            <button onClick={() => setViewDate(new Date(year, month + 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600">›</button>
          </div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-7 border-t border-slate-50">
        {["일","월","화","수","목","금","토"].map(w => (
          <div key={w} className="py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">{w}</div>
        ))}
      </div>
      <div className="flex-[10] grid grid-cols-7 border-t border-slate-50">
        {cells.map((day, i) => {
          const dayOrders = day ? getDayOrders(day) : [];
          const isSelected = day ? (selectedDay && isSameDay(new Date(year, month, day), selectedDay)) : false;
          const isToday = day ? isSameDay(new Date(year, month, day), new Date()) : false;
          return (
            <div
              key={i}
              onClick={() => day && onDayClick && onDayClick(new Date(year, month, day))}
              className={`min-h-[120px] p-2 border-r border-b border-slate-50 transition-all cursor-pointer hover:bg-slate-50/50 ${isSelected ? "bg-indigo-50/50 ring-2 ring-indigo-200 ring-inset" : ""} ${day === null ? "bg-slate-50/20" : ""}`}
            >
              {day && (
                <>
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black mb-2 ${isToday ? "bg-indigo-600 text-white" : "text-slate-900"}`}>
                    {day}
                  </span>
                  <div className="space-y-1">
                    {dayOrders.slice(0, 3).map((o) => {
                      const cfg = getEventCfg(o);
                      return (
                        <div key={o.id} className="text-[10px] font-bold px-2 py-1 rounded-md truncate" style={{ background: cfg.bg, color: cfg.color }}>
                          {formatTime(o.pickupDate)} {isPersonalEvent(o) ? o.productName : o.customerName}
                        </div>
                      );
                    })}
                    {dayOrders.length > 3 && <div className="text-[10px] font-black text-slate-400 px-2">+{dayOrders.length - 3}건</div>}
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

// ── Main Export ──────────────────────────
export default function CalendarView(props: CalendarViewProps) {
  return (
    <>
      <div className="xl:hidden">
        <MobileView {...props} />
      </div>
      <div className="hidden xl:block h-full">
        <DesktopView {...props} />
      </div>
    </>
  );
}
