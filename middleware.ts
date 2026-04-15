import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. 문지기가 융통성 있게 응답(Response) 객체를 먼저 만듭니다.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Supabase 서버 클라이언트를 생성합니다. (여기서 쿠키를 굽고 지웁니다)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // 중요: 들어오는 요청과 나가는 응답 양쪽에 모두 쿠키를 구워줍니다!
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

  // 3. 사장님의 로그인 도장(Session)을 확실하게 확인합니다.
  const { data: { session } } = await supabase.auth.getSession()

  // 4. 만약 도장이 없는데 대시보드(/dashboard)로 가려고 하면 메인 랜딩(/) 페이지로 쫓아냅니다.
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/' // 로그인 페이지 경로를 메인 화면으로 설정
    return NextResponse.redirect(url)
  }

  // 5. 도장이 확인되면 대시보드로 무사히 통과시킵니다.
  return response
}

// 6. 이 문지기가 감시할 구역을 설정합니다. (이미지 등 정적 파일 무시)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ], 
}
