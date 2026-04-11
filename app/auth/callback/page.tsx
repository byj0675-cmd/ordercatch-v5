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

    const timeout = setTimeout(() => {
      window.location.replace("/?error=timeout%3A%20exchangeCodeForSession%20did%20not%20respond");
    }, 8000);

    supabase.auth.exchangeCodeForSession(code)
      .then(({ data, error }) => {
        clearTimeout(timeout);
        if (error) {
          window.location.replace(`/?error=${encodeURIComponent(error.message)}`);
        } else {
          router.replace("/dashboard");
        }
      })
      .catch((err: any) => {
        clearTimeout(timeout);
        window.location.replace(`/?error=${encodeURIComponent(String(err))}`);
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
