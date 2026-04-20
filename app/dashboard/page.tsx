"use client";
// Force refresh for Next.js 16 Turbopack cache - 2026-04-09 13:42

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
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
import ManualOrderSheet from "../components/ManualOrderSheet";
import FAB from "../components/FAB";
import { DashboardSkeleton } from "../components/SkeletonUI";
import OrderCard from "../components/OrderCard";
import { useStoreProvider } from "../context/StoreContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";


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

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showManualSheet, setShowManualSheet] = useState(false);
  const [selectedStoreId] = useState<string>("all");
  const [, setIsFetching] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isPasting, setIsPasting] = useState(false);

  const { profile, loading, updateStoreProfile } = useStoreProvider();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardName, setOnboardName] = useState("");
  const [onboardCategory, setOnboardCategory] = useState("dessert");
  const [onboardOwner, setOnboardOwner] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      window.location.replace(`/auth/callback?code=${code}`);
      return;
    }
    // 1회만 표시되도록 단순 타이머 처리
    const timer = setTimeout(() => {
      showToast("우측 상단 ⚙️설정에서 내 매장 고유 링크를 확인하세요!", "info", "✨");
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 전역 클립보드 이미지 붙여넣기 → Supabase order_images 업로드
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

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        // 비로그인 → 랜딩으로
        router.replace("/");
        return;
      }
      if (!profile.store_name) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
        fetchOrders(profile.id);
      }
    }
  }, [profile, loading]);

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

  // Filtered orders (Guarded for hydration)
  const filteredOrders = useMemo(() => {
    if (!mounted) return [];
    
    let result = orders;
    if (selectedStoreId !== "all") {
      result = result.filter((o) => o.storeId === selectedStoreId);
    }
    
    if (activeFilter !== "all") {
      result = result.filter((o) => o.status === activeFilter);
    }
    return result;
  }, [orders, activeFilter, selectedStoreId, mounted]);

  // Summary counts (Guarded for hydration)
  const summaryData = useMemo(() => {
    const emptyStats = { all: 0, 신규주문: 0, 제작중: 0, 픽업대기: 0, 완료: 0, 취소: 0 };
    if (!mounted) return emptyStats;

    const storeOrders = selectedStoreId === "all" ? orders : orders.filter((o) => o.storeId === selectedStoreId);
    return {
      all: storeOrders.length,
      신규주문: storeOrders.filter((o) => o.status === "신규주문").length,
      제작중: storeOrders.filter((o) => o.status === "제작중").length,
      픽업대기: storeOrders.filter((o) => o.status === "픽업대기").length,
      완료: storeOrders.filter((o) => o.status === "완료").length,
      취소: storeOrders.filter((o) => o.status === "취소").length,
    };
  }, [orders, selectedStoreId, mounted]);

  const todayOrders = useMemo(() => {
    if (!mounted) return [];
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
  }, [orders, mounted]);

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

  const handleImageUpload = async (orderId: string, file: File) => {
    if (!profile?.id) return;
    try {
      const ext = file.type.split("/")[1] || "png";
      const fileName = `${profile.id}/${orderId}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("order_images")
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("order_images").getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;
      const targetOrder = orders.find((o) => o.id === orderId);
      const { error: updateError } = await supabase
        .from("orders")
        .update({ options: { ...(targetOrder?.options || {}), imageUrl } })
        .eq("id", orderId);
      if (updateError) throw updateError;
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, options: { ...o.options, imageUrl } } : o)
      );
      showToast("사진이 주문에 등록됐어요! 📷", "success");
    } catch (err: any) {
      showToast("사진 업로드 실패: " + (err.message || "알 수 없는 오류"), "error");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("정말 이 주문을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.")) return;
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      showToast("주문이 삭제되었습니다.", "success");
    } catch (err) {
      console.error("Delete order error:", err);
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

  const formatPickup = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = d.getHours();
    const mm = d.getMinutes();
    return `${m}월 ${day}일 ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const handlePrint = () => window.print();

  return (
    <>
      <ToastContainer />

      <div id="dashboard-main" className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 h-16 flex items-center px-4 md:px-8">
           <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">O</div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight desktop-only">OrderCatch</h1>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

          {profile?.id && mounted && (
            <div className="mb-8">
              <PasteBoard
                onParsed={() => fetchOrders(profile.id)}
                storeId={profile.id}
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
                    <button onClick={() => setShowManualSheet(true)} className="px-5 py-2.5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 text-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
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

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-100 lg:hidden px-6 pt-2 pb-safe">
         <div className="flex justify-between items-center max-w-sm mx-auto">
            <button onClick={() => setViewMode("calendar")} className={`flex flex-col items-center gap-1 py-2 ${viewMode === "calendar" ? "text-indigo-600" : "text-slate-400"}`}>
               <span className="text-2xl">📅</span>
               <span className="text-[10px] font-black uppercase tracking-widest">캘린더</span>
            </button>
            <button onClick={() => setShowManualSheet(true)} className="flex flex-col items-center -mt-8">
               <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-200 border-4 border-white transform hover:scale-110 active:scale-95 transition-all">
                  <span className="text-2xl">+</span>
               </div>
            </button>
            <button onClick={() => setViewMode("list")} className={`flex flex-col items-center gap-1 py-2 ${viewMode === "list" ? "text-indigo-600" : "text-slate-400"}`}>
               <span className="text-2xl">📋</span>
               <span className="text-[10px] font-black uppercase tracking-widest">목록</span>
            </button>
         </div>
      </div>

      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onStatusChange={handleStatusChange} 
          onDelete={handleDeleteOrder}
          onUpdated={(updatedOrder) => setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))}
        />
      )}
      {showSettings && <SettingsModal store={activeStore} onClose={() => setShowSettings(false)} />}
      {showManualSheet && profile?.id && (
        <ManualOrderSheet
          storeId={profile.id}
          onClose={() => setShowManualSheet(false)}
          onSaved={() => fetchOrders(profile.id)}
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

      {showOnboarding && <OnboardingModal profile={profile} updateProfile={updateStoreProfile} onClose={() => setShowOnboarding(false)} onSaved={() => fetchOrders(profile?.id || "")} />}
    </>
  );
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}
function formatDate(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function OnboardingModal({ profile, updateProfile, onClose, onSaved }: any) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [cat, setCat] = useState("dessert");
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
       <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl animate-scaleIn">
          <h2 className="text-2xl font-black text-slate-900 mb-2">환영합니다! 🎉</h2>
          <p className="text-slate-400 font-bold text-sm mb-8 leading-relaxed">AI 비서가 주문서를 똑똑하게 분석할 수 있도록<br />매장의 기본 정보를 알려주세요.</p>
          
          <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">업종 카테고리</label>
                <div className="grid grid-cols-3 gap-2">
                   {[{id:"dessert", label:"糖 디저트"}, {id:"nail", label:"💅 네일"}, {id:"bakery", label:"🥐 빵"}, {id:"flower", label:"🌸 꽃"}, {id:"restaurant", label:"🍽️ 식당"}, {id:"other", label:"✨ 기타"}].map(c => (
                     <button key={c.id} onClick={() => setCat(c.id)} className={`py-3 rounded-xl text-xs font-black transition-all ${cat === c.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-50 text-slate-400"}`}>{c.label}</button>
                   ))}
                </div>
             </div>
             <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">매장 이름</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="예: 아만다 케이크" className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-100 transition-all" />
             </div>
             <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">대표자 성함</label>
                <input type="text" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="사장님 성함을 입력하세요" className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-100 transition-all" />
             </div>
          </div>

          <button 
             disabled={loading || !name || !owner}
             onClick={async () => {
                setLoading(true);
                const ok = await updateProfile({ store_name: name, category: cat, owner_name: owner });
                if (ok) { showToast("매장 정보가 등록되었습니다! ✨", "success"); onSaved(); onClose(); }
                setLoading(false);
             }}
             className="w-full mt-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
             {loading ? "매장 오픈 준비 중..." : "오더캐치 시작하기"}
          </button>
       </div>
    </div>
  );
}

function ListView({ orders, onOrderClick, formatPickup, profile }: { orders: Order[]; onOrderClick: (o: Order) => void; formatPickup: (s: string) => string; profile: any; }) {
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
            <OrderCard key={order.id} order={order} onClick={() => onOrderClick(order)} />
          ))}
       </div>
    </div>
  );
}

function EmptyState({ filter, onOpenSettings }: { filter: FilterKey; onOpenSettings?: () => void }) {
  if (filter === "all") {
    // 첫 진입 시 — 무엇을 해야 하는지 단계별 안내
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
