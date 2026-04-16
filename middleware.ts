import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // ⚠️ 현재 클라이언트는 @supabase/supabase-js createClient (Implicit Flow + localStorage) 사용.
  // 미들웨어는 쿠키 기반이라 localStorage 세션을 읽을 수 없음.
  // 따라서 대시보드 리다이렉트 로직은 비활성화하고,
  // 인증 보호는 StoreContext(클라이언트 사이드)가 전담 처리.

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // auth 콜백은 쿠키/세션 교환이 일어나는 경로 — 무조건 통과
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return response
  }

  // 환경 변수 누락 시 Netlify Edge Function 크래시를 방지
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Middleware: Missing Supabase environment variables! Skipping cookie session check.");
    return response;
  }

  try {
    // 쿠키 기반 세션이 있을 경우(SSR 전환 시 대비)에만 갱신
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // 쿠키 세션 갱신만 수행 (리다이렉트 없음 — 클라이언트 StoreContext가 처리)
    await supabase.auth.getSession()
  } catch (error) {
    console.error("Middleware Supabase Session Error:", error);
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
