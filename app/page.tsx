"use client";
import "./landing.css";
import { signInWithKakao } from "@/utils/supabase/client";
import { showToast, ToastContainer } from "@/app/components/Toast";
import { useEffect, useRef, useState, Suspense, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStoreProvider } from "./context/StoreContext";
import Image from "next/image";
import RotatingText from "./components/RotatingText";
import BetaApplyModal from "./components/BetaApplyModal";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); ob.disconnect(); } }, { threshold: 0.1 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return { ref, v };
}

function R({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, v } = useReveal();
  return (
    <div ref={ref} style={{ transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`, opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(24px)" }}>
      {children}
    </div>
  );
}

function PhoneMockup() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, step === 2 ? 3500 : 2500);
    return () => clearInterval(timer);
  }, [step]);

  return (
    <div style={{ width: 220, height: 440, margin: "0 auto", flexShrink: 0, position: "relative" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 32, background: "#1a1a1a", boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 0 0 1.5px #333", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* Notch */}
        <div style={{ height: 24, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <div style={{ width: 50, height: 8, background: "#333", borderRadius: 4 }} />
        </div>

        {step === 0 && (
          /* Step 0: KakaoTalk Chat (Copying) */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#bacee0", animation: "fadeIn 0.3s ease" }}>
            <div style={{ background: "#FAE100", padding: "8px 12px", display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#FF7F32", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 10, color: "#000" }}>단골 고객 카톡</div>
                <div style={{ fontSize: 7, color: "#555" }}>주문 문의</div>
              </div>
            </div>
            
            <div style={{ flex: 1, padding: "20px 8px 16px", display: "flex", flexDirection: "column" }}>
              <div style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
                <div style={{ fontSize: 8, color: "#555", marginBottom: 3 }}>김수연 고객님</div>
                <div style={{ background: "#fff", padding: "8px 10px", borderRadius: "2px 12px 12px 12px", fontSize: 9, lineHeight: 1.5, whiteSpace: "pre-line", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", position: "relative" }}>
                  사장님~ 딸기 케이크 2호{"\n"}
                  4월 15일 오후 3시 픽업이요!{"\n"}
                  010-1234-5678
                  
                  {/* Floating Action Badge */}
                  <div style={{ position: "absolute", bottom: -28, right: 0, background: "#FF7F32", color: "#fff", fontSize: 8, fontWeight: 900, padding: "4px 8px", borderRadius: 8, boxShadow: "0 4px 12px rgba(255,127,50,0.4)", animation: "pulse 1.2s infinite", whiteSpace: "nowrap", zIndex: 5, display: "flex", alignItems: "center", gap: 3 }}>
                    주문 메시지 복사
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Keyboard input bar */}
            <div style={{ background: "#f0f0f0", padding: "6px 10px", display: "flex", gap: 5, alignItems: "center" }}>
              <div style={{ flex: 1, height: 24, background: "#fff", borderRadius: 12 }} />
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}>↑</div>
            </div>
          </div>
        )}

        {step === 1 && (
          /* Step 1: OrderCatch Paste */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f9f9f9", animation: "fadeIn 0.3s ease" }}>
            <div style={{ background: "#fff", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <Image src="/logo.png" alt="오더캐치" width={55} height={12} style={{ height: 12, width: "auto" }} />
              <div style={{ background: "#FFF0E6", color: "#FF7F32", fontSize: 6, fontWeight: 800, padding: "1px 4px", borderRadius: 3 }}>대시보드</div>
            </div>

            <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: "#666", display: "flex", alignItems: "center", gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
                복사한 메시지 붙여넣기
              </div>
              <div style={{ flex: 1, background: "#fff", border: "1.5px solid #FF7F32", borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", position: "relative" }}>
                <div style={{ fontSize: 9, lineHeight: 1.4, color: "#2D2D2D", whiteSpace: "pre-line", flex: 1, borderRight: "2px solid #FF7F32", animation: "blink 0.8s infinite" }}>
                  사장님~ 딸기 케이크 2호{"\n"}
                  4월 15일 오후 3시 픽업이요!{"\n"}
                  010-1234-5678
                </div>
                
                {/* Simulated Clickable Button */}
                <div style={{ background: "#FF7F32", color: "#fff", fontSize: 8, fontWeight: 800, padding: "5px 0", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 4 }}>
                  자동 등록하기
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          /* Step 2: Order Registered */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#FDFBF9", animation: "fadeIn 0.3s ease" }}>
            <div style={{ background: "#fff", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <Image src="/logo.png" alt="오더캐치" width={55} height={12} style={{ height: 12, width: "auto" }} />
              <div style={{ background: "#E8F5E9", color: "#4A7C59", fontSize: 6, fontWeight: 800, padding: "1px 4px", borderRadius: 3 }}>달력 장부</div>
            </div>

            <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
              <div style={{ textAlign: "center", margin: "4px 0" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#4A7C59" }}>자동 등록 완료!</div>
                <div style={{ fontSize: 7, color: "#888", marginTop: 2 }}>달력과 장부에 깔끔하게 기록되었습니다.</div>
              </div>

              {/* Parsed Result Card */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(74,124,89,0.15)", padding: 8, boxShadow: "0 6px 16px rgba(74,124,89,0.06)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f5f5f5", paddingBottom: 3, alignItems: "center" }}>
                    <span style={{ color: "#888", display: "flex", alignItems: "center", gap: 2.5 }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      픽업일시
                    </span>
                    <span style={{ fontWeight: 700, color: "#2D2D2D" }}>4월 15일 15:00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f5f5f5", paddingBottom: 3, alignItems: "center" }}>
                    <span style={{ color: "#888", display: "flex", alignItems: "center", gap: 2.5 }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      고객정보
                    </span>
                    <span style={{ fontWeight: 700, color: "#2D2D2D" }}>김수연 (5678)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#888", display: "flex", alignItems: "center", gap: 2.5 }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                      주문상품
                    </span>
                    <span style={{ fontWeight: 700, color: "#FF7F32" }}>딸기 케이크 2호</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function LandingContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { loginAsMockUser } = useStoreProvider();
  const [scrolled, setScrolled] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  useEffect(() => {
    const err = sp.get("error");
    if (err) showToast(`로그인 오류: ${decodeURIComponent(err)}`, "error");
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    setIsLocal(["localhost","127.0.0.1","[::1]"].includes(window.location.hostname));
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const login = () => signInWithKakao();

  return (
    <div className="land">
      {/* Nav */}
      <nav className="land-nav" style={{ boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.06)" : "none" }}>
        <div className="land-nav-inner">
          <Image src="/logo.png" alt="오더캐치" width={110} height={24} style={{ height: 24, width: "auto" }} priority />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {isLocal && (
              <button onClick={() => { loginAsMockUser(); router.push("/dashboard"); }} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 10, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                🛠️ 개발자
              </button>
            )}
            <button onClick={login} className="land-cta" style={{ padding: "9px 20px", fontSize: 14 }}>무료로 시작</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="land-hero" style={{ maxWidth: 1100, margin: "0 auto", padding: "140px 24px 100px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div className="land-hero-badge animate-fadeup">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF7F32", flexShrink: 0 }} />
              세 아이 아빠가 직접 만든 주문 관리 도구
            </div>
            <h1 className="land-h1 animate-fadeup" style={{ animationDelay: "100ms" }}>
              주문 정리가 막막한<br className="block md:hidden" /> <RotatingText /><br className="hidden md:block" />
              사장님을 위해 이제 <span className="land-h1-accent">오더캐치</span>가<br />
              알아서 장부에 적어둘게요.
            </h1>
          </div>
          
          <div className="land-hero-bottom animate-fadeup" style={{ animationDelay: "200ms" }}>
            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "120%", height: "120%", background: "radial-gradient(circle, rgba(255,127,50,0.15) 0%, rgba(255,127,50,0) 65%)", zIndex: 0 }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <PhoneMockup />
              </div>
            </div>
            <div className="land-hero-bottom-text">
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 32px)", fontWeight: 900, marginBottom: "20px", color: "#2D2D2D", lineHeight: 1.4, letterSpacing: "-0.03em" }}>
                복사해서 붙여넣기만 하세요.<br/>AI가 알아서 달력에 정리합니다.
              </h2>
              <p style={{ fontSize: "16px", color: "#666", lineHeight: 1.7, marginBottom: "40px" }}>
                카톡 메시지를 그대로 복사해서 붙여넣기만 하세요.<br className="hidden md:block" />
                AI가 알아서 날짜, 고객명, 상품을 파악하고 달력에 깔끔하게 정리해 드립니다.<br className="hidden md:block" />
                놓치는 주문 없이 마음 편하게 장사하세요.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "inherit" }}>
                <button onClick={login} className="land-cta">
                  평생 50% 할인 혜택받고 시작하기
                </button>
              </div>
              <p className="land-note" style={{ marginTop: "16px" }}>월 20건까지 영구 무료 · 신용카드 불필요</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pain section */}
      <section className="land-section" style={{ background: "#fff", borderTop: "1px solid rgba(45,45,45,0.07)" }}>
        <div className="land-section-inner">
          <R>
            <div className="land-section-label">사장님들의 진짜 이야기</div>
            <h2 className="land-section-title" style={{ maxWidth: 600 }}>
              "주문 카톡 오면 일단 읽고,<br />
              나중에 엑셀에 옮겨 적어야 하는데<br />
              <span style={{ color: "#c0392b" }}>그 '나중에'를 자꾸 까먹어서..."</span>
            </h2>
          </R>
          <R delay={80}>
            <div className="land-bento land-bento-2" style={{ margin: "40px auto 0", maxWidth: 760 }}>
              {[
                { 
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7F32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                      <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                  ),
                  situation: "손님 카톡이 길면", 
                  pain: "뭐가 중요한지 다시 읽어야 해요" 
                },
                { 
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7F32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  ),
                  situation: "바쁠 때 카톡 오면", 
                  pain: "나중에 보려다 그냥 묻혀버려요" 
                },
                { 
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7F32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  ),
                  situation: "날짜 변경 연락 오면", 
                  pain: "엑셀 열어서 찾고, 고치고, 저장하고..." 
                },
                { 
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7F32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  ),
                  situation: "픽업 전날 밤에", 
                  pain: "내일 몇 건인지 불안해서 한 번 더 확인" 
                },
              ].map((item, i) => (
                <div key={i} className="land-card">
                  <div style={{ marginBottom: 12 }}>{item.icon}</div>
                  <div style={{ fontSize: 12, color: "#FF7F32", fontWeight: 700, marginBottom: 6 }}>{item.situation}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#2D2D2D" }}>{item.pain}</div>
                </div>
              ))}
            </div>
          </R>
        </div>
      </section>

      {/* Process diagram */}
      <section className="land-section" style={{ background: "var(--off-white)" }}>
        <div className="land-section-inner">
          <R>
            <div className="land-section-label">어떻게 작동하나요</div>
            <h2 className="land-section-title">진짜 별거 없어요.</h2>
            <p className="land-section-sub" style={{ maxWidth: 480 }}>카톡 띄워놓고 옆에서 따라 해보시면 1분 안에 끝납니다.</p>
          </R>
          <R delay={80}>
            <div style={{ background: "#fff", border: "1px solid rgba(45,45,45,0.08)", borderRadius: 20, padding: "40px 32px", maxWidth: 800, margin: "0 auto" }}>
              <div className="land-process">
                {[
                  { num: "01", title: "카톡 메시지 복사", desc: "고객에게 받은 주문 메시지를 그대로 복사" },
                  { num: "02", title: "오더캐치에 붙여넣기", desc: "AI가 고객명·날짜·상품·연락처를 자동 추출" },
                  { num: "03", title: "장부에 즉시 등록", desc: "날짜별로 정렬된 장부에 바로 반영" },
                ].map((s, i) => (
                  <Fragment key={s.num}>
                    <div className="land-step">
                      <div className="land-step-num">{s.num}</div>
                      <div className="land-step-title">{s.title}</div>
                      <div className="land-step-desc">{s.desc}</div>
                    </div>
                    {i < 2 && (
                      <div className="land-arrow">
                        <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
                          <path d="M0 6 Q8 2 16 6 Q24 10 32 6" stroke="#FF7F32" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                          <path d="M28 3 L32 6 L28 9" stroke="#FF7F32" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          </R>
        </div>
      </section>

      {/* Bento features */}
      <section className="land-section" style={{ background: "#fff", borderTop: "1px solid rgba(45,45,45,0.07)" }}>
        <div className="land-section-inner">
          <R>
            <div className="land-section-label">핵심 기능</div>
            <h2 className="land-section-title">엑셀이나 수기 장부와 뭐가 달라요?</h2>
            <p className="land-section-sub">딱 하나, 카톡을 사람이 읽고 정리하는 것처럼 해주는 게 핵심이에요.</p>
          </R>
          <div className="land-bento" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {[
              { 
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7F32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                ), 
                title: "붙여넣기 한 번으로 자동 등록", 
                desc: "카톡·인스타 주문 메시지를 넣으면 AI가 즉시 분석해 장부에 올립니다." 
              },
              { 
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7F32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                ), 
                title: "날짜별 정렬 장부", 
                desc: "오늘, 내일 픽업이 몇 건인지 한눈에 확인. 놓치는 주문이 없어집니다." 
              },
              { 
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7F32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                ), 
                title: "변경도 메시지 그대로", 
                desc: "수정 카톡을 그대로 넣으면 알아서 내용을 찾아 수정해줍니다." 
              },
            ].map((f, i) => (
              <R key={i} delay={i * 60}>
                <div className="land-card" style={{ height: "100%" }}>
                  <div className="land-card-icon" style={{ display: "flex", alignItems: "center" }}>{f.icon}</div>
                  <div className="land-card-title">{f.title}</div>
                  <div className="land-card-desc">{f.desc}</div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* Letter */}
      <section className="land-section" style={{ background: "#fdf8f4" }}>
        <div className="land-section-inner">
          <R>
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
              <div className="land-section-label" style={{ marginBottom: 24 }}>오더캐치를 만든 사람이 드리는 말씀</div>
              <div className="land-letter">
                <div className="land-letter-quote">
                  <p style={{ marginBottom: 16 }}>안녕하세요. 저도 한때 떡집을 운영하면서 세 아이를 키웠어요. 낮에는 장사하고, 밤엔 애들 재우고 나서 <strong style={{ color: "#7C4A1A" }}>밤 11시부터 진짜 업무가 시작</strong>되는 생활이었어요.</p>
                  <div className="land-letter-highlight">
                    '이 카톡 내용을 누군가가 대신 읽고 장부에 넣어주면 얼마나 좋을까.' 그 생각 하나로 만들었어요.
                  </div>
                  <p>오더캐치가 대단한 서비스는 아니에요. 그냥 사장님들이 <strong style={{ color: "#7C4A1A" }}>그 반복 작업 하나만 없애도 저녁이 생기지 않을까</strong> 해서 만든 거예요.</p>
                </div>
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px dashed rgba(150,100,40,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#fde68a,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#3d2b1a" }}>오더캐치 개발자</div>
                      <div style={{ fontSize: 12, color: "#9C6B2E" }}>세 아이 아빠, 전 떡집 운영</div>
                    </div>
                  </div>
                  <button onClick={login} className="land-cta" style={{ padding: "11px 22px", fontSize: 14 }}>일단 한 번 써보기 →</button>
                </div>
              </div>
            </div>
          </R>
        </div>
      </section>

      {/* Reviews */}
      <section className="land-section" style={{ background: "#fff", borderTop: "1px solid rgba(45,45,45,0.07)" }}>
        <div className="land-section-inner">
          <R>
            <div className="land-section-label">쓰고 있는 분들</div>
            <h2 className="land-section-title">베타 기간에 먼저 쓰고 계신 사장님들 얘기예요</h2>
          </R>
          <div className="land-bento land-bento-3">
            {[
              { name: "홍○○", job: "레터링 케이크 공방, 3년째", text: "써보니까 제가 대충 쓰는 카톡도 날짜 빼먹은 거 잡아내더라고요. 지금은 카톡 주문 오면 무조건 여기에 붙여넣고 확인하는 게 루틴이 됐어요." },
              { name: "강○○", job: "네일샵, 혼자 운영", text: "캘린더 앱이랑 카톡이랑 왔다갔다 하는 게 진짜 귀찮았거든요. 여기 쓰고 나서 그 동선이 없어졌어요." },
              { name: "윤○○", job: "수제 빵집, 제주", text: "픽업 날짜를 틀린 적이 있었어요. 그 이후로 무조건 원문 메시지 복붙 방식으로 바꿨어요. 제가 개입하면 실수가 나는 거니까요." },
            ].map((r, i) => (
              <R key={i} delay={i * 60}>
                <div className="land-review">
                  <div className="land-review-text">"{r.text}"</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,127,50,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF7F32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name} 사장님</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{r.job}</div>
                    </div>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="land-section" style={{ background: "var(--off-white)" }}>
        <div className="land-section-inner">
          <R>
            <div className="land-section-label">요금표</div>
            <h2 className="land-section-title">부담 없이 쓰시다가 필요하면 올리세요.</h2>
            <p className="land-section-sub" style={{ color: "#FF7F32", fontWeight: 700 }}>🎁 1기 사전 신청 시 정가 인상 후에도 평생 월 4,950원 동결 혜택 제공</p>
          </R>
          <div className="land-bento land-bento-2" style={{ maxWidth: 720, margin: "0 auto" }}>
            {[
              { name: "무료", price: "0원", period: "언제까지나", featured: false, desc: "주문이 많지 않은 분들", features: ["월 20건 주문 등록", "카톡 메시지 자동 파싱", "날짜별 장부 정리"], note: "신용카드 입력 없이 바로 시작", cta: "지금 시작", action: login },
              { name: "프로", price: "4,950원", period: "/ 월", featured: true, desc: "주문이 월 20건 넘어가는 분들 (정가 9,900원 예정)", features: ["무제한 주문 등록", "카카오 자동 수신 연동", "매출 요약 · CSV 내보내기"], note: "자동화 업데이트 후 정가 인상 시에도 평생 4,950원 동결", cta: "1기 사전 경험단 신청하기", action: () => setIsBetaModalOpen(true) },
            ].map((plan, i) => (
              <R key={i} delay={i * 80}>
                <div className={`land-price-card ${plan.featured ? "featured" : ""}`}>
                  {plan.featured && (
                    <div className="land-price-badge" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      선착순 15명 한정 (1기)
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 700, color: plan.featured ? "#FF7F32" : "#888", marginBottom: 8 }}>{plan.name}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{plan.price} <span style={{ fontSize: 13, fontWeight: 400, color: "#888" }}>{plan.period}</span></div>
                  <div style={{ fontSize: 13, color: "#777", marginBottom: 20, lineHeight: 1.5 }}>{plan.desc}</div>
                  <div style={{ height: 1, background: "rgba(45,45,45,0.08)", marginBottom: 20 }} />
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: "flex", gap: 8, fontSize: 14 }}>
                        <span style={{ color: "#FF7F32", fontWeight: 700 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>{plan.note}</div>
                  <button onClick={plan.action} className={plan.featured ? "land-cta" : ""} style={plan.featured ? { width: "100%", justifyContent: "center", padding: "14px" } : { width: "100%", padding: "14px", borderRadius: 12, border: "1px solid rgba(45,45,45,0.15)", background: "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    {plan.cta}
                  </button>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer CTA */}
      <div className="land-footer-cta">
        <R>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>오늘 밤 장부 쓸 시간 아끼세요</p>
            <h2>지금 신청하면<br />평생 월 4,950원 요금 동결</h2>
            <p style={{ fontSize: 15, color: "#9ca3af", margin: "16px 0 36px", lineHeight: 1.7 }}>카카오 계정만 있으면 즉시 시작할 수 있습니다.</p>
            <button onClick={() => setIsBetaModalOpen(true)} className="land-cta" style={{ fontSize: 16, padding: "16px 32px" }}>
              평생 가격 동결받고 1기 사전 신청하기
            </button>
            <p style={{ fontSize: 12, color: "#4b5563", marginTop: 14 }}>선착순 15명 한정 모집 중 · 첫 달 무료 체험</p>
          </div>
        </R>
      </div>

      {/* Footer */}
      <footer style={{ padding: "40px 24px", background: "#111", textAlign: "center" }}>
        <Image src="/logo.png" alt="오더캐치" width={90} height={20} style={{ height: 20, width: "auto", filter: "brightness(0) invert(1) opacity(0.35)", marginBottom: 20 }} />
        
        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.8, marginBottom: 16 }}>
          상호명: 두근상사 | 대표자: 변영조<br />
          사업자등록번호: 140-43-00585 | 통신판매업신고번호: 제 2019-광주북구-0099 호<br />
          고객센터: 010-4885-6675 | 이메일 (고객지원 및 제휴/협업 문의): byj0675@naver.com<br />
          주소: 광주광역시 북구 군왕로 311, 104동 401호 (각화동, 서희스타힐스)
        </div>

        <div style={{ marginTop: 16, marginBottom: 20, display: "flex", justifyContent: "center", gap: 20 }}>
          <a href="/terms" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none", cursor: "pointer" }}>이용약관</a>
          <a href="/privacy" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none", cursor: "pointer" }}>개인정보처리방침</a>
          <a href="/refund-policy" style={{ fontSize: 12, color: "#4b5563", textDecoration: "none", cursor: "pointer" }}>환불/해지 정책</a>
          <span style={{ fontSize: 12, color: "#4b5563", cursor: "pointer" }}>문의</span>
        </div>

        <div style={{ fontSize: 11, color: "#374151" }}>© 2026 오더캐치 · 소상공인 주문 장부 서비스</div>
      </footer>

      {/* Beta Apply Modal */}
      <BetaApplyModal isOpen={isBetaModalOpen} onClose={() => setIsBetaModalOpen(false)} />

      {/* Toast Notification Container */}
      <ToastContainer />

      <style>{`
        @keyframes fadeUp { from { opacity:0;transform:translateY(16px); } to { opacity:1;transform:translateY(0); } }
        * { box-sizing:border-box; margin:0; padding:0; }
        .animate-fadeup { animation: fadeUp 0.6s ease both; }
      `}</style>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(45, 45, 45, 0.08)", padding: "18px 0" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: "8px 0", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: "16px", fontWeight: 800, color: "#2D2D2D", letterSpacing: "-0.02em" }}>
          {question}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#666"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease", flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div style={{ maxHeight: isOpen ? "200px" : "0px", overflow: "hidden", transition: "max-height 0.3s ease, margin-top 0.3s ease", marginTop: isOpen ? "10px" : "0px" }}>
        <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.6 }}>
          {answer}
        </p>
      </div>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "Q. 개인정보나 주문 데이터는 안전하게 보관되나요?",
      answer: "네, 오더캐치는 로컬 퍼스트(Local-first) 기술을 적용하여 사장님의 브라우저/기기에 주문 데이터를 우선 암호화하여 저장하며, 안전한 Supabase 클라우드 데이터베이스에 실시간으로 이중 백업됩니다. 유출이나 분실 우려 없이 안심하고 관리하실 수 있습니다."
    },
    {
      question: "Q. 카카오톡 메시지를 복사할 때 특정 형식이 정해져 있나요?",
      answer: "정해진 형식이 전혀 없습니다! 손님이 보낸 카카오톡 메시지나 인스타그램 DM을 드래그해서 그대로 복사(Ctrl+C)한 뒤 복붙창에 붙여넣기만 하시면, 오더캐치 AI가 문맥을 파악해 이름, 연락처, 픽업 날짜, 상품명을 지능적으로 알아서 분류해 줍니다."
    },
    {
      question: "Q. 무료 사용 한도(월 20건)를 초과하면 자동으로 결제가 되나요?",
      answer: "아닙니다! 오더캐치는 사전 신용카드 등록을 요구하지 않으므로, 무료 건수가 초과하더라도 요금이 자동으로 결제될 걱정이 전혀 없습니다. 월 20건을 초과하여 추가 등록을 원하실 때만 결제 신청을 통해 직접 프로 요금제로 업그레이드하시면 됩니다."
    },
    {
      question: "Q. 여러 기기(스마트폰, PC, 태블릿)에서 동시에 사용 가능한가요?",
      answer: "네, 동일한 카카오 계정으로 로그인하시면 스마트폰, PC, 태블릿 등 기기 제약 없이 모든 주문 데이터가 실시간으로 완벽하게 동기화되어 언제 어디서나 편리하게 장부를 확인하실 수 있습니다."
    },
    {
      question: "Q. 결제 신청을 하면 어떻게 진행되나요?",
      answer: "PRO 요금제 '결제 신청'을 하시면, 사장님의 휴대폰으로 '결제선생' 카카오톡 알림톡 결제 요청이 발송됩니다. 알림톡을 통해 카드 결제, 카카오페이 등으로 간편하게 수납이 완료되면, 관리자가 확인 후 즉시 무제한 이용 등급(PRO)으로 활성화해 드립니다."
    }
  ];

  return (
    <section className="land-section" style={{ background: "#fff", borderTop: "1px solid rgba(45,45,45,0.07)", paddingBottom: "100px" }}>
      <div className="land-section-inner" style={{ maxWidth: "720px", margin: "0 auto" }}>
        <R>
          <div className="land-section-label" style={{ textAlign: "center" }}>FAQ</div>
          <h2 className="land-section-title" style={{ textAlign: "center", marginBottom: "40px" }}>자주 묻는 질문</h2>
        </R>
        <R delay={80}>
          <div style={{ background: "rgba(255, 127, 50, 0.02)", border: "1px solid rgba(255, 127, 50, 0.08)", borderRadius: "24px", padding: "24px 32px", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </R>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingContent />
    </Suspense>
  );
}
