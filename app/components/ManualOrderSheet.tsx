"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { OrderStatus, STATUS_CONFIG, Order } from "../lib/mockData";
import { showToast } from "./Toast";
import { supabase } from "@/utils/supabase/client";
import DuplicateCheckModal from "./DuplicateCheckModal";

interface ManualOrderSheetProps {
  storeId: string;
  onClose: () => void;
  onSaved: () => void;
}

type SheetMode = "ai" | "manual" | "personal";

export default function ManualOrderSheet({ storeId, onClose, onSaved }: ManualOrderSheetProps) {
  const [mode, setMode] = useState<SheetMode>("ai");
  const [isParsing, setIsParsing] = useState(false);
  const [parsingText, setParsingText] = useState("");

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [productName, setProductName] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<OrderStatus>("신규주문");
  const [saving, setSaving] = useState(false);

  // Images
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate Check
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [updateOrderId, setUpdateOrderId] = useState<string | null>(null);

  const resetForm = (newMode?: SheetMode) => {
    setCustomerName("");
    setPhone("");
    setProductName("");
    setAmount("");
    setMemo("");
    setPickupDate("");
    setPickupTime("11:00");
    setImagePreview(null);
    setImageFile(null);
    setUpdateOrderId(null);
  };

  const handleModeChange = (m: SheetMode) => {
    setMode(m);
    resetForm();
  };

  const handleParse = async () => {
    if (!parsingText.trim()) return showToast("주문 텍스트를 입력해 주세요.", "warning");
    setIsParsing(true);
    try {
      const res = await fetch("/api/orders/manual-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: parsingText, storeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCustomerName(data.customerName || "");
      setPhone(data.phone || "");
      setProductName(data.productName || "");
      setAmount(data.amount ? String(data.amount) : "");
      setMemo(data.options?.memo || "");
      
      if (data.pickupDate) {
        const d = new Date(data.pickupDate);
        setPickupDate(d.toISOString().split("T")[0]);
        setPickupTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      }

      showToast("AI가 내용을 정리했어요! ✨", "success");
      setMode("manual"); // Switch to manual to review/edit
    } catch (err: any) {
      showToast(err.message || "분석 중 오류가 발생했습니다.", "error");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if ((mode === "manual" || mode === "ai") && (!customerName || !productName)) return showToast("필수 정보를 입력해주세요.", "warning");
    if (mode === "personal" && !productName) return showToast("일정 제목을 입력해주세요.", "warning");

    setSaving(true);
    try {
      const pickupIso = pickupDate 
        ? new Date(`${pickupDate}T${pickupTime || "09:00"}:00`).toISOString()
        : new Date().toISOString();

      const options: Record<string, any> = { memo: memo.trim() };
      if (mode === "personal") {
         options.isPersonal = true;
         if (endTime) options.endTime = new Date(`${pickupDate}T${endTime}:00`).toISOString();
      }

      const payload = {
        store_id: storeId,
        customer_name: mode === "personal" ? "개인일정" : customerName.trim(),
        phone: mode === "personal" ? "" : phone.trim(),
        product_name: productName.trim(),
        pickup_date: pickupIso,
        amount: mode === "personal" ? 0 : Number(amount.replace(/[^0-9]/g, "")) || 0,
        status: mode === "personal" ? "신규주문" : status,
        source: "manual",
        options,
      };

      const { error } = await supabase.from("orders").insert(payload);
      if (error) throw error;

      showToast(mode === "personal" ? "일정이 등록되었습니다 📅" : "주문이 등록되었습니다 ✅", "success");
      onSaved();
      onClose();
    } catch (err) {
      showToast("저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:p-8" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-2xl animate-slideUp flex flex-col max-h-[95vh]" 
        onClick={e => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="flex justify-center p-4">
           <div className="w-10 h-1 rounded-full bg-slate-100" />
        </div>

        <div className="px-8 pb-8 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-2xl font-black text-slate-900">
                {mode === "ai" ? "스마트 AI 등록" : mode === "personal" ? "일정 등록" : "수기 주문 등록"}
             </h2>
             <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">✕</button>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
             {(["ai", "manual", "personal"] as SheetMode[]).map(m => (
               <button 
                 key={m} 
                 onClick={() => handleModeChange(m)}
                 className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${mode === m ? "bg-white text-indigo-600 shadow-md shadow-slate-200/50" : "text-slate-400"}`}
               >
                 {m === "ai" ? "✨ AI 분석" : m === "manual" ? "✏️ 수기" : "📅 일정"}
               </button>
             ))}
          </div>

          <div className="space-y-6">
            {mode === "ai" ? (
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-400 pl-1">카톡이나 인스타의 주문 메시지를 붙여넣어 주세요.</p>
                <textarea 
                  value={parsingText}
                  onChange={e => setParsingText(e.target.value)}
                  placeholder="예: 안녕하세요! 이번 주 토요일 오후 3시 예약하고 싶어요... "
                  className="w-full h-40 p-5 bg-slate-50 rounded-3xl border-none font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:ring-2 ring-indigo-100 transition-all resize-none"
                />
                <button 
                   onClick={handleParse}
                   disabled={isParsing || !parsingText.trim()}
                   className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
                >
                   {isParsing ? "AI가 주문서를 분석하고 있습니다..." : "주문 자동 정리하기"}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn">
                 {/* Shared Fields */}
                 {mode === "manual" && (
                   <div className="grid grid-cols-2 gap-4">
                      <Field label="고객명">
                         <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="홍길동" className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-100 transition-all" />
                      </Field>
                      <Field label="연락처">
                         <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="010-0000-0000" className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-100 transition-all" />
                      </Field>
                   </div>
                 )}
                 <Field label={mode === "personal" ? "일정 제목" : "상품명"}>
                    <input value={productName} onChange={e=>setProductName(e.target.value)} placeholder={mode === "personal" ? "예: 재료 수급" : "레터링 케이크 2호"} className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-100 transition-all" />
                 </Field>

                 <div className="grid grid-cols-2 gap-4">
                    <Field label="픽업 날짜">
                       <input type="date" value={pickupDate} onChange={e=>setPickupDate(e.target.value)} className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-100 transition-all" />
                    </Field>
                    <Field label="픽업 시간">
                       <input type="time" value={pickupTime} onChange={e=>setPickupTime(e.target.value)} className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-100 transition-all" />
                    </Field>
                 </div>

                 {mode === "manual" && (
                   <Field label="주문 금액">
                      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-100 transition-all" />
                   </Field>
                 )}

                 <Field label="메모 / 요청사항">
                    <textarea value={memo} onChange={e=>setMemo(e.target.value)} placeholder="특이사항을 기록해 주세요" className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-100 transition-all h-24 resize-none" />
                 </Field>

                 {mode === "manual" && (
                   <Field label="주문 상태">
                      <div className="flex gap-2">
                         {["신규주문", "제작중", "픽업대기"].map(s => (
                           <button 
                             key={s} 
                             onClick={() => setStatus(s as OrderStatus)}
                             className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${status === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}
                           >
                             {s}
                           </button>
                         ))}
                      </div>
                   </Field>
                 )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button for Manual/Personal */}
        {mode !== "ai" && (
          <div className="p-8 bg-slate-50/50 border-t border-slate-100">
             <button 
               onClick={handleSave}
               disabled={saving}
               className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
             >
                {saving ? "저장 중..." : (mode === "personal" ? "📅 일정 등록하기" : "✅ 주문 등록하기")}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
       <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
       {children}
    </div>
  );
}
