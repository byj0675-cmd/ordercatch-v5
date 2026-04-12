import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key-placeholder";

// @supabase/ssr createBrowserClient는 Netlify에서 PKCE verifier cookie가 유실되는 버그 있음.
// createClient(supabase-js)는 localStorage 기반으로 안정적.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signInWithKakao = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  if (error) {
    console.error("Kakao Login error:", error);
  }
  return { data, error };
};
