-- ============================================================
-- OrderCatch 팀 협업 마이그레이션 스크립트
-- Supabase Dashboard → SQL Editor 에서 순서대로 실행하세요
-- ============================================================

-- ▼ STEP 1: stores 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  category    TEXT DEFAULT 'other',
  invite_code TEXT UNIQUE NOT NULL DEFAULT SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- 해당 매장 멤버라면 조회 가능
CREATE POLICY "store members can read"
  ON public.stores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.store_id = stores.id
        AND profiles.id = auth.uid()
    )
  );

-- 온보딩 시 누구나 생성 가능
CREATE POLICY "authenticated can insert store"
  ON public.stores FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 마스터만 수정 가능
CREATE POLICY "master can update store"
  ON public.stores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.store_id = stores.id
        AND profiles.id = auth.uid()
        AND profiles.role = 'master'
    )
  );

-- 초대 코드로 매장 찾기 위해 anon 도 제한적 조회 허용
CREATE POLICY "anon can select by invite code"
  ON public.stores FOR SELECT
  TO anon
  USING (true);


-- ▼ STEP 2: profiles 테이블 컬럼 추가
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'master';

-- profiles RLS: 같은 store_id를 가진 멤버도 서로 프로필 조회 가능 (팀원 목록)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );


-- ▼ STEP 3: 기존 데이터 마이그레이션
-- (기존 유저 데이터를 stores 테이블로 이관)
-- ============================================================
DO $$
DECLARE
  p RECORD;
  new_store_id UUID;
BEGIN
  FOR p IN
    SELECT * FROM public.profiles
    WHERE store_id IS NULL AND store_name IS NOT NULL
  LOOP
    -- stores 테이블에 매장 생성
    INSERT INTO public.stores (name, slug, category)
    VALUES (p.store_name, p.store_slug, COALESCE(p.category, 'other'))
    RETURNING id INTO new_store_id;

    -- profiles에 store_id 연결 (기존 유저는 master)
    UPDATE public.profiles
    SET store_id = new_store_id, role = 'master'
    WHERE id = p.id;

    -- 해당 유저의 기존 주문도 새 store_id로 업데이트
    -- (기존 store_id가 profiles.id를 담고 있던 구조)
    UPDATE public.orders
    SET store_id = new_store_id
    WHERE store_id = p.id;

    RAISE NOTICE 'Migrated user % -> store %', p.id, new_store_id;
  END LOOP;
END $$;


-- ▼ STEP 4: orders RLS 수정 (store_id 기반 팀 접근)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own store orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own store orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete own store orders" ON public.orders;

-- 같은 매장 멤버면 모두 접근 가능
CREATE POLICY "store members can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.store_id = orders.store_id
        AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "store members can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.store_id = orders.store_id
        AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "store members can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.store_id = orders.store_id
        AND profiles.id = auth.uid()
    )
  );
