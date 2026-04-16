"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

import { Suspense } from "react";

function AuthCallbackContent() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/dashboard");
    });

    const timeout = setTimeout(() => {
      window.location.replace("/?error=로그인에+실패했습니다.+다시+시도해주세요.");
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

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        로딩 중...
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
