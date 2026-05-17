import Link from "next/link";

export const metadata = {
  title: "환불 정책 및 정기 결제 해지 안내 - OrderCatch",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100">
        <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1 mb-8">
          ← 메인으로 돌아가기
        </Link>
        
        <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">환불 정책 및 정기 결제 해지 안내</h1>
        
        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. 환불 규정</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>전액 환불 (100%):</strong> 프로(Pro) 요금제 결제일로부터 <span className="text-indigo-600 font-bold">7일 이내</span>에 서비스 이용 이력(주문 생성, 주문 링크 공유 등)이 없는 경우, 전액 환불이 가능합니다.
              </li>
              <li>
                <strong>환불 불가:</strong> 결제일로부터 7일이 경과하였거나, 기간과 상관없이 1회 이상 프로 기능(무제한 주문, 고객 링크 기능 등)을 사용한 이력이 있는 경우, 해당 월의 결제 금액은 환불되지 않습니다.
              </li>
              <li>환불 신청은 고객센터(또는 문의 이메일)를 통해 접수해 주시면 평일 기준 3영업일 이내에 처리됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. 정기 결제 해지 안내</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>정기 결제(구독) 해지는 언제든지 가능하며, 해지 위약금 등은 전혀 발생하지 않습니다.</li>
              <li>
                해지를 원하시는 경우, 대시보드의 <strong className="text-indigo-600">[설정(⚙️) {">"} 구독 관리]</strong> 메뉴에서 <strong>'구독 해지'</strong> 버튼을 눌러 직접 해지하실 수 있습니다.
              </li>
              <li>정기 결제를 해지하시더라도 이미 결제된 당월(해당 구독 주기) 마지막 날까지는 프로(Pro) 기능을 그대로 이용하실 수 있으며, 다음 결제일부터 자동으로 무료 플랜으로 전환되고 더 이상 요금이 청구되지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. 유의 사항</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>플랜 변경 및 해지로 인한 데이터는 즉시 삭제되지 않으나, 무료 플랜으로 강등될 경우 일부 프로 기능(카카오 자동 연동, 월 20건 초과 주문 등록 등)에 제한이 발생할 수 있습니다.</li>
              <li>관련 문의: 고객센터 (ordercatch@example.com)</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 text-sm text-slate-500">
          본 약관 및 환불 정책은 2026년 5월 17일부터 적용됩니다.
        </div>
      </div>
    </div>
  );
}
