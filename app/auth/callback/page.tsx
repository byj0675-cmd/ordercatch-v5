"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

import { Suspense } from "react";

import { useState } from "react";

function AuthCallbackContent() {
  const router = useRouter();
  const [status, setStatus] = useState("로그인 정보를 확인 중입니다...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. URL에 정보가 없는 경우 체크
    const hash = window.location.hash;
    const search = window.location.search;
    
    if (!hash && !search) {
      setStatus("인증 정보가 없습니다. 메인 페이지로 이동합니다.");
      setTimeout(() => router.replace("/"), 2000);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      
      if (session) {
        setStatus("로그인 성공! 대시보드로 이동합니다...");
        router.replace("/dashboard");
      } else if (event === 'SIGNED_OUT') {
        setErrorMsg("세션이 만료되었거나 로그아웃되었습니다.");
      }
    });

    // 10초 타임아웃
    const timeout = setTimeout(() => {
      if (!errorMsg) {
        setErrorMsg("로그인 처리 시간이 초과되었습니다. 환경 변수와 네트워킹 상태를 확인해 주세요.");
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, errorMsg]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif",
      padding: "20px", textAlign: "center"
    }}>
      {errorMsg ? (
        <>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#DC2626", marginBottom: "8px" }}>로그인 오류</h2>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "24px", maxWidth: "400px" }}>{errorMsg}</p>
          <button 
            onClick={() => window.location.href = "/"}
            style={{ background: "#1251CC", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
          >
            홈으로 다시가기
          </button>
        </>
      ) : (
        <>
          <div style={{ width: "32px", height: "32px", border: "3px solid #E5E7EB", borderTopColor: "#1251CC", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "16px" }} />
          <div style={{ fontSize: "16px", color: "#4B5563", fontWeight: 500 }}>{status}</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        로딩 중...
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
