"use client";

import { useRouter } from "next/navigation";

interface UsageLimitModalProps {
  onClose: () => void;
  used: number;
  limit: number;
  onUpgrade: () => void;
}

export default function UsageLimitModal({ onClose, used, limit, onUpgrade }: UsageLimitModalProps) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl"
        style={{ animation: "scaleIn 0.2s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🔒</span>
        </div>

        {/* Text */}
        <h2 className="text-xl font-black text-slate-900 text-center mb-2">
          무료 한도 초과
        </h2>
        <p className="text-sm font-bold text-slate-400 text-center leading-relaxed mb-2">
          이번 달 무료 주문 {limit}건을 모두 사용했습니다.
        </p>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-center mb-6">
          <span className="text-2xl font-black text-amber-600">{used}</span>
          <span className="text-sm font-bold text-amber-400"> / {limit}건</span>
        </div>

        <p className="text-xs font-bold text-slate-400 text-center leading-relaxed mb-6">
          1기 사전체험단 혜택으로 신청 즉시<br />
          <strong className="text-slate-600">1개월 무료 PRO(무제한) 권한</strong>을<br />
          승인해 드리고 있습니다.
        </p>

        {/* CTA */}
        <button
          onClick={() => {
            onClose();
            onUpgrade();
          }}
          className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all mb-3"
        >
          🚀 1기 무료체험 PRO 신청
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
