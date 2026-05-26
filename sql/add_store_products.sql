-- store_order_templates 테이블에 매장별 취급 상품 목록(store_products) 컬럼 추가
ALTER TABLE public.store_order_templates 
ADD COLUMN IF NOT EXISTS store_products TEXT;

COMMENT ON COLUMN public.store_order_templates.store_products IS '매장에서 주로 판매하는 상품 목록 (쉼표로 구분된 텍스트)';
