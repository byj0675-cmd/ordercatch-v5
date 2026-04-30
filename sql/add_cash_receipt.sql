-- ============================================================
-- 현금영수증 수집을 위한 컬럼 추가 마이그레이션
-- Supabase Dashboard -> SQL Editor 에서 실행하세요
-- ============================================================

ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS cash_receipt_info TEXT;
