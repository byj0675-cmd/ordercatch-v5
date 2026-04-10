"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ToastContainer, showToast } from "../../components/Toast";
import { supabase } from "@/utils/supabase/client";

interface StoreInfo {
  id: string;
  store_name: string;
  category: string;
}

export default function CustomerOrderForm() {
  const params = useParams();
  const storeSlug = params.storeId as string; // URL 파라미터명 유지 (라우트 변경 없이)

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    productName: "",
    pickupDate: "",
    memo: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchStore = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, store_name, category")
        .eq("store_slug", storeSlug)
        .single();

      if (error || !data || !data.store_name) {
        setNotFound(true);
      } else {
        setStore(data);
      }
      setLoadingStore(false);
    };
    fetchStore();
  }, [storeSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone || !formData.productName) {
      showToast("필수 정보를 모두 입력해주세요.", "warning", "⚠️");
      return;
    }
    if (!store) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("orders").insert([{
        store_id: store.id,
        customer_name: formData.customerName,
        phone: formData.phone,
        product_name: formData.productName,
        pickup_date: formData.pickupDate ? new Date(formData.pickupDate).toISOString() : null,
        status: "입금대기",
        source: "link",
        options: { memo: formData.memo },
      }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      console.error("Order submit error:", err);
      showToast("주문 접수 중 오류가 발생했습니다. 다시 시도해주세요.", "error", "❌");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const categoryEmoji: Record<string, string> = {
    dessert: "🍬", nail: "💅", bakery: "🥐", flower: "🌸", restaurant: "🍽️", other: "✨"
  };
  const storeEmoji = store ? (categoryEmoji[store.category] || "🏪") : "🏪";
  const storeColor = "#007aff";

  // 로딩 중
  if (loadingStore) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
        <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: 14 }}>매장 정보 불러오는 중...</div>
      </div>
    );
  }

  // 존재하지 않는 매장
  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>매장을 찾을 수 없습니다</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>링크가 올바른지 사장님께 확인해 주세요.</div>
        </div>
      </div>
    );
  }

  // 제출 완료
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f7" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", background: "#ffffff", minHeight: "100vh", boxShadow: "0 0 20px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0, marginBottom: 12 }}>
            주문이 접수되었습니다!
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, marginBottom: 32 }}>
            <b>{store?.store_name}</b>에 주문이 전달되었어요.<br />
            사장님이 확인 후 연락드릴 예정입니다.
          </p>
          <button
            onClick={() => { setSubmitted(false); setFormData({ customerName: "", phone: "", productName: "", pickupDate: "", memo: "" }); }}
            style={{ background: storeColor, color: "#fff", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer" }}
          >
            추가 주문하기
          </button>
          <div style={{ marginTop: 40, fontSize: 11, color: "var(--text-tertiary)" }}>
            Powered by <b>OrderCatch</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <div style={{ minHeight: "100vh", background: "#f5f5f7" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", background: "#ffffff", minHeight: "100vh", boxShadow: "0 0 20px rgba(0,0,0,0.05)" }}>

          {/* Header */}
          <header style={{ padding: "32px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid var(--border)", background: storeColor + "08" }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: storeColor + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 14, boxShadow: `0 8px 24px ${storeColor}22` }}>
              {storeEmoji}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0, textAlign: "center" }}>
              {store?.store_name}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, textAlign: "center" }}>
              주문서를 작성하면 사장님 장부에 바로 등록돼요
            </p>
          </header>

          {/* Form */}
          <main style={{ padding: "28px 20px 40px" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <FormGroup label="주문자 성함 *">
                <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange}
                  className="input-field" placeholder="홍길동"
                  style={{ padding: "14px 16px", borderRadius: 12, fontSize: 15 }} />
              </FormGroup>

              <FormGroup label="연락처 *">
                <input required type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  className="input-field" placeholder="010-0000-0000"
                  style={{ padding: "14px 16px", borderRadius: 12, fontSize: 15 }} />
              </FormGroup>

              <FormGroup label="주문 내용 *">
                <input required type="text" name="productName" value={formData.productName} onChange={handleChange}
                  className="input-field" placeholder="상품명, 서비스 종류, 수량 등"
                  style={{ padding: "14px 16px", borderRadius: 12, fontSize: 15 }} />
              </FormGroup>

              <FormGroup label="픽업(방문) 일시">
                <input type="datetime-local" name="pickupDate" value={formData.pickupDate} onChange={handleChange}
                  className="input-field"
                  style={{ padding: "14px 16px", borderRadius: 12, fontFamily: "inherit", fontSize: 15 }} />
              </FormGroup>

              <FormGroup label="추가 요청사항">
                <textarea name="memo" value={formData.memo} onChange={handleChange}
                  className="input-field" placeholder="알러지 정보, 포장 요청, 문구 등 자유롭게 남겨주세요." rows={3}
                  style={{ padding: "14px 16px", borderRadius: 12, resize: "vertical", fontSize: 15 }} />
              </FormGroup>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: 8,
                  background: isSubmitting ? "var(--text-tertiary)" : storeColor,
                  color: "#fff", padding: "16px", borderRadius: 14,
                  fontSize: 16, fontWeight: 700, border: "none",
                  cursor: isSubmitting ? "default" : "pointer",
                  boxShadow: `0 8px 20px ${storeColor}44`,
                  transition: "all 0.15s",
                }}
              >
                {isSubmitting ? "접수 중..." : "주문 접수하기"}
              </button>
            </form>
          </main>

          <footer style={{ padding: "20px", textAlign: "center", fontSize: 11, color: "var(--text-tertiary)" }}>
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
      <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginLeft: 2 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
