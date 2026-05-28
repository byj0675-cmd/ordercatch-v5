"use client";

import React from "react";
import Link from "next/link";

export default function ManualPage() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans pb-12 print:bg-white print:pb-0">
      {/* Navigation Header - Hidden in Print */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-4 shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-lg font-black text-indigo-600 tracking-tight hover:opacity-80 transition-opacity"
            >
              OrderCatch
            </Link>
            <span className="text-xs font-bold text-slate-400 border-l border-slate-200 pl-2">
              공식 사용 설명서
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all"
            >
              대시보드로 가기
            </Link>
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              PDF 저장 / 인쇄하기
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 mt-8 print:mt-0 print:px-0">
        <article className="bg-white rounded-3xl border border-slate-200/60 p-8 md:p-12 shadow-sm print:border-none print:shadow-none print:p-0">
          
          {/* Header Title */}
          <div className="text-center border-b border-slate-100 pb-8 mb-8 print:pb-6 print:mb-6">
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3.5 py-1.5 rounded-full text-xs font-black mb-4 print:hidden">
              💡 오더캐치 가이드북
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              오더캐치(OrderCatch) 사용 설명서
            </h1>
            <p className="text-slate-400 font-medium text-sm md:text-base mt-3 leading-relaxed">
              카카오톡 주문 정리부터 당일 작업서 출력까지, 1초 만에 완료하는 스마트 주문 장부
            </p>
          </div>

          {/* Section: Overview */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3 mb-4 tracking-tight">
              오더캐치(OrderCatch)란?
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              오더캐치는 인스타그램 DM, 카카오톡 채널, 오픈채팅방 등으로 들어오는 복잡하고 다양한 형태의 주문 메시지를 복사해서 붙여넣기만 하면, <strong>인공지능(AI)이 주문 정보를 스스로 분석하여 장부에 자동으로 등록</strong>해 주는 서비스입니다. 
              또한 로컬 퍼스트(Local-First) 기술이 적용되어 인터넷 연결이 불안정하더라도 끊김 없이 초고속으로 작동합니다.
            </p>
          </section>

          {/* Section: Steps */}
          <section className="space-y-12">
            
            {/* 1. 회원가입 및 매장 생성 */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3 mb-4 tracking-tight">
                1. 회원가입 및 매장 생성하기
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base mb-2">1-1. 카카오 1초 회원가입</h3>
                  <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1.5">
                    <li>오더캐치 랜딩 페이지에서 <strong>[1기 사전 신청하고 무료 체험하기]</strong>를 완료합니다.</li>
                    <li>신청 완료 화면에서 <strong>[카카오톡으로 가입하고 무료체험 시작하기]</strong> 버튼을 클릭합니다.</li>
                    <li>카카오 계정 로그인 및 서비스 동의를 진행하면 가입이 완료됩니다.</li>
                  </ol>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base mb-2">1-2. 매장 등록 또는 초대 코드로 합류</h3>
                  <p className="text-xs text-slate-400 mb-3 font-semibold">로그인 후 최초 1회 온보딩 모달이 나타납니다.</p>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li>
                      <span className="font-bold text-slate-800">🏪 새 매장 만들기 (사장님):</span>
                      <p className="pl-4 mt-1 text-slate-500 leading-relaxed">
                        디저트, 네일, 베이커리, 플라워 등 매장에 맞는 업종을 선택한 후 매장 이름, 대표자명, 연락처를 입력합니다. 
                        <strong> 매장 ID</strong>는 영문 소문자, 숫자, 하이픈만 사용하여 고객에게 공유할 고유 주소로 설정합니다. (예: <code className="bg-slate-200/80 px-1 py-0.5 rounded text-xs">sweet-cake</code>)
                      </p>
                    </li>
                    <li>
                      <span className="font-bold text-slate-800">👥 초대 코드로 합류하기 (직원):</span>
                      <p className="pl-4 mt-1 text-slate-500 leading-relaxed">
                        사장님이 생성한 매장의 설정 화면에서 <strong>[초대 코드]</strong>를 전달받아 입력하면 해당 매장의 장부를 공동 관리할 수 있습니다.
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. 복붙 마법사 */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3 mb-4 tracking-tight">
                2. 주문 메시지 복사/붙여넣기 등록 (복붙 마법사)
              </h2>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                가장 강력하고 편리한 기능입니다. 고객이 카카오톡이나 인스타그램으로 보내온 주문 양식을 그대로 붙여넣어 등록합니다.
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2 mb-4">
                  <li>대시보드 상단의 <strong>[📝 복붙 마법사 열기]</strong> 버튼을 클릭하거나, 키보드의 아무 곳에서나 복사한 주문서 텍스트를 <strong>[Ctrl + V]</strong>로 붙여넣습니다.</li>
                  <li>입력 창에 고객의 주문 메시지를 그대로 붙여넣습니다.</li>
                  <li><strong>[AI 주문 분석하기]</strong> 버튼을 클릭합니다.</li>
                  <li>AI 엔진이 메시지를 분석하여 고객명, 연락처, 픽업 일시, 상품명, 금액, 요청사항을 추출합니다.</li>
                  <li>추출된 내용을 확인 및 보완한 후 <strong>[장부에 등록]</strong>을 누르면 즉시 캘린더 장부에 추가됩니다.</li>
                </ol>
                <div className="bg-white border border-slate-200/80 p-4 rounded-xl print:bg-slate-50">
                  <span className="text-[11px] font-black text-indigo-600 tracking-wider uppercase block mb-1">💡 분석 예시 메시지</span>
                  <blockquote className="text-xs text-slate-500 italic leading-relaxed">
                    "홍길동 / 010-1234-5678 / 5월 30일 오후 3시 픽업 / 딸기 생크림 케이크 1호 (레터링: 생일 축하해) / 입금 완료"
                  </blockquote>
                  <p className="text-xs text-slate-400 mt-2 font-medium">
                    ➔ 위 메시지를 그대로 붙여넣으면 날짜와 시간, 이름, 상품명, 레터링 옵션이 각각 알맞은 칸에 자동 파싱됩니다!
                  </p>
                </div>
              </div>
            </div>

            {/* 3. 고객용 주문 링크 */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3 mb-4 tracking-tight">
                3. 고객용 주문 링크 공유 및 자동 접수
              </h2>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                고객에게 주문 접수용 웹 링크를 전달하여 주문을 직접 작성하도록 유도할 수 있습니다.
              </p>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
                  <li>대시보드 내 <strong>[⚙️ 설정]</strong> ➔ <strong>[주문 링크]</strong> 탭으로 이동합니다.</li>
                  <li>사장님의 전용 주문 링크 주소를 복사합니다. (예: <code className="bg-slate-200/80 px-1 py-0.5 rounded text-xs">https://ordercatch.com/order/sweet-cake</code>)</li>
                  <li>복사한 링크를 카카오톡 채널 웰컴 메시지, 인스타그램 프로필 링크 등에 등록합니다.</li>
                  <li>고객이 링크를 눌러 주문 정보를 입력하고 제출하면, 사장님의 장부 대시보드에 <strong>"신규 주문"</strong>으로 알림과 함께 실시간 등록됩니다.</li>
                </ol>
              </div>
            </div>

            {/* 4. 카카오 웹훅 */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3 mb-4 tracking-tight">
                4. 카카오톡 오픈채팅방 웹훅 연동 (자동 수신)
              </h2>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                카카오톡 채널 혹은 오픈채팅방에 들어오는 주문 메시지를 사장님이 따로 복사할 필요도 없이 자동으로 장부에 수집해 주는 기능입니다. (프리미엄 기능)
              </p>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
                  <li>대시보드 내 <strong>[⚙️ 설정]</strong> ➔ <strong>[웹훅 설정]</strong> 탭으로 이동하여 사장님 매장 고유의 <strong>웹훅 수신 URL</strong>을 복사합니다.</li>
                  <li>카카오톡 비즈니스 관리자 센터(오픈빌더) 스킬 설정 영역에 해당 URL을 붙여넣습니다.</li>
                  <li>특정 주문 양식으로 카카오톡 메시지가 수신되면, 백그라운드에서 오더캐시 서버가 메시지를 감지하고 분석해 장부에 실시간으로 입력합니다.</li>
                </ol>
              </div>
            </div>

            {/* 5. 캘린더 장부 및 인쇄 */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3 mb-4 tracking-tight">
                5. 달력/리스트 장부 관리 및 인쇄 (Daily Order Sheet)
              </h2>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base mb-1.5">5-1. 직관적인 캘린더 뷰</h3>
                  <p className="leading-relaxed">
                    달력에서 날짜별 주문 현황(수량, 매출 합계)을 한눈에 파악할 수 있으며, 주문 카드를 클릭하면 상세한 주문 스펙(레터링 내용, 메모, 옵션)을 조회하고 편집할 수 있습니다.
                  </p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base mb-2">5-2. 작업용 일일 주문서 인쇄 (Daily Order Sheet)</h3>
                  <p className="mb-2 leading-relaxed">
                    매일 아침 주방이나 작업실에 붙여놓을 수 있는 당일 작업 지시서(주문서)를 깔끔한 양식으로 출력할 수 있습니다.
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>달력에서 인쇄를 원하는 날짜를 클릭합니다.</li>
                    <li>우측 상단의 <strong>[🖨️ 당일 주문서 인쇄]</strong> 버튼을 클릭합니다.</li>
                    <li>인쇄 전용 팝업 창이 열리며, 브라우저 인쇄 다이얼로그를 통해 A4 용지로 바로 인쇄하거나 PDF 파일로 저장할 수 있습니다.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* 6. 혜택 안내 */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 md:p-8 print:bg-white print:border-slate-200">
              <h2 className="text-xl font-bold text-indigo-900 pl-1 mb-4 tracking-tight flex items-center gap-2">
                🎁 1기 사전체험단 평생 할인 혜택 안내
              </h2>
              <p className="text-xs md:text-sm text-indigo-700 leading-relaxed mb-4">
                사장님께서는 오더캐치 서비스를 가장 먼저 지지해 주신 <strong>중요한 1기 사전체험단 파트너</strong>이십니다. 평생 최고의 혜택으로 보답해 드립니다.
              </p>
              <ul className="space-y-3 text-xs md:text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <div>
                    <strong>1개 매장 무료 PRO 제공:</strong> 매장 오픈 즉시 무료 체험 혜택이 적용되어 모든 PRO 기능을 제한 없이 써보실 수 있습니다.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <div>
                    <strong>평생 50% 요금 동결:</strong> 추후 가격 정책이 다양화되더라도 사장님께는 평생 50% 할인 혜택이 유지됩니다.
                    <div className="mt-1 pl-4 text-xs text-slate-500 font-bold">
                      베이직 플랜: 평생 월 2,450원 (정가 4,900원 기준)<br />
                      프리미엄 플랜: 평생 월 4,950원 (정가 9,900원 기준)
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* Footer - Copyright */}
          <footer className="border-t border-slate-100 mt-12 pt-8 text-center text-xs text-slate-400 print:mt-8 print:pt-4">
            <p className="font-semibold text-slate-500">OrderCatch — 오더를 캐치하다</p>
            <p className="mt-1">© {new Date().getFullYear()} OrderCatch. All rights reserved.</p>
          </footer>
        </article>
      </main>

      {/* Global CSS styles for Print */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, .print-hidden {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          article {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          @page {
            margin: 20mm;
          }
        }
      `}</style>
    </div>
  );
}
