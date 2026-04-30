"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLiveQuery } from "dexie-react-hooks";
import {
  STATUS_CONFIG,
  SOURCE_CONFIG,
  type Order,
  type OrderStatus,
} from "../lib/mockData";
import { db, type LocalOrder } from "../lib/db";
import { ToastContainer, showToast } from "../components/Toast";
import { useStoreProvider } from "../context/StoreContext";
import { UsageLimitError } from "../context/StoreContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

// Dynamic Imports for Performance
const CalendarView = dynamic(() => import("../components/CalendarView"), { ssr: false, loading: () => <DashboardSkeleton /> });
const OrderDetailModal = dynamic(() => import("../components/OrderDetailModal"), { ssr: false });
const SettingsModal = dynamic(() => import("../components/SettingsModal"), { ssr: false });
const PasteBoard = dynamic(() => import("../components/PasteBoard"), { ssr: false });
const ManualOrderSheet = dynamic(() => import("../components/ManualOrderSheet"), { ssr: false });
const DashboardSkeleton = dynamic(() => import("../components/SkeletonUI").then(mod => mod.DashboardSkeleton), { ssr: false });
const OrderCard = dynamic(() => import("../components/OrderCard"), { ssr: false });
const UsageLimitModal = dynamic(() => import("../components/UsageLimitModal"), { ssr: false });
const PaymentRequestModal = dynamic(() => import("../components/PaymentRequestModal"), { ssr: false });

type ViewMode = "calendar" | "list";

const SUMMARY_CARDS = [
  { key: "all", label: "전체 주문", icon: "📋", color: "#007aff", bg: "rgba(0,122,255,0.08)" },
  { key: "신규주문", label: "신규 주문", icon: "✨", color: "#059669", bg: "rgba(5,150,105,0.08)" },
  { key: "제작중", label: "제작 중", icon: "🔨", color: "#2563eb", bg: "rgba(37,99,235,0.08)" },
  { key: "픽업대기", label: "픽업 대기", icon: "🚀", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  { key: "완료", label: "완료", icon: "✅", color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
  { key: "취소", label: "취소", icon: "❌", color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
] as const;

type FilterKey = (typeof SUMMARY_CARDS)[number]["key"];

// LocalOrder → Order (UI 호환 변환)
function toOrder(o: LocalOrder): Order {
  return {
    id: o.id,
    storeId: o.storeId,
    storeName: o.storeName,
    storeType: o.storeType as Order["storeType"],
    customerName: o.customerName,
    phone: o.phone,
    productName: o.productName,
    pickupDate: o.pickupDate,
    status: o.status as OrderStatus,
    amount: o.amount,
    options: o.options as Order["options"],
    source: o.source,
    createdAt: o.createdAt,
  };
}

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showManualSheet, setShowManualSheet] = useState(false);
  const [selectedStoreId] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [usageLimitInfo, setUsageLimitInfo] = useState<{ used: number; limit: number } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const {
    profile, storeInfo, loading, isMaster, isPro,
    updateOrderStatus, deleteOrder, updateOrderFields,
    updateStoreProfile, createStore, joinStoreByCode, refreshStore,
  } = useStoreProvider();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();

  // ── useLiveQuery: Dexie 실시간 구독 (네트워크 불필요) ─────
  const storeId = profile?.store_id || profile?.id;
  const rawLocalOrders = useLiveQuery(
    () => {
      if (!storeId) return Promise.resolve([] as LocalOrder[]);
      return db.orders
        .where("storeId")
        .equals(storeId)
        .filter((o) => !o.isDeleted)
        .sortBy("pickupDate") as Promise<LocalOrder[]>;
    },
    [storeId]
  );

  const orders: Order[] = useMemo(
    () => (rawLocalOrders ?? []).map(toOrder),
    [rawLocalOrders]
  );

  // ── onSaved: ManualOrderSheet/PasteBoard에서 저장 완료 시 호출 ──
  // useLiveQuery가 자동으로 재렌더링하므로 별도 mutate 불필요
  const handleOrderSaved = () => {
    // no-op: useLiveQuery auto-updates
  };

  // ── Auth 가드 및 온보딩 ───────────────────────────────────
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      window.location.replace(`/auth/callback?code=${code}`);
      return;
    }
    const timer = setTimeout(() => {
      showToast("우측 상단 ⚙️설정에서 내 매장 고유 링크를 확인하세요!", "info", "✨");
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.replace("/");
        return;
      }
      if (!profile.store_id) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    }
  }, [profile, loading, router]);

  // ── 클립보드 이미지 붙여넣기 ─────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;

      setIsPasting(true);
      try {
        const ext = file.type.split("/")[1] || "png";
        const fileName = `${profile.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("order_images")
          .upload(fileName, file, { contentType: file.type });
        if (error) throw error;
        const { data: urlData } = supabase.storage
          .from("order_images")
          .getPublicUrl(fileName);
        await navigator.clipboard.writeText(urlData.publicUrl);
        showToast("이미지 업로드 완료! URL이 클립보드에 복사됐습니다. 메모에 붙여넣기 하세요.", "success", "📎");
      } catch (err: any) {
        showToast("이미지 업로드 실패: " + (err.message || "알 수 없는 오류"), "error");
      } finally {
        setIsPasting(false);
      }
    };
    document.addEventListener("paste", handleGlobalPaste);
    return () => document.removeEventListener("paste", handleGlobalPaste);
  }, [profile?.id]);

  // ── 핸들러: 스피너 없이 로컬 즉시 반영 ──────────────────

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    // 로컬 DB 즉시 업데이트 (useLiveQuery가 자동 재렌더링)
    await updateOrderStatus(orderId, newStatus as LocalOrder["status"]);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
    }
    showToast(`상태가 [${newStatus}]로 변경되었습니다.`, "success");
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("정말 이 주문을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.")) return;
    // soft-delete → useLiveQuery가 자동으로 목록에서 제거
    await deleteOrder(orderId);
    if (selectedOrder?.id === orderId) setSelectedOrder(null);
    showToast("주문이 삭제되었습니다.", "success");
  };

  const handleImageUpload = async (orderId: string, file: File) => {
    if (!profile?.id) return;
    try {
      const ext = file.type.split("/")[1] || "png";
      const fileName = `${profile.id}/${orderId}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("order_images")
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("order_images")
        .getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;
      await updateOrderFields(orderId, {
        options: {
          ...(orders.find((o) => o.id === orderId)?.options || {}),
          imageUrl,
        },
      });
      showToast("사진이 주문에 등록됐어요! 📷", "success");
    } catch (err: any) {
      showToast("사진 업로드 실패: " + (err.message || "알 수 없는 오류"), "error");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
      showToast("로그아웃 되었습니다.", "info", "👋");
    } catch (err) {
      showToast("로그아웃 중 오류가 발생했습니다.", "error");
    }
  };

  const formatPickup = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = d.getHours();
    const mm = d.getMinutes();
    return `${m}월 ${day}일 ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  // ── 필터링 ───────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (selectedStoreId !== "all") {
      result = result.filter((o) => o.storeId === selectedStoreId);
    }
    if (activeFilter !== "all") {
      result = result.filter((o) => o.status === activeFilter);
    }
    return result;
  }, [orders, activeFilter, selectedStoreId]);

  const summaryData = useMemo(() => {
    const storeOrders =
      selectedStoreId === "all" ? orders : orders.filter((o) => o.storeId === selectedStoreId);
    return {
      all: storeOrders.length,
      신규주문: storeOrders.filter((o) => o.status === "신규주문").length,
      제작중: storeOrders.filter((o) => o.status === "제작중").length,
      픽업대기: storeOrders.filter((o) => o.status === "픽업대기").length,
      완료: storeOrders.filter((o) => o.status === "완료").length,
      취소: storeOrders.filter((o) => o.status === "취소").length,
    };
  }, [orders, selectedStoreId]);

  const todayOrders = useMemo(() => {
    const today = new Date();
    return orders
      .filter((o) => {
        const d = new Date(o.pickupDate);
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        );
      })
      .sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());
  }, [orders]);

  // ── 로딩 가드: profile이 없고 loading중인 경우만 스켈레톤 ──
  if (loading && rawLocalOrders === undefined) {
    return <DashboardSkeleton />;
  }

  const handlePrint = () => window.print();

  const activeStore = {
    id: profile?.store_id || profile?.id || "",
    name: storeInfo?.name || profile?.store_name || "",
    type: (storeInfo?.category || profile?.category as any) || "dessert",
    owner: profile?.owner_name || "",
    webhookUrl: `/api/webhook/kakao?storeSlug=${storeInfo?.slug || profile?.store_slug || ""}`,
    orderLink: `/order/${storeInfo?.slug || profile?.store_slug || ""}`,
    avatar: "🏪",
    color: "#007aff",
  };

  return (
    <>
      <ToastContainer />

      <div id="dashboard-main" className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 h-16 flex items-center px-4 md:px-8">
           <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">O</div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight desktop-only">OrderCatch</h1>
                {/* Pro 배지 */}
                {isPro && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black rounded-full">
                    ⚡ PRO
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                 <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                    <span className="text-xl">⚙️</span>
                 </button>
                 <button onClick={handleLogout} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                    로그아웃
                 </button>
              </div>
           </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {/* 스태프는 매출 카드 숨김 */}
          {isMaster && (
            <div className="hidden lg:grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {SUMMARY_CARDS.slice(1, 5).map(card => (
                <button
                  key={card.key}
                  onClick={() => setActiveFilter(card.key)}
                  className={`p-4 rounded-3xl text-left transition-all ${activeFilter === card.key ? "ring-2 ring-indigo-600 ring-offset-2" : "hover:shadow-lg"} bg-white shadow-md border border-slate-50`}
                >
                  <div className="text-2xl mb-1">{card.icon}</div>
                  <div className="text-sm font-bold text-slate-400">{card.label}</div>
                  <div className="text-2xl font-black text-slate-900">{summaryData[card.key]}</div>
                </button>
              ))}
            </div>
          )}

          {/* 스태프 모드 라벨 */}
          {!isMaster && (
            <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-sm font-bold text-amber-700">
              <span>👤</span>
              <span>스태프 모드 — 주문 조회 및 상태 변경만 가능합니다</span>
            </div>
          )}

          {/* 무료 사용자 사용량 배너 */}
          {!isPro && profile?.store_id && (
            <UsageBanner storeId={profile.store_id} onUpgrade={() => setShowPaymentModal(true)} />
          )}

          {profile?.id && (
            <div className="mb-8">
              <PasteBoard
                onParsed={handleOrderSaved}
                storeId={profile.store_id || profile.id}
              />
            </div>
          )}

          <div className="grid grid-cols-12 gap-6 pb-24 md:pb-0">
            <div className="col-span-12 lg:col-span-8">
              <div className="mb-6 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">주문 관리</h2>
                    <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
                       <button onClick={() => setViewMode("calendar")} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === "calendar" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>캘린더</button>
                       <button onClick={() => setViewMode("list")} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>목록</button>
                    </div>
                 </div>

                 <div className="flex gap-2">
                    <button
                      onClick={() => setShowManualSheet(true)}
                      className="px-5 py-2.5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                       + 주문 등록
                    </button>
                 </div>
              </div>

              {viewMode === "calendar" ? (
                <CalendarView
                  orders={orders}
                  onOrderClick={setSelectedOrder}
                  onDayClick={setSelectedDay}
                  selectedDay={selectedDay || new Date()}
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <ListView
                  orders={filteredOrders}
                  onOrderClick={setSelectedOrder}
                  formatPickup={formatPickup}
                  profile={profile}
                  onStatusChange={handleStatusChange}
                />
              )}
            </div>

            <aside className="hidden lg:block lg:col-span-4 sticky top-28 h-[calc(100vh-140px)]">
               <div className="h-full bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                           {selectedDay ? formatDate(selectedDay) : "오늘"}의 주문
                        </h3>
                        <p className="text-sm font-bold text-slate-400 mt-0.5">상세 목록</p>
                     </div>
                     <button onClick={handlePrint} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">🖨️</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                     {(selectedDay ? orders.filter(o => isSameDay(new Date(o.pickupDate), selectedDay)) : todayOrders).length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                          <div className="text-4xl mb-4">🌙</div>
                          <p className="text-sm font-bold text-slate-900">등록된 주문이 없습니다</p>
                          <p className="text-xs font-bold text-slate-400 mt-1">여유로운 하루를 즐기거나<br/>새로운 주문을 등록해보세요!</p>
                       </div>
                     ) : (
                       (selectedDay ? orders.filter(o => isSameDay(new Date(o.pickupDate), selectedDay)) : todayOrders).map(o => (
                         <OrderCard key={o.id} order={o} onClick={() => setSelectedOrder(o)} onStatusChange={handleStatusChange} />
                       ))
                     )}
                  </div>

                  <div className="p-6 bg-slate-50/50 border-t border-slate-50">
                     <button onClick={() => setShowManualSheet(true)} className="w-full py-4 bg-white border-2 border-indigo-100 text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-all text-sm">
                        + 새로운 주문 바로 등록
                     </button>
                  </div>
               </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Bar */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[340px] lg:hidden animate-fadeUp pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
         <div className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_20px_50px_rgba(79,70,229,0.15)] rounded-[32px] p-2 flex items-center justify-between mx-auto pointer-events-auto" style={{ width: 'calc(100% - 32px)' }}>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all ${viewMode === "calendar" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}
            >
               <span className="text-xl">📅</span>
               <span className="text-[10px] font-black uppercase tracking-tighter">캘린더</span>
            </button>

            <button
              onClick={() => setShowManualSheet(true)}
              className="flex-shrink-0 w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all mx-2"
            >
               <span className="text-2xl font-light">+</span>
            </button>

            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all ${viewMode === "list" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}
            >
               <span className="text-xl">📋</span>
               <span className="text-[10px] font-black uppercase tracking-tighter">목록</span>
            </button>
         </div>
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteOrder}
          onUpdated={(updatedOrder) =>
            setSelectedOrder(updatedOrder)
          }
        />
      )}
      {showSettings && <SettingsModal store={activeStore} onClose={() => setShowSettings(false)} />}
      {showManualSheet && profile?.id && (
        <ManualOrderSheet
          storeId={profile.store_id || profile.id}
          onClose={() => setShowManualSheet(false)}
          onSaved={handleOrderSaved}
          onUsageLimitExceeded={(used, limit) => {
            setShowManualSheet(false);
            setUsageLimitInfo({ used, limit });
          }}
        />
      )}

      {isPasting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-600/10 backdrop-blur-md">
           <div className="p-8 bg-white rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center animate-bounce shadow-xl shadow-indigo-100">
                 <span className="text-2xl text-white">📎</span>
              </div>
              <p className="text-lg font-black text-slate-900">이미지 마법 부리는 중...</p>
           </div>
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onSaved={() => { setShowOnboarding(false); refreshStore(); }}
        />
      )}

      {/* 무료 한도 초과 모달 */}
      {usageLimitInfo && (
        <UsageLimitModal
          used={usageLimitInfo.used}
          limit={usageLimitInfo.limit}
          onClose={() => setUsageLimitInfo(null)}
        />
      )}

      {/* PC 프린트 전용 섹션 */}
      <PrintSection
        dateLabel={selectedDay ? formatDate(selectedDay) : "오늘"}
        orders={selectedDay ? orders.filter(o => isSameDay(new Date(o.pickupDate), selectedDay)) : todayOrders}
        totalRevenue={(selectedDay ? orders.filter(o => isSameDay(new Date(o.pickupDate), selectedDay)) : todayOrders).reduce((acc, cur) => acc + cur.amount, 0)}
      />

      {/* 결제 요청 모달 */}
      {showPaymentModal && profile?.store_id && (
        <PaymentRequestModal
          storeId={profile.store_id}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  );
}

// ── 무료 사용량 배너 ────────────────────────────────────────────
function UsageBanner({ storeId, onUpgrade }: { storeId: string; onUpgrade: () => void }) {
  const monthlyCount = useLiveQuery(
    () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      return db.orders
        .where("storeId")
        .equals(storeId)
        .filter((o) => !o.isDeleted && o.createdAt >= startOfMonth && o.createdAt <= endOfMonth)
        .count() as Promise<number>;
    },
    [storeId]
  );

  const used = monthlyCount ?? 0;
  const limit = 20;
  const pct = Math.min((used / limit) * 100, 100);
  const isNearLimit = used >= 15;
  const isAtLimit = used >= limit;

  if (used === 0) return null;

  return (
    <div className={`mb-6 px-4 py-3 rounded-2xl border flex items-center gap-3 text-sm ${isAtLimit ? "bg-red-50 border-red-100" : isNearLimit ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`font-black text-xs ${isAtLimit ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-slate-500"}`}>
            이번 달 무료 주문 {used} / {limit}건
          </span>
          {isNearLimit && (
            <button onClick={onUpgrade} className="text-xs font-black px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              Pro 버전으로 무제한 사용하기
            </button>
          )}
        </div>
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-400" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── 유틸 함수 ────────────────────────────────────────────────────
function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
function formatDate(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ── 온보딩 모달 ─────────────────────────────────────────────────
function OnboardingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { createStore, joinStoreByCode } = useStoreProvider();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [cat, setCat] = useState("dessert");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name || !owner) return;
    setLoading(true);
    const ok = await createStore({ store_name: name, category: cat, owner_name: owner });
    setLoading(false);
    if (ok) { onSaved(); }
    else setError("매장 생성에 실패했습니다. 다시 시도해주세요.");
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    const result = await joinStoreByCode(code);
    setLoading(false);
    if (result.success) { onSaved(); }
    else setError(result.error || "합류에 실패했습니다.");
  };

  const CATS = [
    {id:"dessert", label:"🍬 디저트"}, {id:"nail", label:"💅 네일"},
    {id:"bakery", label:"🥐 베이커리"}, {id:"flower", label:"🌸 플라워"},
    {id:"restaurant", label:"🍽️ 식당"}, {id:"other", label:"✨ 기타"}
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl animate-scaleIn">

        {mode === "choose" && (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">환영합니다!</h2>
              <p className="text-slate-400 font-bold text-sm leading-relaxed">오더캐치를 시작하는 방법을 선택해주세요</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => setMode("create")} className="w-full p-5 rounded-2xl bg-indigo-600 text-white font-black text-left hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                <div className="text-xl mb-1">🏪 새 매장 만들기</div>
                <div className="text-indigo-200 text-sm font-bold">사장님으로 시작하기 — 매장 정보를 등록하세요</div>
              </button>
              <button onClick={() => setMode("join")} className="w-full p-5 rounded-2xl bg-slate-50 text-slate-700 font-black text-left hover:bg-slate-100 transition-all border border-slate-200">
                <div className="text-xl mb-1">👥 초대 코드로 합류하기</div>
                <div className="text-slate-400 text-sm font-bold">직원으로 참여하기 — 사장님에게 코드를 받으세요</div>
              </button>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <button onClick={() => setMode("choose")} className="mb-4 text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">← 돌아가기</button>
            <h2 className="text-2xl font-black text-slate-900 mb-6">새 매장 만들기 🏪</h2>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">업종</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {CATS.map(c => (
                    <button key={c.id} onClick={() => setCat(c.id)}
                      className={`py-3 rounded-xl text-xs font-black transition-all ${cat===c.id ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">매장 이름</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="예: 아만다 케이크"
                  className="w-full mt-2 p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-100" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">대표자 성함</label>
                <input type="text" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="사장님 성함"
                  className="w-full mt-2 p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-100" />
              </div>
              {error && <p className="text-sm font-bold text-red-500">{error}</p>}
              <button disabled={loading || !name || !owner} onClick={handleCreate}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? "매장 오픈 준비 중..." : "오더캐치 시작하기"}
              </button>
            </div>
          </>
        )}

        {mode === "join" && (
          <>
            <button onClick={() => setMode("choose")} className="mb-4 text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">← 돌아가기</button>
            <h2 className="text-2xl font-black text-slate-900 mb-2">초대 코드로 합류 👥</h2>
            <p className="text-slate-400 text-sm font-bold mb-6 leading-relaxed">사장님으로부터 받은 초대 코드를 입력하세요</p>
            <div className="space-y-4">
              <input type="text" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}
                placeholder="8자리 코드 입력 (ABCD1234)" maxLength={8}
                className="w-full p-4 bg-slate-50 rounded-2xl font-black text-lg tracking-widest text-center outline-none focus:ring-2 ring-indigo-100" />
              {error && <p className="text-sm font-bold text-red-500 text-center">{error}</p>}
              <button disabled={loading || code.trim().length < 6} onClick={handleJoin}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? "확인 중..." : "합류하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── 리스트 뷰 ───────────────────────────────────────────────────
function ListView({ orders, onOrderClick, formatPickup, profile, onStatusChange }: {
  orders: Order[];
  onOrderClick: (o: Order) => void;
  formatPickup: (s: string) => string;
  profile: any;
  onStatusChange: (id: string, s: Order["status"]) => void;
}) {
  if (orders.length === 0) return <EmptyState filter="all" />;

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
       {/* Desktop Table View */}
       <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
             <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                   {["픽업 일시", "고객명", "주문 상품", "금액", "상태", ""].map(h => (
                     <th key={h} className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                   ))}
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {orders.map(order => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["신규주문"] || {};
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => onOrderClick(order)}>
                       <td className="px-6 py-4">
                          <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg inline-block">
                             {formatPickup(order.pickupDate)}
                          </div>
                       </td>
                       <td className="px-6 py-4 text-sm font-black text-slate-900">{order.customerName}</td>
                       <td className="px-6 py-4 text-sm font-bold text-slate-600">{order.productName}</td>
                       <td className="px-6 py-4 text-sm font-black text-slate-900">{order.amount.toLocaleString()}원</td>
                       <td className="px-6 py-4">
                          <span className="text-[11px] font-black px-2 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                             {cfg.label}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="text-indigo-600 text-xs font-black">상세보기 ›</button>
                       </td>
                    </tr>
                  );
                })}
             </tbody>
          </table>
       </div>

       {/* Mobile Card View */}
       <div className="md:hidden p-4 space-y-4">
          {orders.map(order => (
            <OrderCard key={order.id} order={order} onClick={() => onOrderClick(order)} onStatusChange={onStatusChange} />
          ))}
       </div>
    </div>
  );
}

// ── 빈 상태 ─────────────────────────────────────────────────────
function EmptyState({ filter, onOpenSettings }: { filter: FilterKey; onOpenSettings?: () => void }) {
  if (filter === "all") {
    return (
      <div style={{ padding: "40px 24px 48px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📦</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>첫 주문을 받아볼까요?</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 32, textAlign: "center", lineHeight: 1.6 }}>
          아래 3가지 방법 중 하나로 주문을 받을 수 있어요
        </div>
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "rgba(0,122,255,0.06)", border: "1px solid rgba(0,122,255,0.15)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>✨</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 3 }}>복붙 마법사 (바로 위 버튼)</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>카카오·인스타에서 받은 주문 메시지를 그대로 붙여넣으면 AI가 자동 파싱</div>
            </div>
          </div>
          <div style={{ background: "rgba(88,86,214,0.06)", border: "1px solid rgba(88,86,214,0.15)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>🔗</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 3 }}>고객 주문 링크 공유</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                ⚙️ 설정 → 주문 링크 탭에서 링크를 복사해 고객에게 보내세요.<br />
                고객이 직접 작성하면 장부에 바로 등록돼요.
              </div>
              {onOpenSettings && (
                <button onClick={onOpenSettings} style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#5856d6", background: "rgba(88,86,214,0.1)", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>
                  설정 열기 →
                </button>
              )}
            </div>
          </div>
          <div style={{ background: "rgba(52,199,89,0.06)", border: "1px solid rgba(52,199,89,0.15)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 3 }}>카카오 자동 수신</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                ⚙️ 설정 → 웹훅 탭에서 URL을 복사해<br />
                카카오 오픈빌더 스킬에 등록하면 자동 파싱됩니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const msgs: Record<Exclude<FilterKey, "all">, { emoji: string; title: string; sub: string }> = {
    신규주문: { emoji: "✨", title: "신규 주문 없음", sub: "아직 새로 들어온 주문이 없습니다." },
    제작중:   { emoji: "🔨", title: "제작 중인 주문 없음", sub: "현재 제작 중인 주문이 없습니다." },
    픽업대기: { emoji: "🚀", title: "픽업 대기 주문 없음", sub: "픽업 대기 중인 주문이 없습니다." },
    완료:     { emoji: "✅", title: "완료 내역 없음", sub: "아직 완료된 주문이 없습니다." },
    취소:     { emoji: "❌", title: "취소 내역 없음", sub: "취소된 주문이 없습니다. 좋은 신호예요! 👍" },
  };
  const m = msgs[filter as Exclude<FilterKey, "all">];
  return (
    <div style={{ padding: "80px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 56 }}>{m.emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{m.title}</div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{m.sub}</div>
    </div>
  );
}

// ── 프린트 섹션 ──────────────────────────────────────────────────
function PrintSection({ dateLabel, orders, totalRevenue }: {
  dateLabel: string;
  orders: Order[];
  totalRevenue: number;
}) {
  const formatTimeOnly = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "--:--";
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div id="print-section">
      <div style={{ padding: "40px 32px", color: "#000", background: "#fff" }}>
        <div style={{ borderBottom: "3px solid #000", paddingBottom: 16, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em" }}>DAILY ORDER SHEET</h1>
            <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600, color: "#444" }}>{dateLabel} 주문 내역</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#666" }}>출력 일시: {new Date().toLocaleString("ko-KR")}</p>
            <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800 }}>금액 합계: {totalRevenue.toLocaleString()}원</p>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["No", "시간", "고객명", "주문 상품", "요청사항 / 메모", "금액"].map((h) => (
                <th key={h} style={{ padding: "12px 8px", borderBottom: "2px solid #000", textAlign: "left", fontSize: 13, fontWeight: 800 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={o.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "12px 8px", fontSize: 12, color: "#666" }}>{i + 1}</td>
                <td style={{ padding: "12px 8px", fontSize: 15, fontWeight: 800 }}>{formatTimeOnly(o.pickupDate)}</td>
                <td style={{ padding: "12px 8px", fontSize: 15, fontWeight: 800 }}>{o.customerName}</td>
                <td style={{ padding: "12px 8px", fontSize: 14 }}>{o.productName}</td>
                <td style={{ padding: "12px 8px", fontSize: 13, lineHeight: 1.5, maxWidth: 260 }}>
                  {o.options?.memo || o.options?.custom || <span style={{ color: "#ccc" }}>-</span>}
                </td>
                <td style={{ padding: "12px 8px", fontSize: 14, fontWeight: 700, textAlign: "right" }}>
                  {o.amount.toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>해당 날짜에 등록된 주문이 없습니다.</div>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid #000", paddingTop: 16, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
          <span>OrderCatch</span>
          <span>주문 확인용 내부 문서</span>
        </div>
      </div>
    </div>
  );
}
