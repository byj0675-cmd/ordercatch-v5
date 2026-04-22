"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/utils/supabase/client";

export interface Profile {
  id: string;
  email: string;
  store_name: string | null;
  store_slug: string | null;
  category: string | null;
  owner_name: string | null;
  store_id: string | null;   // 팀 매장 UUID
  role: "master" | "staff";  // 권한
}

export interface StoreInfo {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  invite_code: string;
}

interface StoreContextProps {
  profile: Profile | null;
  storeInfo: StoreInfo | null;
  loading: boolean;
  isMaster: boolean;
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
  updateStoreProfile: async () => false,
  createStore: async () => false,
  joinStoreByCode: async () => ({ success: false }),
  refreshStore: async () => {},
  loginAsMockUser: () => {},
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadProfileData(session.user.id);
      } else {
        setProfile(null);
        setStoreInfo(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfileData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        setProfile({
          id: userId, email: "",
          store_name: null, store_slug: null,
          category: null, owner_name: null,
          store_id: null, role: "master",
        });
      } else {
        const p: Profile = {
          ...data,
          role: data.role || "master",
          store_id: data.store_id || null,
        };
        setProfile(p);

        // store_id가 있으면 stores 테이블에서 상세 정보 로드
        if (p.store_id) {
          await loadStoreInfo(p.store_id);
        }
      }
    } catch (err) {
      console.warn("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreInfo = async (storeId: string) => {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (!error && data) {
      setStoreInfo(data as StoreInfo);
    }
  };

  const refreshStore = async () => {
    if (profile?.id) await loadProfileData(profile.id);
  };

  // ─── 새 매장 만들기 (온보딩: 사장님) ───────────────────────────
  const createStore = async (data: { store_name: string; category: string; owner_name: string }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      // 1. stores 테이블에 매장 생성
      const slug = data.store_name
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 30) + "-" + Math.random().toString(36).slice(2, 6);

      const { data: newStore, error: storeError } = await supabase
        .from("stores")
        .insert([{ name: data.store_name, slug, category: data.category }])
        .select()
        .single();

      if (storeError) throw storeError;

      // 2. profiles 업데이트
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
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // 로컬 상태 즉시 업데이트
      setProfile(prev => prev ? {
        ...prev,
        store_name: data.store_name,
        store_slug: slug,
        category: data.category,
        owner_name: data.owner_name,
        store_id: newStore.id,
        role: "master",
      } : null);
      setStoreInfo(newStore as StoreInfo);

      return true;
    } catch (err: any) {
      console.error("createStore error:", err);
      return false;
    }
  };

  // ─── 초대 코드로 매장 합류 (스태프) ────────────────────────────
  const joinStoreByCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return { success: false, error: "로그인 정보가 없습니다." };

      // invite_code로 매장 찾기
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("invite_code", code.trim().toUpperCase())
        .single();

      if (storeError || !store) {
        return { success: false, error: "유효하지 않은 초대 코드입니다. 다시 확인해주세요." };
      }

      // profiles에 store_id 연결 (스태프로)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          email: session.user.email,
          store_id: store.id,
          role: "staff",
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      setProfile(prev => prev ? { ...prev, store_id: store.id, role: "staff" } : null);
      setStoreInfo(store as StoreInfo);
      return { success: true };
    } catch (err: any) {
      console.error("joinStoreByCode error:", err);
      return { success: false, error: err.message || "합류 중 오류가 발생했습니다." };
    }
  };

  // ─── 기존 프로필 수정 (마스터 전용) ────────────────────────────
  const updateStoreProfile = async (updateData: { store_name?: string; category?: string; owner_name?: string }) => {
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

      // stores 테이블도 동기화
      if (profile?.store_id && updateData.store_name) {
        await supabase
          .from("stores")
          .update({ name: updateData.store_name, category: updateData.category })
          .eq("id", profile.store_id);
        setStoreInfo(prev => prev ? { ...prev, name: updateData.store_name!, category: updateData.category || prev.category } : null);
      }

      setProfile(prev => prev ? { ...prev, ...updateData } : null);
      return true;
    } catch (err: any) {
      console.error("updateStoreProfile error:", err);
      return false;
    }
  };

  // ─── 개발자 모드 (Mock Login) ──────────────────────────────────
  const loginAsMockUser = () => {
    // 1. 미들웨어 우회용 쿠키 설정
    document.cookie = "ordercatch-mock-user=true; path=/; max-age=3600"; // 1시간 유지

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

  return (
    <StoreContext.Provider value={{
      profile, storeInfo, loading, isMaster,
      updateStoreProfile, createStore, joinStoreByCode, refreshStore,
      loginAsMockUser
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStoreProvider = () => useContext(StoreContext);
