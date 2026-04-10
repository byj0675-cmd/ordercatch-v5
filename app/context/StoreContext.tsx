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
}

interface StoreContextProps {
  profile: Profile | null;
  loading: boolean;
  updateStoreProfile: (data: { store_name?: string; category?: string; owner_name?: string }) => Promise<boolean>;
}

const StoreContext = createContext<StoreContextProps>({
  profile: null,
  loading: true,
  updateStoreProfile: async () => false,
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfileData(session.user.id);
      } else {
        // Prevent race condition: If there's an OAuth token/code in the URL, wait for onAuthStateChange to handle it
        if (typeof window !== 'undefined' && (window.location.search.includes('code=') || window.location.hash.includes('access_token='))) {
          return;
        }
        setProfile(null);
        setLoading(false);
      }
    };
    fetchProfile();

    // Listen to Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadProfileData(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadProfileData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setProfile(data);
      } else {
        console.warn("Profile fetch error or empty profile:", error);
      }
    } catch(err) {
      console.warn("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  }

  const updateStoreProfile = async (updateData: { store_name?: string; category?: string; owner_name?: string }) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        alert("세션 오류: " + (sessionError?.message || "유저 정보 없음"));
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          ...updateData,
          updated_at: new Date().toISOString()
        });

      if (error) {
        alert("업데이트 오류: " + error.message);
        console.error("Store Profile Update Error: ", error);
        return false;
      }

      // 즉시 로컬 상태를 낙관적으로 업데이트
      setProfile(prev => prev
        ? { ...prev, ...updateData }
        : {
            id: session.user.id,
            email: session.user.email || '',
            store_slug: null,
            store_name: updateData.store_name ?? null,
            category: updateData.category ?? null,
            owner_name: updateData.owner_name ?? null,
          } as Profile
      );

      // 백그라운드에서 DB에서 최신 데이터(store_slug 등) 동기화
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data: fullyLoaded }) => {
          if (fullyLoaded) setProfile(fullyLoaded);
        });

      return true;

    } catch (err: any) {
      alert("코드 예외 발생: " + err.message);
      console.error("Exception in updateStoreProfile: ", err);
      return false;
    }
  };

  return (
    <StoreContext.Provider value={{ profile, loading, updateStoreProfile }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStoreProvider = () => useContext(StoreContext);
