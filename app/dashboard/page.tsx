"use client";

import { useState, useMemo, useEffect } from "react";
import {
  STATUS_CONFIG,
  SOURCE_CONFIG,
  type Order,
  type OrderStatus,
} from "../lib/mockData";
import { ToastContainer, showToast } from "../components/Toast";
import CalendarView from "../components/CalendarView";
import OrderDetailModal from "../components/OrderDetailModal";
import SettingsModal from "../components/SettingsModal";
import PasteBoard from "../components/PasteBoard";
import { useStoreProvider } from "../context/StoreContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";


type ViewMode = "calendar" | "list";

const SUMMARY_CARDS = [
  { key: "all", label: "전체 주문", icon: "📋", color: "#007aff", bg: "rgba(0,122,255,0.08)" },
  { key: "입금대기", label: "입금 대기", icon: "⏳", color: "#ff9500", bg: "rgba(255,149,0,0.08)" },
  { key: "제작중", label: "제작 중", icon: "🔨", color: "#007aff", bg: "rgba(0,122,255,0.08)" },
  { key: "픽업예정", label: "오늘 픽업", icon: "🚀", color: "#af52de", bg: "rgba(175,82,222,0.08)" },
  { key: "픽업완료", label: "픽업 완료", icon: "✅", color: "#34c759", bg: "rgba(52,199,89,0.08)" },
  { key: "취소됨", label: "취소", icon: "❌", color: "#ff3b30", bg: "rgba(255,59,48,0.08)" },
] as const;

type FilterKey = (typeof SUMMARY_CARDS)[number]["key"];

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [isFetching, setIsFetching] = useState(false);

  const { profile, loading, updateStoreProfile } = useStoreProvider();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardName, setOnboardName] = useState("");
  const [onboardCategory, setOnboardCategory] = useState("dessert");
  const [onboardOwner, setOnboardOwner] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 1회만 표시되도록 단순 타이머 처리
    const timer = setTimeout(() => {
      showToast("우측 상단 ⚙️설정에서 내 매장 고유 링크를 확인하세요!", "info", "✨");
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session?.user) {
          router.replace("/");
        } else if (!profile || !profile.store_name) {
          setShowOnboarding(true);
        } else {
          setShowOnboarding(false);
          // 프로필이 있으면 데이터 가져오기
          fetchOrders(profile.id);
        }
      });
    }
  }, [profile, loading, router]);

  const fetchOrders = async (userId: string) => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', userId)
        .order('pickup_date', { ascending: true });

      if (error) throw error;

      if (data) {
        // DB snake_case -> FE camelCase 매핑
        const mappedOrders: Order[] = data.map((o: any) => ({
          id: o.id,
          storeId: o.store_id,
          storeName: profile?.store_name || "",
          storeType: (profile?.category as any) || "dessert",
          customerName: o.customer_name,
          phone: o.phone,
          productName: o.product_name,
          pickupDate: o.pickup_date,
          status: o.status as OrderStatus,
          amount: Number(o.amount) || 0,
          source: o.source as any,
          options: o.options || {},
          createdAt: o.created_at,
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      showToast("데이터를 불러오지 못했습니다.", "error");
    } finally {
      setIsFetching(false);
    }
  };

  // Active store for settings (Simplified for SaaS profile)
  const activeStore = {
    id: profile?.id || "",
    name: profile?.store_name || "",
    type: (profile?.category as any) || "dessert",
    owner: profile?.owner_name || "",
    webhookUrl: `/api/webhook/kakao?storeId=${profile?.store_slug || ""}`,
    orderLink: `/order/${profile?.store_slug || ""}`,
    avatar: "🏪",
    color: "#007aff",
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders;
    // Store filter
    if (selectedStoreId !== "all") {
      result = result.filter((o) => o.storeId === selectedStoreId);
    }
    // Status filter
    if (activeFilter !== "all") {
      if (activeFilter === "픽업예정") {
        // "오늘 픽업" = pickup status AND today
        const today = new Date();
        result = result.filter((o) => {
          const d = new Date(o.pickupDate);
          return (
            o.status === "픽업예정" &&
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
          );
        });
      } else {
        result = result.filter((o) => o.status === activeFilter);
      }
    }
    return result;
  }, [orders, activeFilter, selectedStoreId]);

  // Summary counts
  const summaryData = useMemo(() => {
    const storeOrders = selectedStoreId === "all" ? orders : orders.filter((o) => o.storeId === selectedStoreId);
    const today = new Date();
    return {
      all: storeOrders.length,
      입금대기: storeOrders.filter((o) => o.status === "입금대기").length,
      제작중: storeOrders.filter((o) => o.status === "제작중").length,
      픽업예정: storeOrders.filter((o) => {
        const d = new Date(o.pickupDate);
        return o.status === "픽업예정" && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      }).length,
      픽업완료: storeOrders.filter((o) => o.status === "픽업완료").length,
      취소됨: storeOrders.filter((o) => o.status === "취소됨").length,
    };
  }, [orders, selectedStoreId]);

  // Revenue
  const totalRevenue = useMemo(
    () => filteredOrders.reduce((s, o) => s + o.amount, 0),
    [filteredOrders]
  );

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      }
      showToast(`상태가 [${newStatus}]로 변경되었습니다.`, "success");
    } catch (err) {
      console.error("Update status error:", err);
      showToast("상태 변경에 실패했습니다.", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
      showToast("로그아웃 되었습니다.", "info", "👋");
    } catch (err) {
      console.error("Logout error:", err);
      showToast("로그아웃 중 오류가 발생했습니다.", "error");
    }
  };

  // Format pickup date
  const formatPickup = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = d.getHours();
    const mm = d.getMinutes();
    return `${m}월 ${day}일 ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const nowStr = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <>
      <ToastContainer />

      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        {/* ── Topbar ── */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "rgba(245,245,247,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              maxWidth: 1400,
              margin: "0 auto",
              padding: "0 24px",
              height: 58,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, #007aff, #5856d6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  boxShadow: "0 2px 8px rgba(0,122,255,0.3)",
                }}
              >
                📦
              </div>
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
                OrderCatch
              </span>
            </div>

            {/* Store selector removed for single SaaS user view */}
            <div style={{ flex: 1 }}></div>

            {/* Right actions */}
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                className="btn btn-ghost"
                onClick={handleLogout}
                style={{ borderRadius: 10, fontSize: 13, padding: "6px 12px", color: "var(--text-secondary)" }}
              >
                로그아웃
              </button>
              <button
                id="settings-btn"
                className="btn btn-ghost"
                onClick={() => setShowSettings(true)}
                style={{ borderRadius: 10, fontSize: 13, padding: "6px 12px", background: "rgba(0,0,0,0.04)" }}
              >
                ⚙️ 설정
              </button>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="main-pad">
            {/* Page heading */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 3 }}>{nowStr}</div>
            <h1 className="page-title">
              {profile?.store_name ?? "매장 이름 설정 중..."}
            </h1>
            {activeFilter !== "all" && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>필터:</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 12px",
                    borderRadius: 20,
                    background: STATUS_CONFIG[activeFilter as OrderStatus]?.bg ?? "rgba(0,0,0,0.08)",
                    color: STATUS_CONFIG[activeFilter as OrderStatus]?.color ?? "var(--text-primary)",
                  }}
                >
                  {SUMMARY_CARDS.find((c) => c.key === activeFilter)?.label}
                </span>
                <button
                  style={{ fontSize: 12, color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => setActiveFilter("all")}
                >
                  ✕ 필터 해제
                </button>
              </div>
            )}
          </div>

          {/* ── Summary Cards: 3열(모바일) → 6열(데스크탑) ── */}
          <div className="summary-grid">
            {SUMMARY_CARDS.map((card) => {
              const count = summaryData[card.key];
              const isActive = activeFilter === card.key;
              return (
                <button
                  key={card.key}
                  id={`filter-${card.key}`}
                  onClick={() => setActiveFilter(card.key)}
                  className="glass-card summary-card-pad"
                  style={{
                    border: isActive ? `2px solid ${card.color}` : "1px solid var(--border)",
                    borderRadius: 14,
                    cursor: "pointer",
                    textAlign: "left",
                    background: isActive ? card.color + "14" : "var(--bg-card)",
                    transition: "all 0.2s ease",
                    transform: isActive ? "translateY(-2px)" : "none",
                    boxShadow: isActive ? `0 8px 24px ${card.color}22` : "var(--shadow-sm)",
                  }}
                >
                  <div className="summary-card-icon">{card.icon}</div>
                  <div
                    className="summary-card-count"
                    style={{ color: isActive ? card.color : "var(--text-primary)" }}
                  >
                    {count}
                  </div>
                  <div
                    className="summary-card-label"
                    style={{ color: isActive ? card.color : "var(--text-secondary)", fontWeight: isActive ? 700 : 500 }}
                  >
                    {card.label}
                  </div>
                  {card.key === "all" && totalRevenue > 0 && (
                    <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 3, fontWeight: 600 }}>
                      {totalRevenue.toLocaleString()}원
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Paste Wizard ── */}
          <div style={{ marginBottom: 20 }}>
            {profile?.id && <PasteBoard onParsed={() => fetchOrders(profile.id)} storeId={profile.id} />}
          </div>

          {/* ── View toggle + list header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              주문 내역{" "}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
                {filteredOrders.length}건
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 2,
                background: "rgba(0,0,0,0.07)",
                padding: 3,
                borderRadius: 10,
              }}
            >
              {(["calendar", "list"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    background: viewMode === mode ? "#fff" : "transparent",
                    color: viewMode === mode ? "var(--text-primary)" : "var(--text-secondary)",
                    boxShadow: viewMode === mode ? "var(--shadow-sm)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {mode === "calendar" ? "📅 캘린더" : "📋 목록"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Main View ── */}
          <div
            className="glass-card"
            style={{ overflow: "hidden", borderRadius: 20 }}
          >
            {viewMode === "calendar" ? (
              filteredOrders.length === 0 ? (
                <EmptyState filter={activeFilter} />
              ) : (
                <CalendarView
                  orders={filteredOrders}
                  onOrderClick={setSelectedOrder}
                />
              )
            ) : (
              filteredOrders.length === 0 ? (
                <EmptyState filter={activeFilter} />
              ) : (
                <ListView
                  orders={filteredOrders}
                  onOrderClick={setSelectedOrder}
                  formatPickup={formatPickup}
                  profile={profile}
                />
              )
            )}
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {showSettings && (
        <SettingsModal
          store={activeStore}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── Onboarding Modal ── */}
      {showOnboarding && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <div
            className="animate-scaleIn"
            style={{
              background: "#fff", padding: "32px", borderRadius: "24px",
              width: "100%", maxWidth: "400px", boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              display: "flex", flexDirection: "column", gap: 20, maxHeight: "90vh", overflowY: "auto"
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
              환영합니다! 매장 정보를 설정해 주세요 🎉
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              AI 비서가 주문서를 똑똑하게 분석할 수 있도록 정확한 정보를 선택해 주세요.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)" }}>업종 카테고리</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { id: "dessert", label: "🍬 디저트" },
                  { id: "nail", label: "💅 네일" },
                  { id: "bakery", label: "🥐 베이커리" },
                  { id: "flower", label: "🌸 플라워" },
                  { id: "restaurant", label: "🍽️ 식당" },
                  { id: "other", label: "✨ 기타" }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setOnboardCategory(cat.id)}
                    style={{
                      padding: "8px 14px", borderRadius: "100px", border: "1px solid", fontSize: "14px",
                      borderColor: onboardCategory === cat.id ? "var(--accent)" : "var(--border)",
                      background: onboardCategory === cat.id ? "var(--accent-soft)" : "#fff",
                      color: onboardCategory === cat.id ? "var(--accent)" : "var(--text-secondary)",
                      fontWeight: onboardCategory === cat.id ? 700 : 500, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)" }}>공식 매장 상호명</label>
              <input
                type="text"
                placeholder="예: 아만다 떡케이크 역삼점"
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                style={{
                  padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--border)",
                  fontSize: "15px", outline: "none", width: "100%", background: "var(--bg-secondary)"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)" }}>대표자 성함</label>
              <input
                type="text"
                placeholder="예: 홍길동"
                value={onboardOwner}
                onChange={(e) => setOnboardOwner(e.target.value)}
                style={{
                  padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--border)",
                  fontSize: "15px", outline: "none", width: "100%", background: "var(--bg-secondary)"
                }}
              />
            </div>

            <button
              disabled={onboardLoading || !onboardName.trim() || !onboardOwner.trim()}
              onClick={async () => {
                setOnboardLoading(true);
                const success = await updateStoreProfile({
                  store_name: onboardName.trim(),
                  category: onboardCategory,
                  owner_name: onboardOwner.trim()
                });
                setOnboardLoading(false);
                if (success) {
                  showToast("초기 정보 설정이 완료되었습니다! 🚀", "success");
                } else {
                  showToast("저장에 실패했습니다. 다시 시도해주세요.", "error");
                }
              }}
              style={{
                background: "#03C75A", color: "#fff", padding: "14px", borderRadius: "12px",
                fontWeight: 600, fontSize: "16px", cursor: "pointer", border: "none", marginTop: "10px",
                opacity: (onboardLoading || !onboardName.trim() || !onboardOwner.trim()) ? 0.6 : 1
              }}
            >
              {onboardLoading ? "저장 중..." : "3초 만에 시작하기"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── ListView: 모바일=카드, 데스크탑=테이블 ──
function ListView({
  orders,
  onOrderClick,
  formatPickup,
  profile,
}: {
  orders: Order[];
  onOrderClick: (o: Order) => void;
  formatPickup: (s: string) => string;
  profile: any;
}) {
  return (
    <>
      {/* ── 데스크탑: 테이블 (md 이상) ── */}
      <div className="list-table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["픽업 일시", "고객명", "매장", "상품", "금액", "상태", "채널", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["입금대기"];
              const src = SOURCE_CONFIG[order.source] || SOURCE_CONFIG["manual"];
              return (
                <tr
                  key={order.id}
                  className="animate-fadeIn"
                  style={{
                    borderBottom: idx < orders.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                    transition: "background 0.12s",
                    animationDelay: `${idx * 0.04}s`,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.025)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                    {formatPickup(order.pickupDate)}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>
                    {order.customerName}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>🏪</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {profile?.store_name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-secondary)", maxWidth: 200 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.productName}
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                    {order.amount.toLocaleString()}원
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span className="status-badge" style={{ background: cfg.bg, color: cfg.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: src.color + "22",
                        color: src.color === "#FEE500" ? "#8B6914" : src.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {src.emoji} {src.label}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <button
                      id={`order-detail-${order.id}`}
                      className="btn"
                      onClick={() => onOrderClick(order)}
                      style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-primary)", fontSize: 12, padding: "5px 12px", borderRadius: 8 }}
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 모바일: 카드 리스트 (md 미만) ── */}
      <div className="list-card-wrap">
        {orders.map((order, idx) => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["입금대기"];
          const src = SOURCE_CONFIG[order.source] || SOURCE_CONFIG["manual"];
          return (
            <div
              key={order.id}
              className="order-card animate-fadeIn"
              style={{ animationDelay: `${idx * 0.05}s` }}
              onClick={() => onOrderClick(order)}
            >
              {/* 상태 컬러 세로 바 */}
              <div className="order-card-accent" style={{ background: cfg.dot }} />

              {/* 상단: 픽업 일시 + 상태 뱃지 */}
              <div className="order-card-top" style={{ paddingLeft: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                  📅 {formatPickup(order.pickupDate)}
                </span>
                <span className="status-badge" style={{ background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
                  {cfg.label}
                </span>
              </div>

              {/* 중단: 고객명 + 상품명 */}
              <div className="order-card-middle" style={{ paddingLeft: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  {order.customerName}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {order.productName}
                </span>
                {/* 매장 */}
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                  🏪 {profile?.store_name}
                </span>
              </div>

              {/* 하단: 금액 + 채널 + 상세보기 */}
              <div className="order-card-bottom" style={{ paddingLeft: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                    {order.amount.toLocaleString()}원
                  </span>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                      background: src.color + "22",
                      color: src.color === "#FEE500" ? "#8B6914" : src.color,
                    }}
                  >
                    {src.emoji} {src.label}
                  </span>
                </div>
                <button
                  id={`order-detail-mobile-${order.id}`}
                  className="btn btn-primary"
                  onClick={(e) => { e.stopPropagation(); onOrderClick(order); }}
                  style={{ fontSize: 13, padding: "7px 16px", borderRadius: 9, flexShrink: 0 }}
                >
                  상세보기
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── EmptyState ──
function EmptyState({ filter }: { filter: FilterKey }) {
  const msgs: Record<FilterKey, { emoji: string; title: string; sub: string }> = {
    all: { emoji: "📦", title: "주문이 없습니다", sub: "복붙 마법사로 첫 주문을 등록해 보세요!" },
    입금대기: { emoji: "⏳", title: "입금 대기 주문 없음", sub: "모든 주문의 입금이 완료되었습니다 🎉" },
    제작중: { emoji: "🔨", title: "제작 중인 주문 없음", sub: "현재 제작 중인 주문이 없습니다." },
    픽업예정: { emoji: "🚀", title: "오늘 픽업 예정 없음", sub: "오늘 픽업 예정인 주문이 없습니다." },
    픽업완료: { emoji: "✅", title: "픽업 완료 내역 없음", sub: "아직 완료된 주문이 없습니다." },
    취소됨: { emoji: "❌", title: "취소 내역 없음", sub: "취소된 주문이 없습니다. 좋은 신호예요! 👍" },
  };
  const m = msgs[filter];
  return (
    <div
      style={{
        padding: "80px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 56 }}>{m.emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{m.title}</div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{m.sub}</div>
    </div>
  );
}
