// 이 컴포넌트는 서버 컴포넌트일 수 있지만 폼 상호작용을 위해 클라이언트 컴포넌트로 선언합니다.
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { STORES } from "../../lib/mockData";
import { ToastContainer, showToast } from "../../components/Toast";

export default function CustomerOrderForm() {
  const params = useParams();
  const storeId = params.storeId as string;
  const store = STORES.find((s) => s.id === storeId) || STORES[0]; // fallback

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    productName: "",
    pickupDate: "",
    memo: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone || !formData.productName) {
      showToast("필수 정보를 모두 입력해주세요.", "warning", "⚠️");
      return;
    }

    setIsSubmitting(true);
    
    // [Phase 4] Supabase 연동 뼈대
    // 실제로는 API(app/api/orders/route.ts)를 호출하거나 여기서 직접 Insert할 수 있습니다.
    /*
    const { supabase } = await import('@/utils/supabase/client');
    await supabase.from('orders').insert([{
      store_id: storeId,
      customer_name: formData.customerName,
      phone: formData.phone,
      product_name: formData.productName,
      pickup_date: formData.pickupDate ? new Date(formData.pickupDate) : null,
      status: '입금대기',
      source: 'link',
      options: { memo: formData.memo }
    }]);
    */

    setTimeout(() => {
      setIsSubmitting(false);
      showToast("주문이 성공적으로 접수되었습니다!", "success", "🎉");
      // 초기화
      setFormData({ customerName: "", phone: "", productName: "", pickupDate: "", memo: "" });
    }, 1200);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <ToastContainer />
      {/* 
        모바일 환경에 최적화된 고객 전용 UI 
        - max-w-md, mx-auto 로 넓은 화면에서도 가운데 정렬된 좁은 모바일 화면 비율 유지
      */}
      <div style={{ minHeight: "100vh", background: "#f5f5f7" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", background: "#ffffff", minHeight: "100vh", boxShadow: "0 0 20px rgba(0,0,0,0.05)" }}>
          
          {/* Header */}
          <header style={{ padding: "24px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid var(--border)", background: store.color + "08" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: store.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 12 }}>
              {store.avatar}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0, textAlign: "center" }}>
              {store.name}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, textAlign: "center" }}>
              쉽고 빠른 안전 주문서
            </p>
          </header>

          {/* Form */}
          <main style={{ padding: "24px 20px" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              
              <FormGroup label="주문자 성함 *">
                <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="input-field" placeholder="홍길동" style={{ padding: "14px 16px", borderRadius: 12 }} />
              </FormGroup>

              <FormGroup label="연락처 *">
                <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-field" placeholder="010-0000-0000" style={{ padding: "14px 16px", borderRadius: 12 }} />
              </FormGroup>

              <FormGroup label="서비스/상품 선택 *">
                <input required type="text" name="productName" value={formData.productName} onChange={handleChange} className="input-field" placeholder="상품명, 서비스 종류, 수량 등을 적어주세요" style={{ padding: "14px 16px", borderRadius: 12 }} />
              </FormGroup>

              <FormGroup label="픽업(방문) 일시">
                <input type="datetime-local" name="pickupDate" value={formData.pickupDate} onChange={handleChange} className="input-field" style={{ padding: "14px 16px", borderRadius: 12, fontFamily: "inherit" }} />
              </FormGroup>

              <FormGroup label="추가 요청사항">
                <textarea name="memo" value={formData.memo} onChange={handleChange} className="input-field" placeholder="알러지 정보, 포장 요청 등 자유롭게 남겨주세요." rows={3} style={{ padding: "14px 16px", borderRadius: 12, resize: "vertical" }} />
              </FormGroup>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: 10,
                  background: isSubmitting ? "var(--text-tertiary)" : store.color,
                  color: "#fff",
                  padding: "16px",
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  border: "none",
                  cursor: isSubmitting ? "default" : "pointer",
                  boxShadow: "0 8px 20px " + store.color + "33",
                  transition: "transform 0.15s",
                }}
                onMouseDown={e => { if(!isSubmitting) e.currentTarget.style.transform = "scale(0.97)" }}
                onMouseUp={e => { if(!isSubmitting) e.currentTarget.style.transform = "scale(1)" }}
                onMouseLeave={e => { if(!isSubmitting) e.currentTarget.style.transform = "scale(1)" }}
              >
                {isSubmitting ? "주문 접수 중..." : "주문 접수하기"}
              </button>
            </form>
          </main>
          
          <footer style={{ padding: "30px 20px", textAlign: "center", fontSize: 11, color: "var(--text-tertiary)" }}>
            Powered by <b>OrderCatch</b>
          </footer>
        </div>
      </div>
    </>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginLeft: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
