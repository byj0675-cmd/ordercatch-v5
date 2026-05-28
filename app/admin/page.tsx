import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { approvePayment, rejectPayment, updateInterviewStatus, toggleLifetimeDiscount } from "@/app/actions/admin";

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

  // Fetch beta applications (ordered by created_at ascending - first come first served)
  const { data: betaApplications } = await supabase
    .from("beta_applications")
    .select("*")
    .order("created_at", { ascending: true });

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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center bg-gradient-to-br from-white to-indigo-50/20">
            <h3 className="text-sm font-medium text-slate-500">1기 사전 신청자 수</h3>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-indigo-600">{betaApplications?.length || 0}</span>
              <span className="text-sm font-medium text-slate-400">/ 15명</span>
            </div>
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

        {/* Beta Applicants Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/30 via-white to-white">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">1기 사전체험단 인터뷰 명단 (선착순)</h2>
              <p className="text-xs text-slate-500 mt-1">신청 완료한 사전체험단 사장님들 목록입니다. (목표: 15명)</p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
              신청 {betaApplications?.length || 0} / 15 명
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <th className="px-6 py-3 font-medium w-12 text-center">순번</th>
                  <th className="px-6 py-3 font-medium">신청자/연락처</th>
                  <th className="px-6 py-3 font-medium">매장 정보</th>
                  <th className="px-6 py-3 font-medium">주요 품목 / SNS 링크</th>
                  <th className="px-6 py-3 font-medium">인터뷰 상태</th>
                  <th className="px-6 py-3 font-medium text-center">평생 50% 할인</th>
                  <th className="px-6 py-3 font-medium text-right">신청 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {betaApplications && betaApplications.length > 0 ? (
                  betaApplications.map((app, index) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500 text-center font-semibold">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-800">
                          {app.owner_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">
                          {app.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900">
                          {app.store_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700 truncate max-w-[200px]" title={app.item}>
                          {app.item || <span className="text-slate-400">-</span>}
                        </div>
                        <div className="text-xs text-indigo-500 font-medium truncate max-w-[200px]" title={app.sns_link}>
                          {app.sns_link ? (
                            <a href={app.sns_link.startsWith('http') ? app.sns_link : `https://${app.sns_link}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {app.sns_link}
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <form className="flex items-center gap-1.5" action={async (formData: FormData) => {
                          "use server";
                          const status = formData.get("interview_status") as string;
                          await updateInterviewStatus(app.id, status);
                        }}>
                          <select
                            name="interview_status"
                            defaultValue={app.interview_status}
                            className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          >
                            <option value="대기">대기</option>
                            <option value="연락함">연락함</option>
                            <option value="인터뷰완료">인터뷰완료</option>
                          </select>
                          <button
                            type="submit"
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 rounded-xl text-xs font-semibold transition-colors"
                          >
                            변경
                          </button>
                        </form>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <form className="inline-block" action={async () => {
                          "use server";
                          await toggleLifetimeDiscount(app.id, !app.is_lifetime_discount);
                        }}>
                          <button
                            type="submit"
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                              app.is_lifetime_discount
                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {app.is_lifetime_discount ? "50% 평생할인" : "할인 미적용"}
                          </button>
                        </form>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-500">
                        {new Date(app.created_at).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      신청한 사전체험단이 없습니다.
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
