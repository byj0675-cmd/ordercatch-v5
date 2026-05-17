import Link from "next/link";

export const metadata = {
  title: "서비스 이용약관 - OrderCatch",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100">
        <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1 mb-8">
          ← 메인으로 돌아가기
        </Link>
        
        <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">서비스 이용약관 (Terms of Service)</h1>
        
        <div className="space-y-8 text-slate-700 leading-relaxed whitespace-pre-line">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제1조 (목적)</h2>
            <p>본 약관은 두근상사가 운영하는 "오더캐치(OrderCatch)"(이하 "서비스")에서 제공하는 인터넷 관련 서비스 및 유료 구독 서비스를 이용함에 있어 회사와 이용자의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제2조 (용어의 정의)</h2>
            <p>"이용자"란 "서비스"에 접속하여 본 약관에 따라 "서비스"를 이용하는 사장님 및 그 직원을 의미합니다.</p>
            <p className="mt-2">"유료 서비스"란 "서비스" 내에서 제공되는 Pro/Premium 플랜 등 결제를 통해 이용 가능한 기능을 의미합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제3조 (서비스의 제공 및 변경)</h2>
            <p>"서비스"는 매장 주문 관리, AI 이미지 생성 지원, 고객 응대 자동화 등의 기능을 제공합니다.</p>
            <p className="mt-2">"회사"는 기술적 사양의 변경이나 서비스 품질 향상을 위해 서비스 내용을 변경할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제4조 (결제 및 환불)</h2>
            <p>유료 서비스 결제는 "결제선생" 등 외부 결제 대행사를 통해 이루어집니다.</p>
            <p className="mt-2">디지털 콘텐츠 특성상 서비스 이용이 개시된 경우 환불이 제한될 수 있으며, 상세한 환불 규정은 관련 법령을 따릅니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">제5조 (책임의 제한)</h2>
            <p>"회사"는 천재지변, 서버 점검, 통신 장애 등으로 발생한 서비스 중단에 대해 책임을 지지 않으며, 이용자가 "서비스"를 통해 관리하는 데이터의 최종 책임은 이용자에게 있습니다.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 text-sm text-slate-500">
          본 약관은 2026년 5월 18일부터 적용됩니다.
        </div>
      </div>
    </div>
  );
}
