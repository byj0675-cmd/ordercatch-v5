"use client";
import "./landing.css";
import { signInWithKakao } from "@/utils/supabase/client";
import { showToast } from "@/app/components/Toast";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStoreProvider } from "./context/StoreContext";
import Image from "next/image";

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
  const msgs = [
    { f: "c", t: "사장님~ 딸기 케이크 2호\n4월 15일 오후 3시 픽업이요!\n010-1234-5678" },
    { f: "b", t: "✅ 주문 접수됐어요!\n\n고객명: 김수연\n상품: 딸기 케이크 2호\n픽업: 4월 15일 오후 3시\n장부에 바로 등록했습니다 📋" },
    { f: "c", t: "아 혹시 날짜 변경 돼요?\n4월 16일로 바꿀게요!" },
    { f: "b", t: "✅ 수정 완료!\n픽업일을 4월 16일로 변경했어요." },
  ];
  useEffect(() => {
    if (step >= msgs.length) { setTimeout(() => setStep(0), 3000); return; }
    const t = setTimeout(() => setStep(s => s + 1), step === 0 ? 800 : 1400);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div style={{ width: 220, height: 440, margin: "0 auto", flexShrink: 0, position: "relative" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 32, background: "#1a1a1a", boxShadow: "0 20px 60px rgba(0,0,0,0.3),inset 0 0 0 1.5px #333", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 24, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 50, height: 8, background: "#333", borderRadius: 4 }} />
        </div>
        <div style={{ background: "#FAE100", padding: "8px 12px", display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#FF7F32", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🍰</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 10, color: "#000" }}>오더캐치 봇</div>
            <div style={{ fontSize: 8, color: "#555" }}>주문 자동 등록</div>
          </div>
        </div>
        <div style={{ flex: 1, background: "#bacee0", padding: "8px 6px", display: "flex", flexDirection: "column", gap: 7, overflowY: "hidden" }}>
          {msgs.slice(0, step).map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.f === "c" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "80%", padding: "6px 9px", borderRadius: m.f === "c" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: m.f === "c" ? "#FEE500" : "#fff", fontSize: 9, lineHeight: 1.5, whiteSpace: "pre-line", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                {m.t}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "#f0f0f0", padding: "6px 10px", display: "flex", gap: 5, alignItems: "center" }}>
          <div style={{ flex: 1, height: 24, background: "#fff", borderRadius: 12, fontSize: 9, color: "#aaa", display: "flex", alignItems: "center", paddingLeft: 10 }}>메시지 입력</div>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#FF7F32", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}>↑</div>
        </div>
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
      <section style={{ paddingTop: 100, paddingBottom: 80, position: "relative" }}>
        <div className="land-hero">
          <div style={{ flex: "1 1 320px", maxWidth: 520 }}>
            <div className="land-hero-badge animate-fadeup">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF7F32", flexShrink: 0 }} />
              세 아이 아빠가 직접 만든 주문 관리 도구
            </div>
            <h1 className="land-h1 animate-fadeup">
              밤 11시, 퇴근 후에도<br />
              끝나지 않던 장부 정리.<br />
              이제 <span className="land-h1-accent">오더캐치</span>가<br />
              1분 만에 끝냅니다.
            </h1>
            <p className="land-sub animate-fadeup">
              카톡 메시지를 그대로 붙여넣으면, AI가 고객명·날짜·상품을 읽어서 장부에 바로 넣어줍니다.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={login} className="land-cta">
                <span>🎉</span>
                평생 50% 할인 혜택받고 시작하기
              </button>
            </div>
            <p className="land-note">월 20건까지 영구 무료 · 신용카드 불필요</p>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <PhoneMockup />
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
            <div className="land-bento land-bento-2" style={{ marginTop: 40, maxWidth: 760 }}>
              {[
                { icon: "📱", situation: "손님 카톡이 길면", pain: "뭐가 중요한지 다시 읽어야 해요" },
                { icon: "⏰", situation: "바쁠 때 카톡 오면", pain: "나중에 보려다 그냥 묻혀버려요" },
                { icon: "✏️", situation: "날짜 변경 연락 오면", pain: "엑셀 열어서 찾고, 고치고, 저장하고..." },
                { icon: "😰", situation: "픽업 전날 밤에", pain: "내일 몇 건인지 불안해서 한 번 더 확인" },
              ].map((item, i) => (
                <div key={i} className="land-card">
                  <div style={{ fontSize: 24, marginBottom: 12 }}>{item.icon}</div>
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
                  <>
                    <div key={s.num} className="land-step">
                      <div className="land-step-num">{s.num}</div>
                      <div className="land-step-title">{s.title}</div>
                      <div className="land-step-desc">{s.desc}</div>
                    </div>
                    {i < 2 && (
                      <div className="land-arrow" key={`arrow-${i}`}>
                        <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
                          <path d="M0 6 Q8 2 16 6 Q24 10 32 6" stroke="#FF7F32" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                          <path d="M28 3 L32 6 L28 9" stroke="#FF7F32" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </>
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
          <div className="land-bento" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {[
              { icon: "⚡", title: "붙여넣기 한 번으로 자동 등록", desc: "카톡·인스타 주문 메시지를 넣으면 AI가 즉시 분석해 장부에 올립니다." },
              { icon: "📅", title: "날짜별 정렬 장부", desc: "오늘, 내일 픽업이 몇 건인지 한눈에 확인. 놓치는 주문이 없어집니다." },
              { icon: "🔗", title: "고객 주문 링크", desc: "사장님만의 링크를 고객에게 보내면 고객이 직접 작성해 장부에 등록됩니다." },
              { icon: "✏️", title: "변경도 메시지 그대로", desc: "수정 카톡을 그대로 넣으면 알아서 내용을 찾아 수정해줍니다." },
            ].map((f, i) => (
              <R key={i} delay={i * 60}>
                <div className="land-card" style={{ height: "100%" }}>
                  <div className="land-card-icon">{f.icon}</div>
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
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#fde68a,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👨‍👧‍👦</div>
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
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,127,50,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>
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
            <p className="land-section-sub">강요 없습니다.</p>
          </R>
          <div className="land-bento land-bento-2" style={{ maxWidth: 720, margin: "0 auto" }}>
            {[
              { name: "무료", price: "0원", period: "언제까지나", featured: false, desc: "주문이 많지 않은 분들", features: ["월 20건 주문 등록", "카톡 메시지 자동 파싱", "날짜별 장부 정리"], note: "신용카드 입력 없이 바로 시작", cta: "지금 시작" },
              { name: "프로", price: "4,950원", period: "/ 월 (50% 할인)", featured: true, desc: "주문이 월 20건 넘어가는 분들", features: ["무제한 주문 등록", "고객 주문 링크 제공", "카카오 자동 수신 연동", "매출 요약 · CSV 내보내기"], note: "지금 가입하면 평생 50% 할인 혜택", cta: "50% 할인받고 시작" },
            ].map((plan, i) => (
              <R key={i} delay={i * 80}>
                <div className={`land-price-card ${plan.featured ? "featured" : ""}`}>
                  {plan.featured && <div className="land-price-badge">🔥 한정 혜택</div>}
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
                  <button onClick={login} className={plan.featured ? "land-cta" : ""} style={plan.featured ? { width: "100%", justifyContent: "center", padding: "14px" } : { width: "100%", padding: "14px", borderRadius: 12, border: "1px solid rgba(45,45,45,0.15)", background: "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    {plan.cta}
                  </button>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="land-footer-cta">
        <R>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>오늘 밤 장부 쓸 시간 아끼세요</p>
            <h2>지금 시작하면<br />오늘 주문부터 바로 됩니다.</h2>
            <p style={{ fontSize: 15, color: "#9ca3af", margin: "16px 0 36px", lineHeight: 1.7 }}>카카오 계정만 있으면 됩니다. 설치 없어요.</p>
            <button onClick={login} className="land-cta" style={{ fontSize: 16, padding: "16px 32px" }}>
              평생 50% 할인 혜택받고 시작하기
            </button>
            <p style={{ fontSize: 12, color: "#4b5563", marginTop: 14 }}>월 20건 영구 무료 · 언제든 해지 가능</p>
          </div>
        </R>
      </div>

      {/* Footer */}
      <footer style={{ padding: "28px 24px", background: "#111", textAlign: "center" }}>
        <Image src="/logo.png" alt="오더캐치" width={90} height={20} style={{ height: 20, width: "auto", filter: "brightness(0) invert(1) opacity(0.35)", marginBottom: 12 }} />
        <div style={{ fontSize: 12, color: "#374151" }}>© 2026 오더캐치 · 소상공인 주문 장부 서비스</div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 20 }}>
          {["이용약관", "개인정보처리방침", "문의"].map(t => (
            <span key={t} style={{ fontSize: 12, color: "#4b5563", cursor: "pointer" }}>{t}</span>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp { from { opacity:0;transform:translateY(16px); } to { opacity:1;transform:translateY(0); } }
        * { box-sizing:border-box; margin:0; padding:0; }
        .animate-fadeup { animation: fadeUp 0.6s ease both; }
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
