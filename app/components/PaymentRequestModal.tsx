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

      showToast("1기 사전체험단 신청이 완료되었습니다! 잠시 후 승인 완료 알림이 전송됩니다.", "success");
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
                1기 사전체험단 PRO 신청
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                대표자 정보를 남겨주시면 즉시 1개월 무료 체험을 승인해 드립니다.
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

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6">
            <div className="text-xs font-bold text-orange-600 mb-1">🎁 1기 사전 체험단 특별 혜택</div>
            <div className="text-lg font-black text-orange-950 tracking-wider">
              1개월 완전 무료 <span className="text-xs font-bold text-orange-600">(피드백 수집 조건)</span>
            </div>
            <div className="text-xs text-orange-800 mt-1.5 leading-relaxed">
              지금 사전 체험단을 신청하시면, 한 달 무료 이용 종료 후 정식 가격 인상 시에도 <b>평생 월 4,950원 가격 동결 혜택</b>을 제공해 드립니다. 
              신청 완료 즉시 관리자 확인 후 무제한 이용 권한(PRO)이 바로 활성화됩니다.
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
                placeholder="예: 핑크 래빗 케이크"
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
                placeholder="대표자 성함을 적어주세요."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-800"
                required
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                연락처 (휴대폰 번호)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black transition-all text-slate-800 tracking-wider"
                required
              />
              <p className="text-[11px] text-slate-400 font-bold mt-1.5 leading-normal">
                연락처는 사전체험단 권한 승인 안내를 위한 용도로만 안전하게 활용됩니다.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 focus:ring-4 focus:ring-orange-200 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? "신청 처리 중..." : "1기 무료 체험 신청하기 →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
