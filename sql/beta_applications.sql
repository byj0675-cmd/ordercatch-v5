-- ============================================================
-- OrderCatch 1기 사전체험단 신청자 명단 및 할인 정보 스키마
-- Supabase Dashboard -> SQL Editor 에서 실행하세요
-- ============================================================

-- 1. beta_applications 테이블 생성
CREATE TABLE IF NOT EXISTS public.beta_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  store_name TEXT NOT NULL,
  item TEXT,
  sns_link TEXT,
  interview_status TEXT DEFAULT '대기' NOT NULL, -- '대기', '연락함', '인터뷰완료'
  is_lifetime_discount BOOLEAN DEFAULT false NOT NULL, -- 평생 50% 할인 여부
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Enable
ALTER TABLE public.beta_applications ENABLE ROW LEVEL SECURITY;

-- 익명/인증 사용자 인서트 허용 (랜딩 페이지에서 신청)
DROP POLICY IF EXISTS "Allow public to insert beta applications" ON public.beta_applications;
CREATE POLICY "Allow public to insert beta applications"
  ON public.beta_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 최고 관리자 조회 허용
DROP POLICY IF EXISTS "Super admins can view beta applications" ON public.beta_applications;
CREATE POLICY "Super admins can view beta applications"
  ON public.beta_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true)
  );

-- 최고 관리자 업데이트 허용
DROP POLICY IF EXISTS "Super admins can update beta applications" ON public.beta_applications;
CREATE POLICY "Super admins can update beta applications"
  ON public.beta_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true)
  );


-- 2. stores 및 profiles 테이블에 컬럼 추가 (이미 있으면 무시)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS is_lifetime_discount BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
