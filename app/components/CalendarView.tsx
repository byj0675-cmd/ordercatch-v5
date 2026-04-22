"use client";

import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import { motion, useAnimation } from "framer-motion";
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

  // Swipe Logic (framer-motion)
  const controls = useAnimation();
  const [dragAction, setDragAction] = useState<"call" | "complete" | null>(null);

  const handleDrag = (_event: any, info: any) => {
    const x = info.offset.x;
    if (x > 50) setDragAction("call");
    else if (x < -50 && order.status !== "완료") setDragAction("complete");
    else setDragAction(null);
  };

  const handleDragEnd = async (_event: any, info: any) => {
    const x = info.offset.x;
    if (x > 80 && order.phone) {
      const a = document.createElement("a");
      a.href = `tel:${order.phone}`;
      a.click();
      controls.start({ x: 0 });
    } else if (x < -80 && onStatusChange && order.status !== "완료") {
      onStatusChange(order.id, "완료");
      await controls.start({ x: -400, opacity: 0, transition: { duration: 0.3 } });
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
    setDragAction(null);
  };

  return (
    <div className="relative mb-3 rounded-[2.5rem] overflow-hidden">
      {/* Swipe Backgrounds */}
      <div 
        className="absolute inset-0 flex items-center justify-between px-6 text-white text-base font-black"
        style={{
          background: dragAction === "call" ? "#10b981" : dragAction === "complete" ? "#4f46e5" : "#cbd5e1"
        }}
      >
        <span style={{ opacity: dragAction === "call" ? 1 : 0.5 }}>📞 전화</span>
        <span style={{ opacity: dragAction === "complete" ? 1 : 0.5 }}>✅ 완료</span>
      </div>

      <motion.div 
        className="group relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-sm transition-all"
        onClick={onClick}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ touchAction: "pan-y", width: "100%", zIndex: 10 }}
      >
        <div className="p-5 flex gap-4">
        {imageUrl ? (
          <div className="w-20 h-20 rounded-3xl overflow-hidden flex-shrink-0 border border-slate-50 ring-4 ring-slate-50/50">
             <Image src={imageUrl} alt="" width={80} height={80} className="object-cover w-full h-full" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl flex-shrink-0">
             {isPersonal ? "📅" : "🍰"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
             <span className="text-[10px] font-black tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">
                {formatTime(order.pickupDate)}
             </span>
             <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter" style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
             </span>
          </div>
          <h3 className="text-lg font-black text-slate-900 leading-tight">
             {isPersonal ? order.productName : order.customerName}
          </h3>
          {!isPersonal && <p className="text-sm font-bold text-slate-400 mt-0.5">{order.productName}</p>}
          
          {highlight && (
            <div className="mt-3 relative">
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-100 rounded-full" />
               <p className="pl-4 text-xs font-bold text-slate-500 leading-relaxed italic">
                 "{highlight}"
               </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
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
  
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = -3; i <= 10; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o: Order) => isSameDay(new Date(o.pickupDate), selectedDate))
      .sort((a,b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());
  }, [orders, selectedDate]);

  return (
    <div className="flex flex-col gap-0 animate-fadeIn min-h-screen bg-slate-50">
      {/* Native-grade Sticky Header */}
      <div className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-xl pb-4">
        <div className="px-6 pt-8 pb-4 flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">Schedule</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
              </h2>
           </div>
           <button 
             onClick={() => setSelectedDate(new Date())}
             className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 text-lg"
           >📍</button>
        </div>

        {/* Improved Week Strip */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-6 py-2">
           {weekDates.map((date, i) => {
             const isSelected = isSameDay(date, selectedDate);
             const isToday = isSameDay(date, new Date());
             const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
             return (
               <button 
                 key={i} 
                 onClick={() => setSelectedDate(date)}
                 className={`flex-shrink-0 w-14 h-20 flex flex-col items-center justify-center rounded-[2rem] transition-all duration-300 ${isSelected ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105" : "bg-white text-slate-400 border border-slate-100"}`}
               >
                 <span className={`text-[10px] font-black mb-1 uppercase tracking-tighter ${isSelected ? "text-indigo-200" : "text-slate-300"}`}>
                    {dayNames[date.getDay()]}
                 </span>
                 <span className="text-base font-black">
                    {date.getDate()}
                 </span>
                 {isToday && !isSelected && <div className="w-1 h-1 bg-indigo-500 rounded-full mt-1" />}
               </button>
             );
           })}
        </div>
      </div>

      {/* Vertical Agenda Timeline */}
      <div className="relative px-6 py-8 flex flex-col gap-6">
         {/* Vertical line through timeline */}
         <div className="absolute left-10 top-0 bottom-0 w-[2px] bg-slate-200/50" />

         {filteredOrders.length > 0 ? (
           filteredOrders.map((o: Order) => (
             <div key={o.id} className="relative pl-12">
                {/* Timeline Node */}
                <div className="absolute left-[3px] top-6 w-4 h-4 rounded-full bg-white border-4 border-indigo-600 z-10" />
                <OrderCard order={o} onClick={() => onOrderClick(o)} onStatusChange={onStatusChange} />
             </div>
           ))
         ) : (
           <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
              <span className="text-6xl mb-4">✨</span>
              <p className="text-lg font-black text-slate-900">완전한 자유 시간!</p>
              <p className="text-sm font-bold">이날은 등록된 주문이 없습니다.</p>
           </div>
         )}
      </div>
      
      {/* Padding for bottom bar + Safe area */}
      <div className="h-32 pb-[env(safe-area-inset-bottom)]" />
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
