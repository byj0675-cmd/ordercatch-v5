"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Order, STATUS_CONFIG } from "../lib/mockData";
import { showToast } from "./Toast";

// ── 날짜 유틸 ──────────────────────────────────────────
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function formatDate(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
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

// ── 개인 일정 여부 체크 ────────────────────────────────
function isPersonalEvent(order: Order) {
  return !!(order.options as any)?.isPersonal;
}

// ── 이벤트 스타일 (개인일정 vs 주문) ──────────────────
function getEventCfg(order: Order) {
  if (isPersonalEvent(order)) {
    return { bg: "rgba(100,116,139,0.1)", color: "#475569", dot: "#94a3b8", label: "개인일정" };
  }
  return STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
}

// ── 옵션 칩 ────────────────────────────────────────────
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
  if (!chips.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {chips.map((c, i) => (
        <span key={i} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: "rgba(79,70,229,0.07)", color: "#4f46e5", fontWeight: 600 }}>{c}</span>
      ))}
    </div>
  );
}

// ── 주문 카드 (모바일) ──────────────────────────────────
function OrderCard({ order, onClick, onImageUpload, onStatusChange }: {
  order: Order; onClick: () => void;
  onImageUpload?: (file: File) => Promise<void>;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
}) {
  const cfg = getEventCfg(order);
  const highlight = order.options.memo || order.options.custom;
  const imageUrl = order.options.imageUrl;
  const inputId = `img-${order.id}`;
  const isPersonal = isPersonalEvent(order);

  // 스와이프 상태
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const didSwipe = useRef(false);
  const [swipeHint, setSwipeHint] = useState<"left" | "right" | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    didSwipe.current = false;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 70 && Math.abs(dx) > dy * 1.5 && !isPersonal) {
      didSwipe.current = true;
      setSwipeHint(null);
      if (dx < 0 && onStatusChange && order.status !== "완료") {
        onStatusChange(order.id, "완료");
        showToast("✅ 완료 처리됐습니다", "success");
      } else if (dx > 0 && order.phone) {
        window.location.href = `tel:${order.phone.replace(/[^0-9+]/g, "")}`;
      }
    } else {
      setSwipeHint(null);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPersonal) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 20 && Math.abs(dx) > dy) {
      setSwipeHint(dx < 0 ? "left" : "right");
    } else {
      setSwipeHint(null);
    }
  };

  const handleClick = () => {
    if (didSwipe.current) { didSwipe.current = false; return; }
    onClick();
  };

  // 퀵 상태 변경 대상 (현재 상태 제외, 최대 2개)
  const quickStatuses = (["제작중", "픽업대기", "완료"] as Order["status"][]).filter(s => s !== order.status).slice(0, 2);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 18 }}>
      {/* Swipe hint overlays */}
      {swipeHint === "left" && !isPersonal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,150,105,0.12)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 20, zIndex: 1, pointerEvents: "none" }}>
          <span style={{ fontSize: 28 }}>✅</span>
        </div>
      )}
      {swipeHint === "right" && !isPersonal && order.phone && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(37,99,235,0.10)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 20, zIndex: 1, pointerEvents: "none" }}>
          <span style={{ fontSize: 28 }}>📞</span>
        </div>
      )}
      <button
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="order-card-btn"
        style={{
          width: "100%", textAlign: "left",
          background: isPersonal ? "rgba(100,116,139,0.04)" : "#fff",
          border: `1px solid ${isPersonal ? "rgba(100,116,139,0.15)" : "rgba(0,0,0,0.05)"}`,
          borderRadius: 18, padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 8,
          cursor: "pointer",
          boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(79,70,229,0.10)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
      >
        {/* Row 1: 시간 + 이름 + 상태 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: imageUrl ? 92 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: isPersonal ? "rgba(100,116,139,0.1)" : "rgba(79,70,229,0.07)", padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isPersonal ? "#64748b" : "#4f46e5" }}>
              {isPersonal ? "📅" : "🕐"} {formatTime(order.pickupDate)}
            </span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {order.customerName === "개인일정" ? order.productName : order.customerName}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap", background: cfg?.bg || "#f1f5f9", color: cfg?.color || "#64748b" }}>
            {isPersonal ? "개인일정" : (cfg?.label || "상태없음")}
          </span>
        </div>

        {/* Row 2: 상품명 + 금액 */}
        {!isPersonal && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, paddingRight: imageUrl ? 92 : 0 }}>
            <span style={{ fontSize: 13, color: "#475569", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {order.productName}
            </span>
            {order.amount > 0 && (
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", flexShrink: 0 }}>{order.amount.toLocaleString()}원</span>
            )}
          </div>
        )}

        {/* 메모 */}
        {highlight && (
          <div style={{ background: "#f8fafc", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, padding: "7px 11px", fontSize: 12, color: "#334155", fontWeight: 500, lineHeight: 1.5 }}>
            {isPersonal ? "📋" : "💬"} {highlight}
          </div>
        )}

        <OptionChips options={order.options} />

        {/* 퀵 상태 변경 버튼 */}
        {!isPersonal && onStatusChange && quickStatuses.length > 0 && (
          <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
            {quickStatuses.map(s => {
              const sc = STATUS_CONFIG[s] || {};
              return (
                <button key={s} onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, s); }} style={{
                  padding: "4px 10px", borderRadius: 20, border: `1px solid ${sc.dot || "#e2e8f0"}`,
                  background: sc.bg || "#f1f5f9", color: sc.color || "#64748b",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                  WebkitTapHighlightColor: "transparent",
                } as React.CSSProperties}>
                  → {sc.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 사진 추가 (주문만) */}
        {!isPersonal && (
          <label htmlFor={inputId} onClick={(e) => e.stopPropagation()} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 12, fontWeight: 700, color: "#4f46e5", cursor: "pointer",
            padding: "5px 12px", borderRadius: 10,
            background: "rgba(79,70,229,0.08)", border: "1.5px solid rgba(79,70,229,0.18)",
            transition: "all 0.15s", userSelect: "none", alignSelf: "flex-start",
            WebkitTapHighlightColor: "transparent",
          } as React.CSSProperties}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(79,70,229,0.15)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(79,70,229,0.08)"; }}>
            📸 {imageUrl ? "사진 변경" : "사진 추가"}
          </label>
        )}
      </button>

      {imageUrl && (
        <div style={{ position: "absolute", top: 14, right: 14, width: 80, height: 80, borderRadius: 14, overflow: "hidden", border: "2px solid rgba(0,0,0,0.06)", pointerEvents: "none" }}>
          <Image src={imageUrl} alt="주문 이미지" fill sizes="80px" style={{ objectFit: "cover" }} />
        </div>
      )}

      <input id={inputId} type="file" accept="image/*" style={{ display: "none" }}
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

// ── 날짜 섹션 ────────────────────────────────────────────
function DaySection({ label, sublabel, orders, onOrderClick, accent, onHeaderClick, onImageUpload, onStatusChange }: {
  label: string; sublabel?: string; orders: Order[];
  onOrderClick: (o: Order) => void; accent?: string;
  onHeaderClick?: () => void;
  onImageUpload?: (orderId: string, file: File) => Promise<void>;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
}) {
  const revenue = orders.filter(o => !isPersonalEvent(o)).reduce((s, o) => s + o.amount, 0);
  const orderCount = orders.filter(o => !isPersonalEvent(o)).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div onClick={onHeaderClick} style={{ display: "flex", alignItems: "baseline", gap: 8, cursor: onHeaderClick ? "pointer" : "default", padding: "4px 0", borderRadius: 8, transition: "background 0.15s" }}
        onMouseEnter={(e) => { if (onHeaderClick) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)"; }}
        onMouseLeave={(e) => { if (onHeaderClick) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: accent || "var(--text-primary)" }}>{label}</span>
        {sublabel && <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{sublabel}</span>}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginLeft: "auto" }}>
          {orderCount}건{revenue > 0 ? ` · ${revenue.toLocaleString()}원` : ""}
        </span>
        {onHeaderClick && <span style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>상세 보기 ›</span>}
      </div>
      {orders.length === 0 ? (
        <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: "var(--text-tertiary)" }}>주문 없음</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.map(o => (
            <OrderCard key={o.id} order={o} onClick={() => onOrderClick(o)}
              onImageUpload={onImageUpload ? (file) => onImageUpload(o.id, file) : undefined}
              onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 월 선택 팝업 ────────────────────────────────────────
function MonthPickerSheet({ currentYear, currentMonth, onSelect, onClose }: {
  currentYear: number; currentMonth: number;
  onSelect: (y: number, m: number) => void; onClose: () => void;
}) {
  const [pickerYear, setPickerYear] = useState(currentYear);
  const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  const navBtn: React.CSSProperties = { minWidth: 44, minHeight: 44, background: "rgba(0,0,0,0.05)", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px" }} className="animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "rgba(0,0,0,0.12)", borderRadius: 4, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button onClick={() => setPickerYear(y => y - 1)} style={navBtn}>‹</button>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{pickerYear}년</span>
          <button onClick={() => setPickerYear(y => y + 1)} style={navBtn}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {MONTHS.map((m, i) => {
            const sel = pickerYear === currentYear && i === currentMonth;
            return (
              <button key={i} onClick={() => onSelect(pickerYear, i)} style={{ padding: "14px 0", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, background: sel ? "var(--accent)" : "rgba(0,0,0,0.04)", color: sel ? "#fff" : "var(--text-primary)", transition: "all 0.15s" }}>{m}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 모바일 뷰 ────────────────────────────────────────────
function MobileView({ orders, onOrderClick, onDayClick, onImageUpload, onStatusChange }: CalendarViewProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [showPicker, setShowPicker] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleTouchStart = (e: React.TouchEvent) => { touchStartXRef.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) diff > 0 ? nextMonth() : prevMonth();
    touchStartXRef.current = null;
  };

  const monthOrders = orders.filter(o => {
    const d = new Date(o.pickupDate);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());

  const monthRevenue = monthOrders.filter(o => !isPersonalEvent(o)).reduce((s, o) => s + o.amount, 0);
  const monthOrderCount = monthOrders.filter(o => !isPersonalEvent(o)).length;

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayOrders = monthOrders.filter(o => isSameDay(new Date(o.pickupDate), today));
  const tomorrowOrders = monthOrders.filter(o => isSameDay(new Date(o.pickupDate), tomorrow));
  const afterTomorrow = monthOrders.filter(o => {
    const d = new Date(o.pickupDate);
    return d > tomorrow && !isSameDay(d, tomorrow);
  });
  const upcomingByDay: { label: string; date: Date; orders: Order[] }[] = [];
  afterTomorrow.forEach(o => {
    const d = new Date(o.pickupDate);
    const label = formatDate(d);
    const ex = upcomingByDay.find(g => g.label === label);
    if (ex) ex.orders.push(o);
    else upcomingByDay.push({ label, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), orders: [o] });
  });

  const byDay: { label: string; date: Date; orders: Order[] }[] = [];
  if (!isCurrentMonth) {
    monthOrders.forEach(o => {
      const d = new Date(o.pickupDate);
      const label = formatDate(d);
      const ex = byDay.find(g => g.label === label);
      if (ex) ex.orders.push(o);
      else byDay.push({ label, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), orders: [o] });
    });
  }

  const navBtnStyle: React.CSSProperties = { minWidth: 44, minHeight: 44, background: "rgba(0,0,0,0.05)", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" };

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ WebkitUserSelect: "none", userSelect: "none", overflowX: "hidden" } as React.CSSProperties}>
      {/* 월 내비게이션 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <button onClick={() => setShowPicker(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>{viewYear}년 {viewMonth + 1}월</span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", background: "rgba(0,0,0,0.06)", borderRadius: 6, padding: "2px 6px" }}>▾ 선택</span>
        </button>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* 슬림 매출 배너 */}
      <div style={{ background: "linear-gradient(135deg, #007aff, #5856d6)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>{viewMonth + 1}월 누적 매출</div>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{monthRevenue > 0 ? `${monthRevenue.toLocaleString()}원` : "—"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>총 주문</div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{monthOrderCount}건</div>
          </div>
          {!isCurrentMonth && (
            <button onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "5px 10px", cursor: "pointer" } as React.CSSProperties}>
              오늘로
            </button>
          )}
        </div>
      </div>

      {/* 주문 목록 */}
      <div style={{ padding: "16px 16px 8px" }}>
        {monthOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 40 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>{viewMonth + 1}월 주문이 없습니다</div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>좌우로 스와이프해서 다른 달을 확인하세요</div>
          </div>
        ) : isCurrentMonth ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <DaySection label="오늘" sublabel={formatDate(today)} orders={todayOrders} onOrderClick={onOrderClick} accent="#007aff"
              onHeaderClick={onDayClick ? () => onDayClick(new Date(today.getFullYear(), today.getMonth(), today.getDate())) : undefined}
              onImageUpload={onImageUpload} onStatusChange={onStatusChange} />
            <DaySection label="내일" sublabel={formatDate(tomorrow)} orders={tomorrowOrders} onOrderClick={onOrderClick} accent="#af52de"
              onHeaderClick={onDayClick ? () => onDayClick(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())) : undefined}
              onImageUpload={onImageUpload} onStatusChange={onStatusChange} />
            {upcomingByDay.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>이후 일정</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {upcomingByDay.map(g => (
                    <DaySection key={g.label} label={g.label} orders={g.orders} onOrderClick={onOrderClick}
                      onHeaderClick={onDayClick ? () => onDayClick(g.date) : undefined}
                      onImageUpload={onImageUpload} onStatusChange={onStatusChange} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {byDay.map(g => (
              <DaySection key={g.label} label={g.label} orders={g.orders} onOrderClick={onOrderClick}
                onHeaderClick={onDayClick ? () => onDayClick(g.date) : undefined}
                onImageUpload={onImageUpload} onStatusChange={onStatusChange} />
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "8px 0 16px", fontSize: 11, color: "var(--text-tertiary)" }}>← 좌우 스와이프로 달 이동 →</div>

      {showPicker && (
        <MonthPickerSheet currentYear={viewYear} currentMonth={viewMonth}
          onSelect={(y, m) => { setViewDate(new Date(y, m, 1)); setShowPicker(false); }}
          onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}

// ── 데스크톱 캘린더 ──────────────────────────────────────
function DesktopCalendar({ orders, onOrderClick, onDayClick, selectedDay }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (d: number) => selectedDay != null && d === selectedDay.getDate() && month === selectedDay.getMonth() && year === selectedDay.getFullYear();

  const ordersByDay: Record<number, Order[]> = {};
  orders.forEach((order) => {
    const d = new Date(order.pickupDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!ordersByDay[day]) ordersByDay[day] = [];
      ordersByDay[day].push(order);
    }
  });

  const monthOrders = Object.values(ordersByDay).flat();
  const monthRevenue = monthOrders.filter(o => !isPersonalEvent(o)).reduce((s, o) => s + o.amount, 0);
  const monthOrderCount = monthOrders.filter(o => !isPersonalEvent(o)).length;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{year}년 {month + 1}월</h2>
          <span style={{ fontSize: 13, color: "var(--text-secondary)", background: "rgba(0,0,0,0.06)", padding: "3px 10px", borderRadius: 20 }}>{monthOrderCount}건</span>
          {monthRevenue > 0 && <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{monthRevenue.toLocaleString()}원</span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost" onClick={goToday} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8 }}>오늘</button>
          <button className="btn btn-ghost" onClick={prevMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>‹</button>
          <button className="btn btn-ghost" onClick={nextMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>›</button>
        </div>
      </div>

      {/* 요일 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
        {weekdays.map((w, i) => (
          <div key={w} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? "#ff3b30" : i === 6 ? "#007aff" : "var(--text-tertiary)" }}>{w}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flex: 1, position: "relative" }}>
        {monthOrders.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none", zIndex: 2 }}>
            <div style={{ fontSize: 36 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>{month + 1}월 주문이 없습니다</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>‹ 버튼으로 이전 달을 확인하세요</div>
          </div>
        )}

        {cells.map((day, idx) => {
          const dayOrders = day ? (ordersByDay[day] || []) : [];
          const isSun = idx % 7 === 0;
          const isSat = idx % 7 === 6;
          const selected = day ? isSelected(day) : false;
          // 상태별 스마트 칩 (최대 2개 + 더보기)
          const visibleOrders = dayOrders.slice(0, 2);
          const hiddenCount = dayOrders.length - 2;

          return (
            <div
              key={idx}
              onClick={() => { if (day && onDayClick) onDayClick(new Date(year, month, day)); }}
              style={{
                minHeight: 110, padding: "8px 6px 6px",
                borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid rgba(0,0,0,0.05)",
                borderBottom: idx < cells.length - 7 ? "1px solid rgba(0,0,0,0.05)" : "none",
                background: selected ? "rgba(0,122,255,0.08)" : day && isToday(day) ? "rgba(0,122,255,0.04)" : "transparent",
                cursor: day ? "pointer" : "default", transition: "background 0.15s",
                outline: selected ? "2px solid rgba(0,122,255,0.35)" : "none", outlineOffset: "-2px",
                borderRadius: selected ? 8 : 0,
              }}
              onMouseEnter={(e) => { if (day) (e.currentTarget as HTMLElement).style.background = selected ? "rgba(0,122,255,0.12)" : "rgba(0,0,0,0.03)"; }}
              onMouseLeave={(e) => { if (day) (e.currentTarget as HTMLElement).style.background = selected ? "rgba(0,122,255,0.08)" : (isToday(day!) ? "rgba(0,122,255,0.04)" : "transparent"); }}
            >
              {day && (
                <>
                  {/* 날짜 숫자 */}
                  <div style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 13, fontWeight: isToday(day) ? 800 : 500, background: isToday(day) ? "var(--accent)" : "transparent", color: isToday(day) ? "#fff" : isSun ? "#ff3b30" : isSat ? "#007aff" : "var(--text-primary)", marginBottom: 4 }}>{day}</div>

                  {/* 스마트 주문 칩 (시간 + 고객명 + 상품명) */}
                  {visibleOrders.map((order) => {
                    const cfg = getEventCfg(order);
                    const d = new Date(order.pickupDate);
                    const timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
                    const isPersonal = isPersonalEvent(order);
                    return (
                      <button
                        key={order.id}
                        onClick={(e) => { e.stopPropagation(); onOrderClick(order); }}
                        style={{
                          display: "block", width: "100%", padding: "3px 5px", borderRadius: 5,
                          background: cfg.bg || "#f3f4f6", border: "none", cursor: "pointer",
                          textAlign: "left", marginBottom: 2, transition: "opacity 0.1s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.75"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color || "#6b7280", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {isPersonal ? "📅" : timeStr} {isPersonal ? order.productName : order.customerName}
                        </div>
                        {!isPersonal && (
                          <div style={{ fontSize: 10, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                            {order.productName}
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* + N건 더보기 */}
                  {hiddenCount > 0 && (
                    <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, padding: "1px 5px" }}>
                      + {hiddenCount}건 더보기
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────
export default function CalendarView({ orders, onOrderClick, onDayClick, selectedDay, onImageUpload, onStatusChange }: CalendarViewProps) {
  return (
    <>
      <div className="mobile-only">
        <MobileView orders={orders} onOrderClick={onOrderClick} onDayClick={onDayClick} onImageUpload={onImageUpload} onStatusChange={onStatusChange} />
      </div>
      <div className="desktop-only">
        <DesktopCalendar orders={orders} onOrderClick={onOrderClick} onDayClick={onDayClick} selectedDay={selectedDay} />
      </div>
    </>
  );
}
