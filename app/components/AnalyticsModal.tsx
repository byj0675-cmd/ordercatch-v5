import React, { useState, useMemo } from "react";
import { Order } from "../lib/mockData";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, subMonths, addMonths } from "date-fns";

export default function AnalyticsModal({
  isOpen,
  onClose,
  orders,
}: {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 현재 월의 주문 필터링
  const monthOrders = useMemo(() => {
    return orders.filter(o => isSameMonth(new Date(o.createdAt), currentMonth));
  }, [orders, currentMonth]);

  // 통계 계산
  const { totalSales, totalCount, sourceStats, dailySales } = useMemo(() => {
    let sales = 0;
    const sources: Record<string, number> = { kakao: 0, instagram: 0, manual: 0, link: 0 };
    
    // 일별 매출 초기화
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const daily: Record<string, number> = {};
    days.forEach(d => { daily[format(d, "yyyy-MM-dd")] = 0; });

    monthOrders.forEach(o => {
      // 취소된 주문 제외
      if (o.status !== "취소") {
        sales += o.amount;
        sources[o.source] = (sources[o.source] || 0) + 1;
        const dayStr = format(new Date(o.createdAt), "yyyy-MM-dd");
        if (daily[dayStr] !== undefined) {
          daily[dayStr] += o.amount;
        }
      }
    });

    return { totalSales: sales, totalCount: monthOrders.filter(o => o.status !== "취소").length, sourceStats: sources, dailySales: daily };
  }, [monthOrders, currentMonth]);

  // CSV 다운로드 로직
  const handleDownloadCsv = () => {
    const BOM = "\uFEFF";
    const headers = "주문접수일,예약(픽업)일,고객명,연락처,상품명,결제금액,상태,주문경로\n";
    
    const rows = monthOrders.map(o => {
      const created = format(new Date(o.createdAt), "yyyy-MM-dd HH:mm");
      const pickup = format(new Date(o.pickupDate), "yyyy-MM-dd HH:mm");
      // 쉼표 등 CSV 구분자와 충돌 방지를 위해 문자열 래핑
      const name = `"${o.customerName}"`;
      const phone = `"${o.phone}"`;
      const product = `"${o.productName.replace(/"/g, '""')}"`;
      const sourceMap = { kakao: "카카오톡", instagram: "인스타그램", manual: "수기등록", link: "링크주문" };
      const source = sourceMap[o.source] || o.source;

      return `${created},${pickup},${name},${phone},${product},${o.amount},${o.status},${source}`;
    }).join("\n");

    const csvContent = BOM + headers + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `오더캐치_매출내역_${format(currentMonth, "yyyy-MM")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  // 막대그래프를 위한 최대치 계산
  const maxDailySale = Math.max(...Object.values(dailySales), 1);
  const totalSourceCount = Math.max(Object.values(sourceStats).reduce((a, b) => a + b, 0), 1);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-scaleIn relative">
        <div className="flex items-center justify-between p-6 sm:px-8 border-b border-slate-100">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>📊</span> 매출 및 통계
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 no-scrollbar bg-slate-50/30">
          {/* 상단 컨트롤 바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center justify-center sm:justify-start gap-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold shadow-sm transition-all">&lt;</button>
              <div className="text-xl font-black text-slate-900 w-32 text-center tracking-tight">
                {format(currentMonth, "yyyy년 M월")}
              </div>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold shadow-sm transition-all">&gt;</button>
            </div>
            
            <button 
              onClick={handleDownloadCsv}
              className="px-6 py-3 bg-emerald-50 text-emerald-700 font-black rounded-2xl border border-emerald-100 shadow-sm hover:bg-emerald-100 hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="opacity-80"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              엑셀(CSV) 다운로드
            </button>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="text-sm font-bold text-slate-400 mb-1">총 주문 건수</div>
              <div className="text-3xl font-black text-slate-900">{totalCount}건</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="text-sm font-bold text-slate-400 mb-1">총 결제 금액</div>
              <div className="text-3xl font-black text-indigo-600">{totalSales.toLocaleString()}원</div>
            </div>
          </div>

          {/* 일별 매출 그래프 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6">일별 매출 흐름</h3>
            <div className="h-48 flex items-end gap-1 overflow-x-auto pb-4">
              {Object.entries(dailySales).map(([date, sales]) => {
                const heightPercentage = Math.max((sales / maxDailySale) * 100, 2); // 최소 높이 2% 보장
                const isMax = sales === maxDailySale && sales > 0;
                
                return (
                  <div key={date} className="flex flex-col items-center flex-1 min-w-[24px] group">
                    <div className="w-full flex justify-center h-40 items-end relative">
                      <div 
                        className={`w-full max-w-[20px] rounded-t-sm transition-all duration-500 ease-out ${isMax ? 'bg-indigo-500' : 'bg-slate-200 group-hover:bg-indigo-300'}`}
                        style={{ height: `${heightPercentage}%` }}
                      ></div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                        {sales.toLocaleString()}원
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-2 truncate w-full text-center">
                      {new Date(date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 주문 경로 분석 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">유입 경로 비율</h3>
            <div className="space-y-4">
              {[
                { key: "kakao", label: "카카오톡", color: "bg-[#FEE500]", barColor: "bg-[#FEE500]", textColor: "text-[#391B1B]" },
                { key: "instagram", label: "인스타그램", color: "bg-pink-100", barColor: "bg-pink-500", textColor: "text-pink-700" },
                { key: "manual", label: "수기 등록", color: "bg-slate-100", barColor: "bg-slate-400", textColor: "text-slate-700" },
                { key: "link", label: "링크 주문", color: "bg-indigo-100", barColor: "bg-indigo-500", textColor: "text-indigo-700" }
              ].map(source => {
                const count = sourceStats[source.key] || 0;
                const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                
                return (
                  <div key={source.key} className="flex items-center gap-4">
                    <div className={`w-24 text-xs font-bold px-3 py-1.5 rounded-lg text-center ${source.color} ${source.textColor}`}>
                      {source.label}
                    </div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${source.barColor} transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-16 text-right text-sm font-black text-slate-700">
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
