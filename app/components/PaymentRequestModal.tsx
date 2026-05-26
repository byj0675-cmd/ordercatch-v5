"use client";

import { useState } from "react";
import { showToast } from "./Toast";

export default function PaymentRequestModal({
  storeId,
  initialStoreName = "",
  initialOwnerName = "",
  onClose,
}: {
  storeId: string;
  initialStoreName?: string;
  initialOwnerName?: string;
  onClose: () => void;
}) {
  const [storeName, setStoreName] = useState(initialStoreName);
  const [ownerName, setOwnerName] = useState(initialOwnerName);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 연락처 하이픈 자동 포맷터
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, "");
    let formatted = raw;
    if (raw.length > 3 && raw.length <= 7) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
    } else if (raw.length > 7) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim()) {
      showToast("매장명을 입력해주세요.", "error");
      return;
    }
    if (!ownerName.trim()) {
      showToast("대표자 성함을 입력해주세요.", "error");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      showToast("휴대폰 번호를 올바르게 입력해주세요 (최소 10자리).", "error");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          storeName: storeName.trim(),
          ownerName: ownerName.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "결제 요청 처리 중 오류가 발생했습니다.");
      }

      showToast("결제선생 청구 신청이 완료되었습니다! 톡으로 청구서가 발송됩니다.", "success");
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "결제 요청 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl animate-scaleIn">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                PRO 요금제 결제 신청
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                결제선생 알림톡으로 간편하고 안전하게 결제하세요.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
            <div className="text-xs font-bold text-indigo-600 mb-1">PRO 요금제 안내 (선착순 100명 혜택)</div>
            <div className="text-lg font-black text-indigo-900 tracking-wider">
              월 4,950원 <span className="text-xs font-bold text-indigo-500">(평생 50% 할인 적용)</span>
            </div>
            <div className="text-xs text-indigo-700 mt-1.5 leading-relaxed">
              신청을 하시면 입력하신 번호로 <b>'결제선생' 카카오톡 알림톡 결제장</b>이 발송됩니다. 
              결제 완료 시 관리자가 확인 후 즉시 무제한 이용 등급(PRO)으로 승인해 드립니다.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 매장 상호명 */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                매장 상호명
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="예: 플라워-테스트"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-800"
                required
              />
            </div>

            {/* 대표자 성함 */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                대표자 성함
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-800"
                required
              />
            </div>

            {/* 결제 알림톡 받을 연락처 */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                결제선생 청구 번호 (휴대폰)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black transition-all text-slate-800 tracking-wider"
                required
              />
              <p className="text-[11px] text-amber-600 font-bold mt-1.5 leading-normal">
                ⚠️ 번호를 잘못 입력하시면 카카오톡 결제 요청 링크가 오지 않으므로 한 번 더 정확히 확인해 주세요.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? "청구 요청 중..." : "결제 알림톡 신청하기"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
