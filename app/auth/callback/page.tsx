"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // detectSessionInUrl: true 설정으로 Supabase가 ?code= 또는 #access_token= 을 자동 처리
    // onAuthStateChange로 결과를 기다림
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace("/dashboard");
      }
    });

    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.replace("/dashboard");
        } else {
          window.location.replace("/?error=로그인에+실패했습니다.+다시+시도해주세요.");
        }
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif",
      fontSize: 16, color: "#6B7280",
    }}>
      로그인 처리 중...
    </div>
  );
}
