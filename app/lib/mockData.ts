export type OrderStatus = "신규주문" | "제작중" | "픽업대기" | "완료" | "취소";

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
    imageUrl?: string;
    isPersonal?: boolean;
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
  신규주문: { color: "#059669", bg: "rgba(5,150,105,0.10)", label: "신규주문", dot: "#10b981" },
  제작중:   { color: "#2563eb", bg: "rgba(37,99,235,0.10)", label: "제작중",   dot: "#3b82f6" },
  픽업대기: { color: "#d97706", bg: "rgba(217,119,6,0.10)", label: "픽업대기", dot: "#f59e0b" },
  완료:     { color: "#6b7280", bg: "rgba(107,114,128,0.10)", label: "완료",    dot: "#9ca3af" },
  취소:     { color: "#dc2626", bg: "rgba(220,38,38,0.10)", label: "취소",     dot: "#ef4444" },
};

export const SOURCE_CONFIG = {
  kakao: { label: "카카오톡", color: "#FEE500", textColor: "#3B1E08", emoji: "💬" },
  instagram: { label: "인스타", color: "#E1306C", textColor: "#fff", emoji: "📷" },
  manual: { label: "직접입력", color: "#6e6e73", textColor: "#fff", emoji: "✏️" },
  link: { label: "링크주문", color: "#007aff", textColor: "#fff", emoji: "🔗" },
};
