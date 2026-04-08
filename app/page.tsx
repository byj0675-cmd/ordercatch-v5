"use client";

import Link from "next/link";
import { ToastContainer } from "./components/Toast";
import { signInWithKakao } from "@/utils/supabase/client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      // If code is found on landing page, redirect to auth/callback
      router.replace(`/auth/callback?code=${code}`);
    }
  }, [searchParams, router]);

  const handleKakaoLogin = async () => {
    await signInWithKakao();
  };

  return (
    <>
      <ToastContainer />
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
        {/* Navigation */}
        <header
          style={{
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 9,
                background: "linear-gradient(135deg, #007aff, #5856d6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, boxShadow: "0 2px 8px rgba(0,122,255,0.3)"
              }}
            >
              📦
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.03em" }}>OrderCatch</span>
          </div>
          <div>
            <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: 13, marginRight: 8 }}>
              대시보드 둘러보기
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
          
          <div className="animate-slideUp" style={{ padding: "8px 16px", background: "rgba(0,122,255,0.08)", color: "var(--accent)", borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
            🎯 SNS 다이렉트 주문, 더 이상 놓치지 마세요
          </div>

          <h1 className="animate-slideUp" style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.04em", marginBottom: 24, animationDelay: "0.1s" }}>
            복붙 한 번으로<br />
            <span style={{ color: "var(--accent)" }}>주문 관리 끝!</span>
          </h1>

          <p className="animate-slideUp" style={{ fontSize: "clamp(16px, 3vw, 20px)", color: "var(--text-secondary)", maxWidth: 540, lineHeight: 1.6, marginBottom: 48, animationDelay: "0.2s" }}>
            카카오톡, 인스타그램으로 받은 비정형 주문 메시지를 AI가 1초 만에 분석하여 사장님의 장부에 쏙 넣어드립니다.
          </p>

          <div className="animate-scaleIn" style={{ animationDelay: "0.3s", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: "100%" }}>
            <button
              onClick={handleKakaoLogin}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", maxWidth: 320,
                background: "#FEE500", color: "#000000",
                border: "none", borderRadius: 14,
                padding: "16px 32px", fontSize: 16, fontWeight: 700,
                cursor: "pointer", boxShadow: "0 8px 24px rgba(254, 229, 0, 0.3)",
                transition: "transform 0.2s"
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.95)")}
            >
              <div style={{ background: "#000000", color: "#FEE500", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13 }}>K</div>
              카카오로 3초 만에 시작하기
            </button>
          </div>
          <div className="animate-fadeIn" style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 16, animationDelay: "0.4s" }}>
            *별도의 설치 없이 평생 무료 플랜을 경험해 보세요
          </div>
        </main>
      </div>
    </>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingContent />
    </Suspense>
  );
}
