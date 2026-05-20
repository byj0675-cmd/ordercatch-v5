-- 1. 유저의 store_id를 RLS 재귀 없이 안전하게 조회하는 SECURITY DEFINER 함수 생성
CREATE OR REPLACE FUNCTION public.get_user_store_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT store_id FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. 기존 재귀 오류가 있는 SELECT 정책 제거
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 3. 재귀가 없는 안전한 SELECT 정책 생성
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR store_id = public.get_user_store_id(auth.uid())
  );
