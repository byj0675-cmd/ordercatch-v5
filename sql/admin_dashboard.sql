-- ============================================================
-- OrderCatch 관리자 대시보드 및 구독 시스템 마이그레이션
-- Supabase Dashboard -> SQL Editor 에서 실행하세요
-- ============================================================

-- 1. profiles 테이블에 관리자 식별용 컬럼 및 결제 상태 추가
-- 이미 role 컬럼이 존재하여 'master'(매장주), 'staff'(직원)로 사용 중이므로, 
-- 최고 관리자 구분을 위해 is_super_admin 컬럼을 추가합니다.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none';

-- (참고) 본인의 계정을 최고 관리자로 설정하려면 아래 쿼리의 이메일을 본인 것으로 변경 후 실행하세요.
-- UPDATE public.profiles SET is_super_admin = true WHERE email = 'admin@example.com';


-- 2. stores 테이블에 구독 정보 추가
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;


-- 3. payment_requests (결제 대기 목록) 테이블 생성
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  depositor_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제 요청은 사용자가 생성할 수 있고, 관리자는 조회 및 수정할 수 있어야 합니다.
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own payment requests"
  ON public.payment_requests FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Users can view their own payment requests"
  ON public.payment_requests FOR SELECT
  TO authenticated
  USING (applicant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
  ));

CREATE POLICY "Super admins can update payment requests"
  ON public.payment_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true)
  );


-- 4. telegram_logs (알림 발송 로그) 테이블 생성
CREATE TABLE IF NOT EXISTS public.telegram_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'success', -- 'success', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.telegram_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view telegram logs"
  ON public.telegram_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true)
  );

-- 서버 봇(Service Role) 등에서 로그를 기록하기 위해 인서트 허용 (또는 authenticated 허용)
CREATE POLICY "Authenticated can insert telegram logs"
  ON public.telegram_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
