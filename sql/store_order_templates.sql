-- 매장별 주문서 템플릿 테이블
-- 사장님이 등록한 샘플 주문서와 AI가 감지한 필드 항목을 저장합니다.

CREATE TABLE IF NOT EXISTS public.store_order_templates (
    store_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    sample_text TEXT,                         -- 원본 샘플 주문서 텍스트
    detected_fields JSONB DEFAULT '[]'::jsonb, -- AI가 감지한 필드명 배열 (예: ["성함", "픽업일시", "사이즈", "문구"])
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.store_order_templates ENABLE ROW LEVEL SECURITY;

-- 본인 매장의 템플릿만 조회/수정/삭제 가능
CREATE POLICY "Users can manage own order templates"
ON public.store_order_templates FOR ALL
TO authenticated
USING (auth.uid() = store_id)
WITH CHECK (auth.uid() = store_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_store_order_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_store_order_templates_updated_at
BEFORE UPDATE ON public.store_order_templates
FOR EACH ROW EXECUTE FUNCTION update_store_order_templates_updated_at();
