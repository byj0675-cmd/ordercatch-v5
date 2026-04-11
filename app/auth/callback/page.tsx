"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("로그인 처리 중...");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      window.location.replace("/?error=no_code_provided");
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        window.location.replace(`/?error=${encodeURIComponent(error.message)}`);
      } else {
        router.replace("/dashboard");
      }
    });
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif",
      fontSize: 16, color: "#6B7280",
    }}>
      {status}
    </div>
  );
}
