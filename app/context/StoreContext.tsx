"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/utils/supabase/client";
import {
  db,
  generateId,
  countThisMonthOrders,
  supabaseRowToLocal,
  type LocalOrder,
  type LocalProfile,
  type SubscriptionStatus,
} from "@/app/lib/db";
import { syncDirtyOrders, pullFromCloud, setupSyncListeners } from "@/app/lib/syncEngine";

// ─── 타입 정의 ─────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  store_name: string | null;
  store_slug: string | null;
  category: string | null;
  owner_name: string | null;
  store_id: string | null;
  role: "master" | "staff";
  subscription_status: SubscriptionStatus;
}

export interface StoreInfo {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  invite_code: string;
}

export type AddOrderPayload = Omit<
  LocalOrder,
  "id" | "createdAt" | "updatedAt" | "isDirty" | "isDeleted" | "syncedAt"
>;

// 페이월 에러 타입
export class UsageLimitError extends Error {
  used: number;
  limit: number;
  constructor(used: number, limit: number) {
    super("LIMIT_EXCEEDED");
    this.name = "UsageLimitError";
    this.used = used;
    this.limit = limit;
  }
}

const FREE_PLAN_LIMIT = 20;

// ─── Context 정의 ─────────────────────────────────────────────

interface StoreContextProps {
  profile: Profile | null;
  storeInfo: StoreInfo | null;
  loading: boolean;
  isMaster: boolean;
  isPro: boolean;
  // 주문 CRUD (Local-First)
  addOrder: (payload: AddOrderPayload) => Promise<LocalOrder>;
  updateOrderStatus: (orderId: string, newStatus: LocalOrder["status"]) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrderFields: (orderId: string, fields: Partial<LocalOrder>) => Promise<void>;
  // 매장 관리
  updateStoreProfile: (data: { store_name?: string; category?: string; owner_name?: string }) => Promise<boolean>;
  createStore: (data: { store_name: string; category: string; owner_name: string }) => Promise<boolean>;
  joinStoreByCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  refreshStore: () => Promise<void>;
  loginAsMockUser: () => void;
}

const StoreContext = createContext<StoreContextProps>({
  profile: null,
  storeInfo: null,
  loading: true,
  isMaster: false,
  isPro: false,
  addOrder: async () => { throw new Error("Not initialized"); },
  updateOrderStatus: async () => {},
  deleteOrder: async () => {},
  updateOrderFields: async () => {},
  updateStoreProfile: async () => false,
  createStore: async () => false,
  joinStoreByCode: async () => ({ success: false }),
  refreshStore: async () => {},
  loginAsMockUser: () => {},
});

// ─── Provider ─────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Auth 감지 ─────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadProfileData(session.user.id);
        } else {
          setProfile(null);
          setStoreInfo(null);
          setLoading(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Pro 유저 동기화 리스너 설정 ───────────────────────────
  useEffect(() => {
    if (!profile?.store_id || profile.subscription_status !== "pro") return;
    const cleanup = setupSyncListeners(supabase, profile.store_id);
    return cleanup;
  }, [profile?.store_id, profile?.subscription_status]);

  // ── 프로필 로드 ───────────────────────────────────────────
  const loadProfileData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      let p: Profile;
      if (error || !data) {
        p = {
          id: userId, email: "",
          store_name: null, store_slug: null,
          category: null, owner_name: null,
          store_id: null, role: "master",
          subscription_status: "free",
        };
      } else {
        p = {
          ...data,
          role: data.role || "master",
          store_id: data.store_id || null,
          subscription_status: data.subscription_status || "free",
        };
        // 로컬 DB에 프로필 캐시
        await db.profiles.put({
          ...p,
          updatedAt: new Date().toISOString(),
        } as LocalProfile);
      }

      setProfile(p);
      if (p.store_id) {
        await loadStoreInfo(p.store_id, p);
      }
    } catch (err) {
      // 오프라인 또는 에러 시 캐시에서 복원
      const cached = await db.profiles.get(userId);
      if (cached) {
        const p: Profile = {
          id: cached.id,
          email: cached.email,
          store_name: cached.store_name,
          store_slug: cached.store_slug,
          category: cached.category,
          owner_name: cached.owner_name,
          store_id: cached.store_id,
          role: cached.role,
          subscription_status: cached.subscription_status,
        };
        setProfile(p);
        if (p.store_id) await loadStoreInfoFromCache(p.store_id);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStoreInfo = async (storeId: string, p?: Profile) => {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (!error && data) {
      setStoreInfo(data as StoreInfo);
      await db.stores.put({ ...data, updatedAt: new Date().toISOString() });

      // Pro 유저: 오더 pull
      if (p?.subscription_status === "pro") {
        pullFromCloud(supabase, storeId, data.name, p.category || "dessert");
      }
    } else {
      await loadStoreInfoFromCache(storeId);
    }
  };

  const loadStoreInfoFromCache = async (storeId: string) => {
    const cached = await db.stores.get(storeId);
    if (cached) setStoreInfo(cached as StoreInfo);
  };

  const refreshStore = async () => {
    if (profile?.id) await loadProfileData(profile.id);
  };

  // ── 주문 CRUD (Local-First) ───────────────────────────────

  /** 주문 등록: 무료 한도 체크 → Dexie 즉시 저장 → Pro: 백그라운드 sync */
  const addOrder = useCallback(async (payload: AddOrderPayload): Promise<LocalOrder> => {
    const storeId = payload.storeId;
    const isPro = profile?.subscription_status === "pro";

    // ── Paywall 체크 (무료 플랜) ──
    if (!isPro) {
      const used = await countThisMonthOrders(storeId);
      if (used >= FREE_PLAN_LIMIT) {
        throw new UsageLimitError(used, FREE_PLAN_LIMIT);
      }
    }

    // ── 로컬 DB 즉시 저장 ──
    const now = new Date().toISOString();
    const order: LocalOrder = {
      ...payload,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      isDirty: true,          // Pro 여부에 관계없이 dirty 표시
      isDeleted: false,
      syncedAt: undefined,
    };

    await db.orders.add(order);

    // ── Pro: 백그라운드 Supabase sync ──
    if (isPro) {
      queueMicrotask(() => syncDirtyOrders(supabase, storeId));
    }

    return order;
  }, [profile]);

  /** 상태 변경: Dexie 즉시 → Pro: 백그라운드 sync */
  const updateOrderStatus = useCallback(async (
    orderId: string,
    newStatus: LocalOrder["status"]
  ): Promise<void> => {
    const now = new Date().toISOString();
    await db.orders.update(orderId, {
      status: newStatus,
      updatedAt: now,
      isDirty: true,
    });

    if (profile?.subscription_status === "pro" && profile?.store_id) {
      queueMicrotask(() => syncDirtyOrders(supabase, profile.store_id!));
    }
  }, [profile]);

  /** 주문 삭제: soft-delete → Pro: 백그라운드 sync */
  const deleteOrder = useCallback(async (orderId: string): Promise<void> => {
    const now = new Date().toISOString();
    await db.orders.update(orderId, {
      isDeleted: true,
      updatedAt: now,
      isDirty: true,
    });

    if (profile?.subscription_status === "pro" && profile?.store_id) {
      queueMicrotask(() => syncDirtyOrders(supabase, profile.store_id!));
    }
  }, [profile]);

  /** 필드 업데이트: Dexie 즉시 → Pro: 백그라운드 sync */
  const updateOrderFields = useCallback(async (
    orderId: string,
    fields: Partial<LocalOrder>
  ): Promise<void> => {
    const now = new Date().toISOString();
    await db.orders.update(orderId, {
      ...fields,
      updatedAt: now,
      isDirty: true,
    });

    if (profile?.subscription_status === "pro" && profile?.store_id) {
      queueMicrotask(() => syncDirtyOrders(supabase, profile.store_id!));
    }
  }, [profile]);

  // ── 매장 관리 ─────────────────────────────────────────────

  const createStore = async (data: { store_name: string; category: string; owner_name: string }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const slug =
        data.store_name
          .toLowerCase()
          .replace(/[^a-z0-9가-힣]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 30) +
        "-" +
        Math.random().toString(36).slice(2, 6);

      const { data: newStore, error: storeError } = await supabase
        .from("stores")
        .insert([{ name: data.store_name, slug, category: data.category }])
        .select()
        .single();

      if (storeError) throw storeError;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          email: session.user.email,
          store_name: data.store_name,
          store_slug: slug,
          category: data.category,
          owner_name: data.owner_name,
          store_id: newStore.id,
          role: "master",
          subscription_status: "free",
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      const updatedProfile: Profile = {
        id: session.user.id,
        email: session.user.email || "",
        store_name: data.store_name,
        store_slug: slug,
        category: data.category,
        owner_name: data.owner_name,
        store_id: newStore.id,
        role: "master",
        subscription_status: "free",
      };

      setProfile(updatedProfile);
      setStoreInfo(newStore as StoreInfo);
      await db.profiles.put({ ...updatedProfile, updatedAt: new Date().toISOString() });
      await db.stores.put({ ...newStore, updatedAt: new Date().toISOString() });

      return true;
    } catch (err: any) {
      console.error("createStore error:", err);
      return false;
    }
  };

  const joinStoreByCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return { success: false, error: "로그인 정보가 없습니다." };

      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("invite_code", code.trim().toUpperCase())
        .single();

      if (storeError || !store) {
        return { success: false, error: "유효하지 않은 초대 코드입니다. 다시 확인해주세요." };
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          email: session.user.email,
          store_id: store.id,
          role: "staff",
          subscription_status: "free",
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      setProfile((prev) =>
        prev ? { ...prev, store_id: store.id, role: "staff" } : null
      );
      setStoreInfo(store as StoreInfo);
      return { success: true };
    } catch (err: any) {
      console.error("joinStoreByCode error:", err);
      return { success: false, error: err.message || "합류 중 오류가 발생했습니다." };
    }
  };

  const updateStoreProfile = async (updateData: {
    store_name?: string;
    category?: string;
    owner_name?: string;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          email: session.user.email,
          ...updateData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      if (profile?.store_id && updateData.store_name) {
        await supabase
          .from("stores")
          .update({ name: updateData.store_name, category: updateData.category })
          .eq("id", profile.store_id);
        setStoreInfo((prev) =>
          prev
            ? {
                ...prev,
                name: updateData.store_name!,
                category: updateData.category || prev.category,
              }
            : null
        );
      }

      setProfile((prev) => (prev ? { ...prev, ...updateData } : null));
      return true;
    } catch (err: any) {
      console.error("updateStoreProfile error:", err);
      return false;
    }
  };

  // ── 개발자 모드 ───────────────────────────────────────────
  const loginAsMockUser = () => {
    document.cookie = "ordercatch-mock-user=true; path=/; max-age=3600";
    const mockId = "00000000-0000-0000-0000-000000000000";
    setProfile({
      id: mockId,
      email: "mock@example.com",
      store_name: "개발용 매장",
      store_slug: "mock-store",
      category: "dessert",
      owner_name: "개발자",
      store_id: mockId,
      role: "master",
      subscription_status: "free",
    });
    setStoreInfo({
      id: mockId,
      name: "개발용 매장",
      slug: "mock-store",
      category: "dessert",
      invite_code: "MOCK1234",
    });
    setLoading(false);
  };

  const isMaster = profile?.role === "master";
  const isPro = profile?.subscription_status === "pro";

  return (
    <StoreContext.Provider
      value={{
        profile, storeInfo, loading, isMaster, isPro,
        addOrder, updateOrderStatus, deleteOrder, updateOrderFields,
        updateStoreProfile, createStore, joinStoreByCode,
        refreshStore, loginAsMockUser,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStoreProvider = () => useContext(StoreContext);
