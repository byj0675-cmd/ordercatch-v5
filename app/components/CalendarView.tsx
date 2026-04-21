"use client";

import { useState, useRef, useMemo } from "react";
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
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
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
  return !!order.options.isPersonal;
}

// ── 이벤트 스타일 ──────────────────
function getEventCfg(order: Order) {
  if (isPersonalEvent(order)) {
    return { bg: "rgba(100,116,139,0.1)", color: "#475569", dot: "#94a3b8", label: "개인일정" };
  }
  return STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
}

// ── 주문 카드 (모바일 Agenda 전용) ────────
function OrderCard({ order, onClick, onStatusChange }: {
  order: Order; onClick: () => void;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
}) {
  const cfg = getEventCfg(order);
  const highlight = order.options.memo || order.options.custom;
  const imageUrl = order.options.imageUrl;
  const isPersonal = isPersonalEvent(order);

  // 스와이프 상태
  const touchStartX = useRef(0);
  const [swipeHint, setSwipeHint] = useState<"left" | "right" | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 100 && !isPersonal) {
      if (dx < 0 && onStatusChange && order.status !== "완료") {
        onStatusChange(order.id, "완료");
        showToast("✅ 완료 처리됐습니다", "success");
      } else if (dx > 0 && order.phone) {
        window.location.href = `tel:${order.phone.replace(/[^0-9+]/g, "")}`;
      }
    }
    setSwipeHint(null);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPersonal) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < -30) setSwipeHint("left");
    else if (dx > 30) setSwipeHint("right");
    else setSwipeHint(null);
  };

  return (
    <div 
      className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition-all"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
    >
      {/* Swipe Badges */}
      {swipeHint === "left" && (
        <div className="absolute inset-0 bg-green-500/10 flex items-center justify-end pr-6 pointer-events-none">
          <span className="text-2xl">✅</span>
        </div>
      )}
      {swipeHint === "right" && order.phone && (
        <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-start pl-6 pointer-events-none">
          <span className="text-2xl">📞</span>
        </div>
      )}

      <div className="p-4 flex gap-4">
        {imageUrl && (
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
             <Image src={imageUrl} alt="" width={64} height={64} className="object-cover w-full h-full" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
             <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {formatTime(order.pickupDate)}
             </span>
             <span className={`text-[11px] font-black px-2 py-0.5 rounded-full`} style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
             </span>
          </div>
          <h3 className="text-base font-black text-slate-900 truncate">
             {isPersonal ? order.productName : order.customerName}
          </h3>
          {!isPersonal && <p className="text-sm font-bold text-slate-400 truncate">{order.productName}</p>}
          {highlight && (
            <p className="mt-2 text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg line-clamp-2">
               💬 {highlight}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 모바일 타임라인 섹션 ──────────────────
function TimelineSection({ label, orders, onOrderClick, onStatusChange }: {
  label: string; orders: Order[]; onOrderClick: (o: Order) => void;
  onStatusChange?: (id: string, s: Order["status"]) => void;
}) {
  if (orders.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-black text-slate-900">{label}</span>
        <div className="h-[1px] flex-1 bg-slate-100" />
        <span className="text-[11px] font-black text-slate-400">{orders.length}건</span>
      </div>
      <div className="space-y-3">
        {orders.map((o: Order) => (
          <OrderCard key={o.id} order={o} onClick={() => onOrderClick(o)} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  );
}

// ── 모바일 뷰 (Agenda/Timeline) ──────────
function MobileView({ orders, onOrderClick, onStatusChange }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Calculate horizontal week date strip
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [selectedDate]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o: Order) => isSameDay(new Date(o.pickupDate), selectedDate));
  }, [orders, selectedDate]);

  const monthStr = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-24">
      {/* Month & Week Strip Header */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4 px-2">
           <h2 className="text-lg font-black text-slate-900">{monthStr}</h2>
           <button 
             onClick={() => setSelectedDate(new Date())}
             className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full"
           >오늘</button>
        </div>
        <div className="flex justify-between gap-1 overflow-x-auto no-scrollbar">
           {weekDates.map((date, i) => {
             const isSelected = isSameDay(date, selectedDate);
             const isSun = date.getDay() === 0;
             const isSat = date.getDay() === 6;
             const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
             return (
               <button 
                 key={i} 
                 onClick={() => setSelectedDate(date)}
                 className={`flex-1 flex flex-col items-center py-3 rounded-2xl transition-all min-w-[48px] ${isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105" : "text-slate-400"}`}
               >
                 <span className="text-[10px] font-black mb-1">{dayNames[date.getDay()]}</span>
                 <span className={`text-sm font-black ${!isSelected && (isSun ? "text-red-400" : isSat ? "text-blue-400" : "")}`}>
                    {date.getDate()}
                 </span>
               </button>
             );
           })}
        </div>
      </div>

      {/* Timeline List */}
      <div className="px-1 space-y-8">
         <TimelineSection 
           label={isSameDay(selectedDate, new Date()) ? "오늘 주문" : formatDate(selectedDate)} 
           orders={filteredOrders} 
           onOrderClick={onOrderClick}
           onStatusChange={onStatusChange}
         />
         {filteredOrders.length === 0 && (
           <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
              <span className="text-4xl mb-4">📭</span>
              <p className="text-slate-400 font-bold">이날은 등록된 주문이 없습니다.</p>
           </div>
         )}
      </div>
    </div>
  );
}

// ── 데스크톱 캘린더 (Desktop View) ──────────
function DesktopView({ orders, onOrderClick, onDayClick, selectedDay }: CalendarViewProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getDayOrders = (day: number) => {
    return orders.filter((o: Order) => {
      const d = new Date(o.pickupDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      {/* PC Header */}
      <div className="p-8 flex items-center justify-between border-bottom border-slate-50">
        <div className="flex items-center gap-6">
           <h2 className="text-2xl font-black text-slate-900">{year}년 {month + 1}월</h2>
           <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewDate(new Date(year, month - 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600">‹</button>
              <button onClick={() => setViewDate(new Date())} className="px-4 py-2 hover:bg-white rounded-lg transition-all text-xs font-black text-slate-900">오늘</button>
              <button onClick={() => setViewDate(new Date(year, month + 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-600">›</button>
           </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-1 border-t border-slate-50">
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
                    {dayOrders.slice(0, 3).map((o: Order) => {
                      const cfg = getEventCfg(o);
                      return (
                        <div key={o.id} className="text-[10px] font-bold px-2 py-1 rounded-md truncate" style={{ background: cfg.bg, color: cfg.color }}>
                          {isPersonalEvent(o) ? "📅" : formatTime(o.pickupDate)} {isPersonalEvent(o) ? o.productName : o.customerName}
                        </div>
                      );
                    })}
                    {dayOrders.length > 3 && <div className="text-[10px] font-black text-slate-400 px-2">+ {dayOrders.length - 3}건 더보기</div>}
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
