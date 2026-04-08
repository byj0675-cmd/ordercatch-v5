export type OrderStatus = "입금대기" | "제작중" | "픽업완료" | "픽업예정" | "취소됨";

export interface Order {
  id: string;
  storeId: string;
  storeName: string;
  storeType: "dessert" | "nail" | "bakery" | "flower";
  customerName: string;
  phone: string;
  productName: string;
  pickupDate: string; // ISO 8601
  status: OrderStatus;
  amount: number;
  options: {
    count?: number;
    delivery?: string;
    address?: string;
    memo?: string;
    allergyInfo?: string;
    cooling?: boolean;
    quickDelivery?: boolean;
    design?: string;
    color?: string[];
    nailLength?: string;
    custom?: string;
    couponUsed?: string;
    paymentMethod?: string;
  };
  source: "kakao" | "instagram" | "manual" | "link";
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  type: "dessert" | "nail" | "bakery" | "flower";
  owner: string;
  webhookUrl: string;
  orderLink: string;
  avatar: string;
  color: string;
}

export const STORES: Store[] = [];
export const MOCK_ORDERS: Order[] = [];

export const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string; label: string; dot: string }> = {
  입금대기: { color: "#ff9500", bg: "rgba(255,149,0,0.12)", label: "입금대기", dot: "#ff9500" },
  제작중: { color: "#007aff", bg: "rgba(0,122,255,0.1)", label: "제작중", dot: "#007aff" },
  픽업예정: { color: "#af52de", bg: "rgba(175,82,222,0.12)", label: "픽업예정", dot: "#af52de" },
  픽업완료: { color: "#34c759", bg: "rgba(52,199,89,0.12)", label: "픽업완료", dot: "#34c759" },
  취소됨: { color: "#ff3b30", bg: "rgba(255,59,48,0.12)", label: "취소됨", dot: "#ff3b30" },
};

export const SOURCE_CONFIG = {
  kakao: { label: "카카오톡", color: "#FEE500", textColor: "#3B1E08", emoji: "💬" },
  instagram: { label: "인스타", color: "#E1306C", textColor: "#fff", emoji: "📷" },
  manual: { label: "직접입력", color: "#6e6e73", textColor: "#fff", emoji: "✏️" },
  link: { label: "링크주문", color: "#007aff", textColor: "#fff", emoji: "🔗" },
};
