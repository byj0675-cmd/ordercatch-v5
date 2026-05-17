import Link from "next/link";

export const metadata = {
  title: "개인정보 처리방침 - OrderCatch",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100">
        <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1 mb-8">
          ← 메인으로 돌아가기
        </Link>
        
        <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">개인정보 처리방침 (Privacy Policy)</h1>
        
        <div className="space-y-8 text-slate-700 leading-relaxed whitespace-pre-line">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. 수집하는 개인정보 항목</h2>
            <p>"회사"(두근상사)는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>필수항목:</strong> 카카오 계정 정보(닉네임, 이메일), 매장 명칭, 매장 ID(URL 슬러그), 연락처.</li>
              <li><strong>자동수집항목:</strong> IP 주소, 쿠키, 서비스 이용 기록.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>서비스 제공 및 계약 이행 (로그인 인증, 매장 관리 기능 등)</li>
              <li>유료 서비스 결제 처리 및 본인 인증</li>
              <li>고객 상담 및 불만 처리</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. 개인정보의 제3자 제공 및 위탁</h2>
            <p>"회사"는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Supabase:</strong> 데이터 보관 및 인증 관리 (미국 소재 서버)</li>
              <li><strong>Vercel:</strong> 웹사이트 호스팅 및 운영</li>
              <li><strong>결제선생(페이쌤):</strong> 결제 처리 및 현금영수증 발행 대행</li>
              <li><strong>카카오:</strong> 소셜 로그인 연동</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. 개인정보의 보유 및 이용기간</h2>
            <p>원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계 법령에 따라 결제 기록 등은 5년간 보관될 수 있습니다.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 text-sm text-slate-500">
          본 방침은 2026년 5월 18일부터 적용됩니다.
        </div>
      </div>
    </div>
  );
}
