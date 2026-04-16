"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 콘솔에도 에러 기록
    console.error("Critical Application Error:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      textAlign: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif",
      background: "#fff"
    }}>
      <div style={{ fontSize: "64px", marginBottom: "20px" }}>🚨</div>
      <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>
        앱 실행 중 오류가 발생했습니다
      </h2>
      <div style={{
        background: "#F9FAFB",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid #E5E7EB",
        marginBottom: "24px",
        maxWidth: "500px",
        width: "100%",
        textAlign: "left"
      }}>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#DC2626", marginBottom: "8px" }}>
          에러 메시지:
        </p>
        <code style={{ fontSize: "12px", color: "#4B5563", wordBreak: "break-all" }}>
          {error.message || "알 수 없는 서버 오류입니다."}
        </code>
        {error.digest && (
          <p style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "8px" }}>
            ID: {error.digest}
          </p>
        )}
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={() => reset()}
          style={{
            background: "#1251CC",
            color: "#fff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "10px",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          다시 시도하기
        </button>
        <button
          onClick={() => window.location.href = "/"}
          style={{
            background: "#F3F4F6",
            color: "#374151",
            border: "none",
            padding: "12px 24px",
            borderRadius: "10px",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          메인으로 이동
        </button>
      </div>
      <p style={{ marginTop: "20px", fontSize: "13px", color: "#6B7280" }}>
        지속적으로 발생한다면 환경 변수(ENV) 설정을 확인해 주세요.
      </p>
    </div>
  );
}
