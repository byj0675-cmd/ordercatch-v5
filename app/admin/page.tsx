import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { approvePayment, rejectPayment } from "@/app/actions/admin";

export const metadata = {
  title: "Admin Dashboard - OrderCatch",
};

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Check if super admin (or allow in local development for testing)
  const isLocalDev = process.env.NODE_ENV === "development";
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin, role")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin && !isLocalDev) {
    // If not super admin, redirect to normal dashboard
    redirect("/dashboard");
  }

  // Fetch pending payments
  const { data: pendingRequests } = await supabase
    .from("payment_requests")
    .select("*, stores(name, id), profiles(email)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Fetch some basic stats (e.g., total active pro stores)
  const { count: proStoresCount } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("subscription_status", "pro");

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">OrderCatch 관리자 모드</h1>
          <p className="text-slate-500 mt-2">입금 확인 및 구독 관리 대시보드</p>
        </header>

        {/* Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-500">유료 구독 매장 수</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{proStoresCount || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-500">대기 중인 요청</h3>
            <p className="text-3xl font-bold text-amber-500 mt-2">{pendingRequests?.length || 0}</p>
          </div>
        </section>

        {/* Pending Payments Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">결제 대기 목록 (가장 중요)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <th className="px-6 py-3 font-medium">신청 일시</th>
                  <th className="px-6 py-3 font-medium">매장명 (아이디)</th>
                  <th className="px-6 py-3 font-medium">실제 입금자명</th>
                  <th className="px-6 py-3 font-medium">현금영수증 정보</th>
                  <th className="px-6 py-3 font-medium text-right">구독 상태 변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRequests && pendingRequests.length > 0 ? (
                  pendingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(req.created_at).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">
                          {req.stores?.name || "알 수 없음"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {req.profiles?.email || req.applicant_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">
                        {req.depositor_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {req.cash_receipt_info || <span className="text-slate-400">신청안함</span>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <form className="inline-block" action={async () => { "use server"; await approvePayment(req.id); }}>
                          <button
                            type="submit"
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                            승인하기
                          </button>
                        </form>
                        <form className="inline-block" action={async () => { "use server"; await rejectPayment(req.id); }}>
                          <button
                            type="submit"
                            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                          >
                            거절/대기
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      결제 대기 중인 요청이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
