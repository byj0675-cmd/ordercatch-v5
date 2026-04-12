"use client";

import { signInWithKakao, supabase } from "@/utils/supabase/client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ── Scroll-reveal hook ──────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

// ── Phone mockup with animated KakaoTalk chat ───────────────────────────────
function PhoneMockup() {
  const [step, setStep] = useState(0);
  const messages = [
    { from: "customer", text: "사장님~ 딸기 케이크 2호 하나요\n4월 15일 오후 3시 픽업이요!\n010-1234-5678" },
    { from: "bot", text: "✅ 주문 접수됐어요!\n\n고객명: 김수연\n상품: 딸기 케이크 2호\n픽업: 4월 15일 오후 3시\n\n장부에 바로 등록했습니다 📋" },
    { from: "customer", text: "아 혹시 날짜 변경 돼요?\n4월 16일로 바꿀게요!" },
    { from: "bot", text: "✅ 수정 완료!\n\n픽업일을 4월 16일로 변경했어요." },
  ];

  useEffect(() => {
    if (step >= messages.length) return;
    const delay = step === 0 ? 800 : 1400;
    const timer = setTimeout(() => setStep(s => s + 1), delay);
    return () => clearTimeout(timer);
  }, [step]);

  // restart animation loop
  useEffect(() => {
    if (step < messages.length) return;
    const timer = setTimeout(() => setStep(0), 3000);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div style={{ position: "relative", width: 240, height: 480, margin: "0 auto", flexShrink: 0 }}>
      {/* phone frame */}
      <div style={{
        width: "100%", height: "100%", borderRadius: 36,
        background: "#1a1a1a", boxShadow: "0 24px 64px rgba(0,0,0,0.35), inset 0 0 0 2px #333",
        overflow: "hidden", display: "flex", flexDirection: "column",
        position: "relative",
      }}>
        {/* notch */}
        <div style={{ height: 28, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 60, height: 10, background: "#333", borderRadius: 5 }} />
        </div>
        {/* kakao header */}
        <div style={{ background: "#FAE100", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3A1D1D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🍰</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#000" }}>떡케이크 공방</div>
            <div style={{ fontSize: 9, color: "#555" }}>주문 자동 알림봇</div>
          </div>
        </div>
        {/* chat area */}
        <div style={{ flex: 1, background: "#bacee0", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8, overflowY: "hidden" }}>
          {messages.slice(0, step).map((msg, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: msg.from === "customer" ? "flex-end" : "flex-start",
              animation: "fadeUp 0.3s ease",
            }}>
              <div style={{
                maxWidth: "80%", padding: "7px 10px", borderRadius: msg.from === "customer" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                background: msg.from === "customer" ? "#FEE500" : "#fff",
                fontSize: 10, lineHeight: 1.5, color: "#111",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                whiteSpace: "pre-line",
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {step < messages.length && step > 0 && (
            <div style={{ display: "flex", justifyContent: messages[step]?.from === "bot" ? "flex-start" : "flex-end" }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: "7px 12px", fontSize: 10, color: "#888" }}>
                <span style={{ display: "inline-flex", gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ccc", animation: "dot 1.2s infinite" }} />
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ccc", animation: "dot 1.2s 0.2s infinite" }} />
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ccc", animation: "dot 1.2s 0.4s infinite" }} />
                </span>
              </div>
            </div>
          )}
        </div>
        {/* bottom bar */}
        <div style={{ background: "#f0f0f0", padding: "8px 12px", display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ flex: 1, height: 28, background: "#fff", borderRadius: 14, fontSize: 10, color: "#aaa", display: "flex", alignItems: "center", paddingLeft: 12 }}>메시지 입력</div>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FAE100", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>↑</div>
        </div>
      </div>
      {/* glow */}
      <div style={{ position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)", width: 160, height: 40, background: "rgba(0,100,255,0.15)", borderRadius: "50%", filter: "blur(20px)" }} />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dot { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}

// ── Reveal wrapper ──────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} style={{
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Number counter ──────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useScrollReveal();
  useEffect(() => {
    if (!visible) return;
    const duration = 1200;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Main landing content ────────────────────────────────────────────────────
function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) window.location.replace(`/auth/callback?code=${code}`);
    const error = searchParams.get("error");
    if (error) setAuthError(decodeURIComponent(error));
  }, [searchParams, router]);

  // 이미 로그인된 상태면 대시보드로
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogin = () => signInWithKakao();

  const COLOR = { primary: "#1251CC", primaryLight: "#EFF4FF", accent: "#FEE500", text: "#111827", muted: "#6B7280", border: "rgba(0,0,0,0.08)" };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif", color: COLOR.text }}>

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${COLOR.border}` : "none",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 1100, margin: "0 auto", width: "100%",
        transition: "all 0.3s ease",
      }}>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? `1px solid ${COLOR.border}` : "none",
          transition: "all 0.3s ease",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: COLOR.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📦</div>
              <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.03em" }}>OrderCatch</span>
            </div>
            <button onClick={handleLogin} style={{
              background: COLOR.accent, color: "#000", border: "none",
              borderRadius: 10, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              무료로 시작
            </button>
          </div>
        </div>
      </header>

      {/* ── Auth Error Banner ── */}
      {authError && (
        <div style={{
          position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, background: "#fee2e2", border: "1px solid #f87171",
          borderRadius: 10, padding: "12px 20px", maxWidth: 600, width: "90%",
          fontSize: 13, color: "#991b1b", fontFamily: "monospace", wordBreak: "break-all",
        }}>
          <strong>로그인 오류:</strong> {authError}
          <button onClick={() => setAuthError(null)} style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#991b1b" }}>✕</button>
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{
        paddingTop: 100, paddingBottom: 80,
        background: `linear-gradient(160deg, ${COLOR.primaryLight} 0%, #fff 60%)`,
        overflow: "hidden",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 60, flexWrap: "wrap", justifyContent: "center" }}>
          {/* copy */}
          <div style={{ flex: "1 1 340px", maxWidth: 520 }}>
            <div style={{
              display: "inline-block", padding: "5px 14px",
              background: `${COLOR.primary}15`, color: COLOR.primary,
              borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 20,
              animation: "fadeIn 0.5s ease",
            }}>
              🎯 소상공인 맞춤 주문 장부
            </div>
            <h1 style={{
              fontSize: "clamp(30px, 5vw, 50px)", fontWeight: 900, lineHeight: 1.18,
              letterSpacing: "-0.04em", marginBottom: 20, color: COLOR.text,
              animation: "fadeUp 0.6s ease",
            }}>
              카톡 주문 메시지,<br />
              <span style={{ color: COLOR.primary }}>이제 직접 받아 적지 마세요.</span>
            </h1>
            <p style={{
              fontSize: "clamp(15px, 2vw, 17px)", color: COLOR.muted, lineHeight: 1.8,
              marginBottom: 36, maxWidth: 440,
              animation: "fadeUp 0.7s ease",
            }}>
              고객 카톡을 그대로 붙여넣으면,<br />
              믿음직한 알바생처럼 알아서 장부에 정리해 드려요.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", animation: "fadeUp 0.8s ease" }}>
              <button
                onClick={handleLogin}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: COLOR.accent, color: "#000", border: "none",
                  borderRadius: 14, padding: "15px 32px", fontSize: 16, fontWeight: 700,
                  cursor: "pointer", boxShadow: "0 6px 20px rgba(254,229,0,0.4)",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                <span style={{ background: "#000", color: COLOR.accent, width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12 }}>K</span>
                카카오로 무료 시작하기
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 12 }}>신용카드 불필요 · 1개월 무료 체험</div>
          </div>

          {/* phone mockup */}
          <div style={{ flex: "0 0 auto", animation: "floatUp 0.9s ease" }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── Social proof numbers ── */}
      <section style={{ background: COLOR.primary, padding: "40px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, textAlign: "center" }}>
          {[
            { value: 1200, suffix: "+", label: "등록된 주문 건수" },
            { value: 98, suffix: "%", label: "주문 인식 정확도" },
            { value: 30, suffix: "분", label: "하루 절약 시간" },
          ].map(item => (
            <div key={item.label} style={{ color: "#fff" }}>
              <div style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: "-0.03em" }}>
                <Counter target={item.value} suffix={item.suffix} />
              </div>
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem ── */}
      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.primary, marginBottom: 12, letterSpacing: "0.06em" }}>PROBLEM</div>
              <h2 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 14 }}>
                퇴근 후에도 끊이지 않는<br />주문 카톡, 지치지 않으세요?
              </h2>
              <p style={{ color: COLOR.muted, fontSize: 15, lineHeight: 1.8 }}>
                일 끝나고 쉬는 시간에도 카톡 알림 확인하고, 엑셀 켜서 받아 적고…<br />
                혼자 다 감당하는 사장님들이 너무 많습니다.
              </p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { icon: "😩", title: "주문 정보를 일일이 받아 적어야 해요", desc: "카톡 → 엑셀 → 캘린더, 3번씩 옮겨 적는 게 일과가 됐어요" },
              { icon: "😰", title: "픽업날짜 헷갈려서 실수할까 봐 걱정", desc: "수기 장부는 수정하면 지저분해지고 놓치는 게 생겨요" },
              { icon: "😤", title: "바쁠 때 카톡 빨리 안 읽으면 불안해요", desc: "쉬는 시간에도 폰을 못 놓는 게 진짜 스트레스예요" },
            ].map(item => (
              <Reveal key={item.title} delay={80}>
                <div style={{
                  background: "#FFF8F8", border: "1px solid #FFE5E5", borderRadius: 16, padding: "24px 20px",
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#C0392B" }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: COLOR.muted, lineHeight: 1.65 }}>{item.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution / 3-step ── */}
      <section style={{ padding: "80px 24px", background: COLOR.primaryLight }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.primary, marginBottom: 12, letterSpacing: "0.06em" }}>SOLUTION</div>
              <h2 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 14 }}>
                내 손 안의 비서,<br />OrderCatch가 대신 해드려요
              </h2>
              <p style={{ color: COLOR.muted, fontSize: 15, lineHeight: 1.8 }}>
                복잡한 설정 없이, 딱 3단계로 끝납니다.
              </p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, position: "relative" }}>
            {[
              { step: "01", icon: "📱", title: "카톡 메시지 복사", desc: "고객에게 받은 주문 메시지를 길~게 그대로 복사하세요. 형식 상관없어요.", color: "#3B82F6" },
              { step: "02", icon: "📋", title: "붙여넣기 한 번", desc: "OrderCatch에 붙여넣으면 고객명·상품·날짜를 알아서 쏙쏙 뽑아냅니다.", color: COLOR.primary },
              { step: "03", icon: "✅", title: "장부에 자동 정리", desc: "캘린더 장부에 깔끔하게 등록됩니다. 수정·취소도 카톡 한 줄이면 끝!", color: "#7C3AED" },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 100}>
                <div style={{
                  background: "#fff", borderRadius: 20, padding: "30px 24px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 16, right: 16, fontSize: 32, fontWeight: 900, color: `${item.color}12`, letterSpacing: "-0.05em" }}>{item.step}</div>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${item.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>{item.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: item.color, letterSpacing: "0.06em", marginBottom: 8 }}>STEP {item.step}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: COLOR.text }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: COLOR.muted, lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ textAlign: "center", fontSize: "clamp(22px, 3.5vw, 30px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 48 }}>
              사장님 시간을 지켜주는 기능들
            </h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 2 }}>
            {[
              { icon: "🗓", title: "캘린더 장부", desc: "픽업일 기준으로 주문이 자동 정렬됩니다. 오늘·내일 픽업 건을 한눈에 파악하세요." },
              { icon: "💬", title: "카카오 자동 수신", desc: "웹훅 연동 한 번이면 카톡 주문이 자동으로 장부에 들어와요. 손 하나 안 대도 됩니다." },
              { icon: "🔗", title: "고객 주문 링크", desc: "고객이 직접 작성하는 온라인 주문서. URL 공유만으로 끝, 폼 만들 필요 없어요." },
              { icon: "✏️", title: "수정·취소 자동 반영", desc: "'날짜 바꿔주세요' 카톡 한 줄로 장부가 바로 업데이트됩니다." },
              { icon: "📊", title: "월별 매출 요약", desc: "이번 달 주문 몇 건, 얼마짜리인지 한 화면에서 확인합니다." },
              { icon: "📱", title: "모바일 최적화", desc: "가게 운영 중에도 스마트폰 한 손으로 장부를 쭉 확인할 수 있어요." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 60}>
                <div style={{
                  padding: "24px 22px", display: "flex", gap: 16, alignItems: "flex-start",
                  borderRadius: 16,
                  transition: "background 0.2s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = COLOR.primaryLight)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: COLOR.muted, lineHeight: 1.7 }}>{item.desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ padding: "80px 24px", background: "#F9FAFB" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.primary, marginBottom: 12, letterSpacing: "0.06em" }}>REVIEWS</div>
              <h2 style={{ fontSize: "clamp(22px, 3.5vw, 30px)", fontWeight: 900, letterSpacing: "-0.03em" }}>
                사장님들의 이야기
              </h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {[
              { name: "김○○ 사장님", category: "떡케이크 공방 · 경기도", stars: 5, text: "카톡으로 주문 받을 때마다 엑셀 켜서 받아 적었는데, 이제는 그냥 복붙만 하면 끝이에요. 하루에 30분은 넘게 아끼는 것 같아요." },
              { name: "이○○ 사장님", category: "네일 아트샵 · 서울", stars: 5, text: "손님이 날짜 바꿔달라고 했을 때도 메시지 그대로 넣으면 알아서 수정되더라고요. 진짜 말 잘 듣는 알바생 같아요." },
              { name: "박○○ 사장님", category: "수제 도시락 · 부산", stars: 5, text: "혼자 운영하는데 주문 관리가 제일 힘들었거든요. 픽업 날짜별로 정리되니까 실수가 확 줄었어요. 추천합니다!" },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div style={{ background: "#fff", borderRadius: 18, padding: "24px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                  <div style={{ fontSize: 14, color: "#F59E0B", marginBottom: 12 }}>{"★".repeat(t.stars)}</div>
                  <p style={{ fontSize: 14, color: COLOR.text, lineHeight: 1.75, marginBottom: 16 }}>"{t.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${COLOR.primary}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: COLOR.muted }}>{t.category}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.primary, marginBottom: 12, letterSpacing: "0.06em" }}>PRICING</div>
              <h2 style={{ fontSize: "clamp(22px, 3.5vw, 30px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 10 }}>
                부담 없이 시작하세요
              </h2>
              <p style={{ color: COLOR.muted, fontSize: 15 }}>1개월 무료 체험 후 결정하시면 됩니다</p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              {
                name: "무료 체험", price: "0원", period: "1개월", highlight: false, color: COLOR.muted,
                desc: "모든 기능을 한 달 동안 제한 없이 써보세요.",
                features: ["모든 기능 완전 개방", "주문 건수 무제한", "카카오 웹훅 포함", "1개월 후 자동 안내"],
                cta: "무료로 시작",
              },
              {
                name: "스타터", price: "9,900원", period: "/ 월", highlight: true, color: COLOR.primary,
                desc: "혼자 운영하는 1인 사장님께 딱 맞는 플랜",
                features: ["월 주문 200건", "카카오 자동 수신", "고객 주문 링크", "캘린더 장부", "CSV 내보내기"],
                cta: "시작하기",
              },
              {
                name: "프로", price: "19,900원", period: "/ 월", highlight: false, color: "#7C3AED",
                desc: "여러 매장 운영하거나 팀과 함께 쓰는 플랜",
                features: ["월 주문 무제한", "다중 매장 3개", "팀 멤버 3명", "월별 매출 리포트", "우선 고객 지원"],
                cta: "시작하기",
              },
            ].map((plan, i) => (
              <Reveal key={plan.name} delay={i * 80}>
                <div style={{
                  borderRadius: 22, padding: "30px 26px",
                  border: plan.highlight ? `2px solid ${plan.color}` : `1px solid ${COLOR.border}`,
                  background: plan.highlight ? `${plan.color}05` : "#fff",
                  position: "relative",
                  boxShadow: plan.highlight ? `0 8px 30px ${plan.color}20` : "none",
                  transition: "transform 0.2s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {plan.highlight && (
                    <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      🔥 인기
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 700, color: plan.color, marginBottom: 6 }}>{plan.name}</div>
                  <div style={{ fontSize: "clamp(24px, 3vw, 30px)", fontWeight: 900, color: COLOR.text, marginBottom: 2 }}>
                    {plan.price}
                    <span style={{ fontSize: 14, fontWeight: 500, color: COLOR.muted }}> {plan.period}</span>
                  </div>
                  <div style={{ fontSize: 13, color: COLOR.muted, marginBottom: 18, lineHeight: 1.5 }}>{plan.desc}</div>
                  <div style={{ height: 1, background: COLOR.border, margin: "0 0 18px" }} />
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: COLOR.text }}>
                        <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={handleLogin} style={{
                    width: "100%", padding: "12px", borderRadius: 12, border: "none",
                    background: plan.highlight ? plan.color : `${plan.color}10`,
                    color: plan.highlight ? "#fff" : plan.color,
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                    transition: "filter 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.08)")}
                    onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
                  >
                    {plan.cta}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: "80px 24px", background: `linear-gradient(135deg, ${COLOR.primary} 0%, #3730A3 100%)`, textAlign: "center", color: "#fff" }}>
        <Reveal>
          <div style={{ maxWidth: 580, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 14 }}>
              내 퇴근 시간,<br />앞당길 준비 됐나요?
            </h2>
            <p style={{ fontSize: 16, opacity: 0.85, marginBottom: 36, lineHeight: 1.7 }}>
              설치 없이, 카카오 계정 하나로<br />1분 안에 바로 시작할 수 있습니다.
            </p>
            <button
              onClick={handleLogin}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: COLOR.accent, color: "#000", border: "none",
                borderRadius: 14, padding: "16px 40px", fontSize: 17, fontWeight: 700,
                cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              <span style={{ background: "#000", color: COLOR.accent, width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13 }}>K</span>
              카카오로 무료 시작하기
            </button>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 14 }}>신용카드 불필요 · 언제든 해지 가능</div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "32px 24px", background: "#111827", color: "#6B7280", fontSize: 12, textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontWeight: 700, color: "#9CA3AF", marginBottom: 8 }}>OrderCatch</div>
          <div>© 2026 OrderCatch · 소상공인을 위한 자동 장부 정리 서비스</div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 20 }}>
            <span style={{ cursor: "pointer" }}>이용약관</span>
            <span style={{ cursor: "pointer" }}>개인정보처리방침</span>
            <span style={{ cursor: "pointer" }}>고객센터</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes floatUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingContent />
    </Suspense>
  );
}
