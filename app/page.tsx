"use client";

import { ToastContainer } from "./components/Toast";
import { signInWithKakao } from "@/utils/supabase/client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      router.replace(`/auth/callback?code=${code}`);
    }
  }, [searchParams, router]);

  const handleKakaoLogin = async () => {
    await signInWithKakao();
  };

  return (
    <>
      <ToastContainer />
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>

        {/* 헤더 */}
        <header style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.06)", zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #007aff, #5856d6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📦</div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.03em" }}>OrderCatch</span>
          </div>
          <button onClick={handleKakaoLogin} style={{ background: "#FEE500", color: "#000", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            시작하기
          </button>
        </header>

        {/* 히어로 */}
        <section style={{ padding: "80px 24px 60px", textAlign: "center", background: "linear-gradient(180deg, #f0f6ff 0%, #fff 100%)" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", background: "rgba(0,122,255,0.08)", color: "#007aff", borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
            🎯 소상공인을 위한 AI 주문 관리
          </div>
          <h1 style={{ fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.04em", marginBottom: 20, color: "#1d1d1f" }}>
            카톡 주문,<br />
            <span style={{ color: "#007aff" }}>복붙 한 번으로 끝!</span>
          </h1>
          <p style={{ fontSize: "clamp(15px, 2.5vw, 18px)", color: "#6e6e73", maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.7 }}>
            카카오톡·인스타 주문 메시지를 그대로 붙여넣으면<br />
            AI가 1초 만에 분석해서 장부에 자동 등록합니다.
          </p>
          <button
            onClick={handleKakaoLogin}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#FEE500", color: "#000", border: "none", borderRadius: 14, padding: "16px 36px", fontSize: 17, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(254,229,0,0.35)", transition: "transform 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span style={{ background: "#000", color: "#FEE500", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12 }}>K</span>
            카카오로 무료 시작하기
          </button>
          <div style={{ fontSize: 12, color: "#aeaeb2", marginTop: 14 }}>신용카드 불필요 · 1달 무료 체험</div>
        </section>

        {/* 사용 방법 3단계 */}
        <section style={{ padding: "64px 24px", background: "#fff" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.03em" }}>딱 3단계</h2>
            <p style={{ textAlign: "center", color: "#6e6e73", fontSize: 15, marginBottom: 48 }}>복잡한 설정 없이 바로 시작</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {[
                { step: "01", icon: "📱", title: "카톡 메시지 복사", desc: "고객에게 받은 주문 메시지를 그대로 복사합니다" },
                { step: "02", icon: "✨", title: "붙여넣기 한 번", desc: "복붙 마법사에 붙여넣으면 AI가 자동 분석합니다" },
                { step: "03", icon: "📋", title: "장부에 자동 등록", desc: "고객명·상품·픽업일시가 장부에 깔끔하게 정리됩니다" },
              ].map(item => (
                <div key={item.step} style={{ background: "#f5f5f7", borderRadius: 20, padding: "28px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#007aff", letterSpacing: "0.08em", marginBottom: 12 }}>STEP {item.step}</div>
                  <div style={{ fontSize: 40, marginBottom: 14 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#1d1d1f" }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 기능 목록 */}
        <section style={{ padding: "64px 24px", background: "#f5f5f7" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: 26, fontWeight: 800, marginBottom: 48, letterSpacing: "-0.03em" }}>이런 기능이 있어요</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { icon: "🤖", title: "AI 자동 파싱", desc: "Gemini AI가 비정형 메시지에서 주문 정보를 정확하게 추출" },
                { icon: "📅", title: "캘린더 장부", desc: "픽업일 기준으로 주문을 한눈에 확인" },
                { icon: "🔗", title: "고객 주문 링크", desc: "고객이 직접 주문서를 작성할 수 있는 전용 링크" },
                { icon: "🤖", title: "카카오 자동 수신", desc: "웹훅 연동으로 카톡 주문이 자동으로 장부에 등록" },
                { icon: "📊", title: "매출 통계", desc: "월별 매출·주문 건수를 한눈에 파악" },
                { icon: "📱", title: "모바일 최적화", desc: "스마트폰에서도 편하게 주문 관리" },
              ].map(item => (
                <div key={item.title} style={{ background: "#fff", borderRadius: 16, padding: "22px 20px", display: "flex", gap: 14, alignItems: "flex-start", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#1d1d1f" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#6e6e73", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 가격 플랜 */}
        <section style={{ padding: "64px 24px", background: "#fff" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.03em" }}>심플한 요금제</h2>
            <p style={{ color: "#6e6e73", fontSize: 15, marginBottom: 48 }}>1달 무료 체험 후 결정하세요</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, textAlign: "left" }}>
              {[
                { name: "무료", price: "0원", period: "1달 체험", color: "#6e6e73", features: ["모든 기능 완전 개방", "AI 파싱 무제한", "카카오 웹훅 포함", "1달 후 자동 전환 안내"], cta: "무료로 시작" },
                { name: "스타터", price: "9,900원", period: "/ 월", color: "#007aff", features: ["월 주문 200건", "AI 파싱", "카카오 웹훅", "고객 주문 링크", "CSV 내보내기"], cta: "시작하기", highlight: true },
                { name: "프로", price: "19,900원", period: "/ 월", color: "#5856d6", features: ["월 주문 무제한", "다중 매장 3개", "팀 멤버 3명", "매출 통계 리포트", "우선 지원"], cta: "시작하기" },
              ].map(plan => (
                <div key={plan.name} style={{ borderRadius: 20, padding: "28px 24px", border: plan.highlight ? `2px solid ${plan.color}` : "1px solid rgba(0,0,0,0.08)", background: plan.highlight ? `${plan.color}06` : "#fff", position: "relative" }}>
                  {plan.highlight && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 12px", borderRadius: 20 }}>인기</div>}
                  <div style={{ fontSize: 14, fontWeight: 700, color: plan.color, marginBottom: 8 }}>{plan.name}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#1d1d1f", marginBottom: 4 }}>{plan.price}<span style={{ fontSize: 14, fontWeight: 500, color: "#6e6e73" }}>{plan.period}</span></div>
                  <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "16px 0" }} />
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ fontSize: 13, color: "#1d1d1f", display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={handleKakaoLogin} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: plan.highlight ? plan.color : "rgba(0,0,0,0.06)", color: plan.highlight ? "#fff" : "#1d1d1f", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "64px 24px", background: "linear-gradient(135deg, #007aff, #5856d6)", textAlign: "center", color: "#fff" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.03em" }}>지금 바로 시작해보세요</h2>
          <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 32 }}>설치 없이, 카카오 계정 하나로 1분 안에 시작 가능</p>
          <button onClick={handleKakaoLogin} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#FEE500", color: "#000", border: "none", borderRadius: 14, padding: "16px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            <span style={{ background: "#000", color: "#FEE500", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12 }}>K</span>
            카카오로 무료 시작하기
          </button>
        </section>

        {/* 푸터 */}
        <footer style={{ padding: "24px", textAlign: "center", fontSize: 12, color: "#aeaeb2", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          © 2026 OrderCatch · 소상공인을 위한 AI 주문 관리 서비스
        </footer>
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
