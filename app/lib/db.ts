/**
 * OrderCatch Local-First DB (Dexie.js)
 * Single Source of Truth: IndexedDB via Dexie
 */

import Dexie, { Table } from "dexie";

// ─── 타입 정의 ─────────────────────────────────────────────────

export type OrderStatus = "신규주문" | "제작중" | "픽업대기" | "완료" | "취소";
export type SubscriptionStatus = "free" | "pro";

export interface LocalOrder {
  id: string;               // UUID (클라이언트 생성)
  storeId: string;
  storeName: string;
  storeType: string;
  customerName: string;
  phone: string;
  productName: string;
  pickupDate: string;       // ISO 8601
  status: OrderStatus;
  amount: number;
  options: Record<string, any>;
  source: "kakao" | "instagram" | "manual" | "link";
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601 — LWW 기준 타임스탬프
  syncedAt?: string;        // 마지막 Supabase sync 성공 시각
  isDirty: boolean;         // true = 로컬 변경, Supabase 미반영
  isDeleted: boolean;       // soft-delete (sync 후 물리 삭제)
}

export interface LocalProfile {
  id: string;
  email: string;
  store_name: string | null;
  store_slug: string | null;
  category: string | null;
  owner_name: string | null;
  store_id: string | null;
  role: "master" | "staff";
  subscription_status: SubscriptionStatus;
  updatedAt: string;
}

export interface LocalStore {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  invite_code: string;
  updatedAt: string;
}

// ─── Dexie DB 정의 ─────────────────────────────────────────────

export class OrderCatchDB extends Dexie {
  orders!: Table<LocalOrder, string>;
  profiles!: Table<LocalProfile, string>;
  stores!: Table<LocalStore, string>;

  constructor() {
    super("ordercatch-db");

    this.version(1).stores({
      // ++는 auto-increment가 아닌 UUID primary key 사용
      orders: "id, storeId, status, pickupDate, isDirty, isDeleted, updatedAt, createdAt",
      profiles: "id",
      stores: "id, slug",
    });
  }
}

export const db = new OrderCatchDB();

// ─── 헬퍼 함수 ─────────────────────────────────────────────────

/** UUID v4 생성 (crypto.randomUUID 지원 환경 기준) */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** 당월 주문 건수 조회 (무료 플랜 한도 체크용) */
export async function countThisMonthOrders(storeId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  return db.orders
    .where("storeId")
    .equals(storeId)
    .filter(
      (o) =>
        !o.isDeleted &&
        o.createdAt >= startOfMonth &&
        o.createdAt <= endOfMonth
    )
    .count();
}

/** 더티 레코드 조회 (sync 대상) */
export async function getDirtyOrders(storeId: string): Promise<LocalOrder[]> {
  return db.orders
    .where("storeId")
    .equals(storeId)
    .filter((o) => o.isDirty)
    .toArray();
}

/** Supabase row → LocalOrder 변환 */
export function supabaseRowToLocal(
  row: any,
  storeName = "",
  storeType = "dessert"
): LocalOrder {
  return {
    id: row.id,
    storeId: row.store_id,
    storeName,
    storeType,
    customerName: row.customer_name,
    phone: row.phone || "",
    productName: row.product_name,
    pickupDate: row.pickup_date,
    status: row.status as OrderStatus,
    amount: Number(row.amount) || 0,
    options: row.options || {},
    source: row.source as LocalOrder["source"],
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    syncedAt: new Date().toISOString(),
    isDirty: false,
    isDeleted: false,
  };
}

/** LocalOrder → Supabase insert/upsert payload 변환 */
export function localToSupabasePayload(order: LocalOrder): Record<string, any> {
  return {
    id: order.id,
    store_id: order.storeId,
    customer_name: order.customerName,
    phone: order.phone,
    product_name: order.productName,
    pickup_date: order.pickupDate,
    status: order.status,
    amount: order.amount,
    options: order.options,
    source: order.source,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}
