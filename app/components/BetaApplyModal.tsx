"use client";
import React, { useState } from "react";
import { showToast } from "@/app/components/Toast";
import { signInWithKakao } from "@/utils/supabase/client";

interface BetaApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BetaApplyModal({ isOpen, onClose }: BetaApplyModalProps) {
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [item, setItem] = useState("레터링 케이크");
  const [customItem, setCustomItem] = useState("");
  const [snsLink, setSnsLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // 전화번호 하이픈 자동 삽입 로직
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    let formattedVal = rawVal;
    if (rawVal.length > 3 && rawVal.length <= 7) {
      formattedVal = `${rawVal.slice(0, 3)}-${rawVal.slice(3)}`;
    } else if (rawVal.length > 7) {
      formattedVal = `${rawVal.slice(0, 3)}-${rawVal.slice(3, 7)}-${rawVal.slice(7, 11)}`;
    }
    setPhone(formattedVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownerName.trim()) {
      showToast("대표자명을 입력해 주세요.", "error");
      return;
    }
    if (!phone.trim() || phone.length < 12) {
      showToast("올바른 연락처를 입력해 주세요.", "error");
      return;
    }
    if (!storeName.trim()) {
      showToast("매장명을 입력해 주세요.", "error");
      return;
    }

    setLoading(true);

    try {
      const finalItem = item === "기타" ? customItem : item;

      const res = await fetch("/api/beta-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          phone: phone.trim(),
          storeName: storeName.trim(),
          item: finalItem.trim() || "미기입",
          snsLink: snsLink.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "신청 처리 중 오류가 발생했습니다.");
      }

      showToast("사전 경험단 신청이 완료되었습니다! 🎉", "success");
      setIsSuccess(true);
      // 입력 폼 초기화
      setOwnerName("");
      setPhone("");
      setStoreName("");
      setItem("레터링 케이크");
      setCustomItem("");
      setSnsLink("");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "오류가 발생했습니다. 다시 시도해 주세요.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
        animation: "fadeIn 0.25s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: "28px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.6)",
          padding: "36px 30px 30px",
          position: "relative",
          animation: "scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => { onClose(); setIsSuccess(false); }}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "rgba(0,0,0,0.03)",
            border: "none",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {isSuccess ? (
          /* Success Screen */
          <div style={{ display: "flex", flexDirection: "column", gap: 20, textAlign: "center", padding: "10px 0" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,127,50,0.1)", color: "#FF7F32", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.03em" }}>사전 신청 완료! 🎉</h2>
              <p style={{ fontSize: 13, color: "#666", marginTop: 8, lineHeight: 1.5 }}>
                대표자님, 대기 시간 없이 오더캐치 서비스를 즉시 시작해보세요.
              </p>
            </div>

            <div style={{ background: "rgba(255, 127, 50, 0.03)", border: "1px solid rgba(255, 127, 50, 0.08)", borderRadius: "18px", padding: "16px 20px", fontSize: 13, color: "#555", lineHeight: 1.6, textAlign: "left" }}>
              아래 버튼을 눌러 <strong>카카오 1초 회원가입</strong>을 진행하시면, 오늘 신청하신 정보로 <strong>1개월 무료 PRO 요금제</strong>가 즉시 자동 활성화됩니다!
            </div>

            <button
              onClick={async () => {
                await signInWithKakao();
              }}
              style={{
                marginTop: 10,
                padding: "16px",
                borderRadius: "16px",
                background: "#FEE500",
                color: "#3A1D1D",
                border: "none",
                fontSize: 15,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(254,229,0,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "transform 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#Fada00")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#FEE500")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#3A1D1D">
                <path d="M12 3c-5.52 0-10 3.58-10 8c0 2.9 1.9 5.43 4.8 6.7c-.2.7-.8 2.7-.9 3.1c-.1.4.1.5.4.3c.3-.2 4.1-2.7 4.7-3.1c.3.1.6.2 1 .2c5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              카카오 로그인하고 무료체험 시작 →
            </button>
          </div>
        ) : (
          /* Application Form */
          <>
            {/* Title */}
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,127,50,0.1)", color: "#FF7F32", padding: "6px 12px", borderRadius: 30, fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                선착순 15명 한정 혜택
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.03em" }}>1기 사전 경험단 신청</h2>
              <p style={{ fontSize: 13, color: "#666", marginTop: 6, lineHeight: 1.5 }}>
                지금 신청하시면 추후 정가 인상 시에도<br />
                <span style={{ color: "#FF7F32", fontWeight: 800 }}>평생 월 4,950원</span> 요금 그대로 동결 적용됩니다.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Store Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#444" }}>매장명 <span style={{ color: "#FF7F32" }}>*</span></label>
                <input
                  type="text"
                  placeholder="예: 단골 꽃집, 핑크 래빗 케이크"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#FF7F32")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.1)")}
                />
              </div>

              {/* Owner Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#444" }}>대표자명 <span style={{ color: "#FF7F32" }}>*</span></label>
                <input
                  type="text"
                  placeholder="대표자 실명을 적어주세요."
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#FF7F32")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.1)")}
                />
              </div>

              {/* Phone Number */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#444" }}>연락처 <span style={{ color: "#FF7F32" }}>*</span></label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={13}
                  required
                  style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#FF7F32")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.1)")}
                />
              </div>

              {/* Item Category */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#444" }}>주요 판매 품목</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  {["레터링 케이크", "디저트/베이커리", "꽃/플라워", "네일/뷰티", "기타"].map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setItem(cat)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 20,
                        border: "none",
                        background: item === cat ? "rgba(255,127,50,0.12)" : "rgba(0,0,0,0.04)",
                        color: item === cat ? "#FF7F32" : "#555",
                        fontSize: 13,
                        fontWeight: item === cat ? 800 : 500,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {item === "기타" && (
                  <input
                    type="text"
                    placeholder="직접 입력해 주세요."
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 14, outline: "none" }}
                  />
                )}
              </div>

              {/* Instagram / Kakao Link */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#444" }}>인스타그램 ID 또는 카카오톡 채널명</label>
                <input
                  type="text"
                  placeholder="예: @store_username 또는 단골꽃집채널"
                  value={snsLink}
                  onChange={(e) => setSnsLink(e.target.value)}
                  style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#FF7F32")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.1)")}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 12,
                  padding: "16px",
                  borderRadius: 16,
                  background: "#FF7F32",
                  color: "#fff",
                  border: "none",
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 10px 24px rgba(255,127,50,0.25)",
                  transition: "transform 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = "#e66a22";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = "#FF7F32";
                }}
              >
                {loading ? "신청 처리 중..." : "동결 혜택받고 사전 신청하기 →"}
              </button>
            </form>
          </>
        )}

        <style>{`
          @keyframes scaleUp {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
