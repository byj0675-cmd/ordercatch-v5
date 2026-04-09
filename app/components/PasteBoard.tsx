"use client";
// Force refresh for Next.js 16 Turbopack cache - 2026-04-08

import { useState } from "react";
import { Order, SOURCE_CONFIG, STATUS_CONFIG } from "../lib/mockData";
import { showToast } from "./Toast";

interface PasteBoardProps {
  onParsed?: (order: Partial<Order>) => void;
  storeId: string;
}

const EXAMPLE_TEXTS = [
  "안녕하세요~ 내일 오후 3시에 뚱카롱 20개 픽업 예약하고 싶어요. 딸기/초코/바닐라 혼합으로요. 견과류 알러지 있어요. 카드 결제할게요!",
  "포레스트 베이커리 예약해요. 이번 주 토요일 오전 11시 레터링 케이크 2호 주문이요. 문구는 '생일 축하해 지수야!' 로 부탁드려요. 초도 넣어주세요.",
  "네일 예약 문의요. 4월 5일 오전 10시에 젤 손발 세트 가능할까요? 디자인은 누드핑크 + 실버 체인 아트로요. 연락처는 010-1234-5678입니다.",
];

export default function PasteBoard({ onParsed, storeId }: PasteBoardProps) {
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<Record<string, string> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) {
      showToast("주문 텍스트를 입력해 주세요.", "warning", "⚠️");
      return;
    }
    setIsParsing(true);
    setParsedResult(null);

    try {
      console.log("Parsing with storeId:", storeId);
      const res = await fetch("/api/orders/manual-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, storeId })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      // JSON 포맷을 테이블용으로 직관적 매핑
      const viewResult: Record<string, string> = {
        고객명: data.customerName,
        상품명: data.productName,
        픽업일시: data.pickupDate ? new Date(data.pickupDate).toLocaleString("ko-KR") : "미정",
        연락처: data.phone || "없음",
      };

      if (data.options) {
        Object.entries(data.options).forEach(([k, v]) => {
          if (v) viewResult[k] = v as string;
        });
      }

      setParsedResult(viewResult);

      if (data.isUpdate) {
        showToast("기존 예약이 성공적으로 수정(Update) 되었습니다!", "success", "✏️");
      } else {
        showToast("새로운 주문이 성공적으로 등록되었습니다!", "success", "🎉");
      }

      if (onParsed) {
        onParsed({ productName: data.productName, status: "입금대기" });
      }
    } catch (e) {
      console.error(e);
      showToast("서버 오류가 발생했습니다.", "error", "❌");
    } finally {
      setIsParsing(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setText(example);
    setIsExpanded(true);
    setParsedResult(null);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          width: "100%",
          padding: "14px 20px",
          background: "rgba(0,122,255,0.06)",
          border: "1.5px dashed rgba(0,122,255,0.3)",
          borderRadius: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
          transition: "all 0.15s",
          color: "var(--accent)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(0,122,255,0.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(0,122,255,0.06)";
        }}
      >
        <span style={{ fontSize: 20 }}>✨</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>복붙 마법사로 주문 등록</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 1 }}>
            카카오·인스타 주문 메시지를 그대로 붙여넣으면 AI가 자동 파싱
          </div>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 18 }}>+</span>
      </button>
    );
  }

  return (
    <div
      className="animate-slideUp"
      style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, rgba(0,122,255,0.06), rgba(0,122,255,0.02))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✨</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>복붙 마법사</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>주문 텍스트 자동 파싱 (Gemini AI)</div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setIsExpanded(false);
            setText("");
            setParsedResult(null);
          }}
          style={{ borderRadius: 8, padding: "5px 9px" }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Examples */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            예시 텍스트 (클릭하여 사용)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {EXAMPLE_TEXTS.map((ex, i) => (
              <button
                key={i}
                onClick={() => handleExampleClick(ex)}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.04)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,122,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
              >
                <span style={{ marginRight: 6 }}>
                  {SOURCE_CONFIG[i === 0 ? "kakao" : i === 1 ? "instagram" : "manual"].emoji}
                </span>
                {ex.length > 60 ? ex.slice(0, 60) + "..." : ex}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            주문 텍스트 입력
          </div>
          <textarea
            className="input-field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="카카오톡, 인스타그램 등에서 받은 주문 메시지를 그대로 붙여넣어 주세요..."
            rows={4}
            style={{ resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {/* Parsed result */}
        {parsedResult && (
          <div
            className="animate-fadeIn"
            style={{
              padding: "14px 16px",
              background: "rgba(52,199,89,0.06)",
              border: "1px solid rgba(52,199,89,0.2)",
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🤖</span> AI 파싱 결과 (미리보기)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(parsedResult).map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 10, fontSize: 13 }}>
                  <span style={{ color: "var(--text-tertiary)", width: 72, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={handleParse}
            disabled={isParsing}
            style={{
              flex: 1,
              opacity: isParsing ? 0.7 : 1,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isParsing ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                AI 분석 중...
              </>
            ) : (
              <>✨ AI로 파싱하기</>
            )}
          </button>
          {parsedResult && (
            <button
              className="btn"
              style={{ background: "var(--green)", color: "#fff" }}
              onClick={() => showToast("주문이 장부에 등록되었습니다! (DB 연동 시 실제 저장)", "success", "✓")}
            >
              장부에 저장
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
