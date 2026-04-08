# OrderCatch B2B SaaS 마스터 설계도

## 1. 프로젝트 개요 & 기술 스택
- **목표:** 인스타 DM, 카카오톡 웹훅으로 들어온 비정형 주문 텍스트를 AI가 분석해 사장님 대시보드 장부에 자동 저장하는 시스템.
- **기술 스택:** Next.js (App Router), React, Node.js, Tailwind CSS, shadcn/ui (미니멀 UI), PostgreSQL (Supabase 연동 상정).

## 2. 데이터베이스(DB) 스키마 정의
- `users` 테이블: id, email, name, store_id
- `orders` 테이블: id, store_id, customer_name, phone, product_name, pickup_date (ISO 8601 Timestamp), status (예: 입금대기, 제작중, 픽업완료), options (JSONB 타입 - 주소, 알러지, 보냉백 추가, 퀵 여부 등 규격 외 모든 정보 저장)

## 3. 핵심 AI 파싱 로직 (Gemini API)
- **주요 엔드포인트:** 수동 입력용 `POST /api/orders/manual-parse`, 자동 수신용 `POST /api/webhook/kakao`
- **시스템 프롬프트 강제 규칙:**
  1. "현재 시스템 날짜와 시간은 [현재 Date ISO 값]이다"를 반드시 주입하여 '내일 오후 3시', '4월 2일' 등의 상대적 날짜를 절대 시간으로 완벽히 계산할 것.
  2. 고객이 시간을 명시하지 않은 경우 임의로 시간을 넣지 말고 '시간 미정' 등으로 처리할 것.
  3. (예시) "내일 오후 3시 바람떡 30세트 예약요, 퀵으로 받을게요 주소는..." -> product_name: "바람떡 30세트", pickup_date: 내일 15:00, options: { delivery: "퀵", address: "..." } 형태로 정확히 파싱.

## 4. 디자인 시스템 (UI/UX)
- **컨셉:** 애플(Apple) 스타일의 넉넉한 여백, 미니멀리즘, 글래스모피즘(backdrop-blur).
- **메인 레이아웃:** - 상단: 오늘의 요약 카드 6개 (신규 주문, 입금 대기, 오늘 픽업 등).
  - 하단: 주문 내역 테이블. 첫 번째 열은 '픽업 일시'이며 `MM월 DD일 HH:mm` 형식으로 직관성 극대화.
- **디테일 UX:** - 카카오 웹훅 주소(`api/webhook/kakao?storeId=...`)는 메인에서 빼고 우측 상단 [⚙️ 설정] 모달로 숨김. 
  - 데이터가 0건일 때는 텅 빈 표 대신 세련된 'Empty State' 안내 문구 중앙 표시.
  - 테이블 우측 [상세보기] 버튼 클릭 시 `options`에 담긴 상세 정보가 모달 창으로 부드럽게 열리도록 구현.

## 5. 결제 연동 (Toss Payments)
- 대시보드 주문 상세보기 모달 내에 '토스페이먼츠 결제 링크 생성' 및 결제창 호출을 위한 기초 UI 및 로직 뼈대 준비.