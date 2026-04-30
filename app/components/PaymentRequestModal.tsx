"use client";

import { useState } from "react";
import { requestPayment } from "@/app/actions/admin";
import { showToast } from "./Toast";

type ReceiptType = "none" | "personal" | "business";

export default function PaymentRequestModal({
  storeId,
  onClose,
}: {
  storeId: string;
  onClose: () => void;
}) {
  const [depositorName, setDepositorName] = useState("");
  const [receiptType, setReceiptType] = useState<ReceiptType>("none");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositorName.trim()) {
      showToast("입금자명을 입력해주세요.", "error");
      return;
    }
    if (receiptType !== "none" && !receiptNumber.trim()) {
      showToast(
        receiptType === "personal"
          ? "휴대폰 번호를 입력해주세요."
          : "사업자 번호를 입력해주세요.",
        "error"
      );
      return;
    }

    setIsLoading(true);

    try {
      let cashReceiptInfo = undefined;
      if (receiptType === "personal") {
        cashReceiptInfo = `개인소득공제 (${receiptNumber})`;
      } else if (receiptType === "business") {
        cashReceiptInfo = `사업자지출증빙 (${receiptNumber})`;
      }

      await requestPayment(storeId, depositorName, cashReceiptInfo);
      showToast("사장님께 알림을 보냈습니다. 확인 후 승인해 드릴게요!", "success");
      onClose();
    } catch (err) {
      console.error(err);
      showToast("결제 확인 요청 중 오류가 발생했습니다.", "error");
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
                무제한 이용권 입금
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                입금 확인 후 즉시 프로 모드로 전환됩니다.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
            <div className="text-xs font-bold text-indigo-600 mb-1">입금 계좌</div>
            <div className="text-lg font-black text-indigo-900 tracking-wider">
              카카오뱅크 3333-04-0539354
            </div>
            <div className="text-sm font-bold text-indigo-700 mt-1">
              금액: 9,900원 (1개월)
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 입금자명 */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                실제 입금자명
              </label>
              <input
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
                required
              />
            </div>

            {/* 현금영수증 */}
            <div className="border-t border-slate-100 pt-6">
              <label className="block text-sm font-bold text-slate-700 mb-3">
                현금영수증 발행
              </label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="receiptType"
                    value="none"
                    checked={receiptType === "none"}
                    onChange={() => setReceiptType("none")}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">신청안함</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="receiptType"
                    value="personal"
                    checked={receiptType === "personal"}
                    onChange={() => {
                      setReceiptType("personal");
                      setReceiptNumber("");
                    }}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    개인소득공제 (휴대폰 번호)
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="receiptType"
                    value="business"
                    checked={receiptType === "business"}
                    onChange={() => {
                      setReceiptType("business");
                      setReceiptNumber("");
                    }}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    사업자지출증빙 (사업자 등록번호)
                  </span>
                </label>
              </div>

              {receiptType !== "none" && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder={
                      receiptType === "personal"
                        ? "휴대폰 번호 입력 (- 없이)"
                        : "사업자 번호 입력 (- 없이)"
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "요청 중..." : "입금 완료했어요"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
