-- 기존 주문 상태값을 새로운 상태값 로직(Phase 1)으로 마이그레이션합니다.
-- 이 SQL을 Supabase Dashboard의 SQL Editor에서 한 번만 실행해주세요.

-- 1. '입금대기' -> '신규주문'
UPDATE orders 
SET status = '신규주문' 
WHERE status = '입금대기';

-- 2. '픽업예정' -> '픽업대기'
UPDATE orders 
SET status = '픽업대기' 
WHERE status = '픽업예정';

-- 3. '픽업완료' -> '완료'
UPDATE orders 
SET status = '완료' 
WHERE status = '픽업완료';

-- 4. '취소됨' -> '취소'
UPDATE orders 
SET status = '취소' 
WHERE status = '취소됨';

-- ('제작중'은 동일하므로 그대로 유지됩니다)
