-- 1. profiles 테이블 (유저 매장 정보)
-- auth.users 와 1:1 관계
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT,
    store_name TEXT,
    store_slug TEXT UNIQUE,
    category TEXT,
    owner_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. orders 테이블 (주문 내역)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone TEXT,
    product_name TEXT NOT NULL,
    pickup_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT '입금대기',
    amount NUMERIC DEFAULT 0,
    source TEXT,
    options JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Row Level Security (RLS) 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3-1. profiles 정책
-- 각 사용자는 자신의 프로필만 보고 수정할 수 있음
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- 3-2. orders 정책
-- 사장님(authenticated)은 자신의 매장 주문만 조회/수정/삭제 가능
CREATE POLICY "Users can view own store orders" 
ON public.orders FOR SELECT 
TO authenticated 
USING (auth.uid() = store_id);

CREATE POLICY "Users can update own store orders" 
ON public.orders FOR UPDATE 
TO authenticated 
USING (auth.uid() = store_id);

CREATE POLICY "Users can delete own store orders" 
ON public.orders FOR DELETE 
TO authenticated 
USING (auth.uid() = store_id);

-- 3-3. Webhook 및 외부 주문을 위한 정책 (익명/퍼블릭 허용)
-- 주의: 보안을 위해 특정 조건(예: store_id가 유효한지 등)을 추가할 수 있습니다.
-- 현재는 모든 익명 사용자가 주문을 생성할 수 있도록 허용합니다.
CREATE POLICY "Allow public/webhook to insert orders" 
ON public.orders FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- profiles 조회 정책: 매장 코드로 매장 ID를 찾아야 하므로 익명 조회 허용 (필요한 컬럼만)
CREATE POLICY "Allow public to select profile by slug" 
ON public.profiles FOR SELECT 
TO anon 
USING (true);
