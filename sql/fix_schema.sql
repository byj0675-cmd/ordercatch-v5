-- ============================================================
-- OrderCatch 데이터베이스 테이블 스키마 복구 스크립트
-- Supabase Dashboard -> SQL Editor 에서 복사하여 실행하세요.
-- ============================================================

-- 1. stores 테이블에 누락된 컬럼 추가
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- 2. profiles 테이블에 누락된 컬럼 추가 (stores 테이블 외래키 설정 포함)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'master';

-- 3. 혹시 모를 정책 누락 방지 및 SELECT RLS 정책 수정 (핵심 버그 수정)
-- 기존의 가입된 멤버만 조회 가능한 SELECT 정책은 새 매장 생성 시 본인 매장 조회를 차단하는 치명적인 문제를 발생시킵니다 (닭과 달걀의 문제).
-- 따라서 모든 로그인된 사용자가 매장 정보(이름, 업종 등)를 조회할 수 있도록 전체 허용합니다.
DROP POLICY IF EXISTS "members can select store" ON public.stores;
CREATE POLICY "authenticated can select store"
  ON public.stores FOR SELECT
  TO authenticated
  USING (true);

-- authenticated 사용자가 stores에 insert할 수 있도록 허용
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'stores' AND policyname = 'authenticated can insert store'
  ) THEN
    CREATE POLICY "authenticated can insert store"
      ON public.stores FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- 4. profiles 테이블의 RLS 무한 재귀 오류 해결 (추가 치명적 버그 수정)
-- SELECT 정책 내에서 profiles를 다시 조회(서브쿼리)하여 발생하던 infinite recursion 오류를 보안 정의자 함수(SECURITY DEFINER)로 해결합니다.
CREATE OR REPLACE FUNCTION public.get_user_store_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT store_id FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR store_id = public.get_user_store_id(auth.uid())
  );

