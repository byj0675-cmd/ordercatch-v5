# OrderCatch 대시보드 실무형 UI/UX 전면 개편 계획서

> 목표: 디저트/네일 공방 사장님들의 **실제 업무 프로세스**에 최적화된 대시보드로 전면 리팩토링

---

## 영향 범위 요약

| 변경 유형 | 파일 | 설명 |
|----------|------|------|
| MODIFY | `app/lib/mockData.ts` | 상태값 타입 전면 변경 |
| MODIFY | `app/dashboard/page.tsx` | 벤토 그리드, 필터, 중복 체크, 프린트 상태 연동 |
| MODIFY | `app/components/CalendarView.tsx` | 날짜 클릭 → 사이드 드로어 / 바텀시트 |
| MODIFY | `app/components/OrderDetailModal.tsx` | 이미지 썸네일 표시 + Lightbox |
| MODIFY | `app/components/ManualOrderSheet.tsx` | 이미지 업로드/붙여넣기 + 중복 체크 팝업 |
| MODIFY | `app/components/PasteBoard.tsx` | 상태값 참조 업데이트 |
| NEW | `app/components/DayDrawer.tsx` | 날짜 클릭 시 사이드 드로어/바텀시트 + 프린트 |
| NEW | `app/components/DuplicateCheckModal.tsx` | 중복 고객 감지 팝업 |
| NEW | `app/components/ImageLightbox.tsx` | 이미지 원본 크기 팝업 |
| MODIFY | `app/api/orders/register/route.ts` | 기본 상태값 `신규주문` 으로 변경 |
| MODIFY | `app/globals.css` | 드로어 애니메이션, 프린트 CSS 업데이트 |

---

## Phase 1 — 주문 상태(Status) 로직 전면 변경

기존: `입금대기 → 제작중 → 픽업예정 → 픽업완료 → 취소됨`
신규: `신규주문 → 제작중 → 픽업대기 → 완료 → 취소`

> ⚠️ **DB 마이그레이션 필요**: 기존 Supabase `orders` 테이블에 저장된 status 값을 새 값으로 UPDATE하는 SQL 1회 실행 필요

### 체크리스트

- [ ] `app/lib/mockData.ts` — `OrderStatus` 타입 변경
  ```
  "신규주문" | "제작중" | "픽업대기" | "완료" | "취소"
  ```
- [ ] `app/lib/mockData.ts` — `STATUS_CONFIG` 색상 재정의
  - 신규주문: 초록 계열 (입금 완료 = 확정된 주문)
  - 제작중: 파란 계열 (기존 유지)
  - 픽업대기: 보라/앰버 계열 (눈에 띄게)
  - 완료: 회색 계열 (아카이브)
  - 취소: 빨강 계열 (기존 유지)
- [ ] `app/dashboard/page.tsx` — 벤토 그리드 상단 요약 카드 재배치
  - **대형 카드 좌측**: "신규 주문(입금완료)" 건수 → 가장 눈에 띄게
  - **대형 카드 우측**: "픽업 대기" 건수 → 오늘 해야 할 일
  - **소형 4개**: 제작중 / 완료 / 취소 / 오늘 매출
- [ ] `app/dashboard/page.tsx` — `SUMMARY_CARDS`, `FilterKey`, `summaryData` 전체 업데이트
- [ ] `app/components/ManualOrderSheet.tsx` — 상태 선택칩 업데이트
- [ ] `app/components/OrderDetailModal.tsx` — STATUSES 배열 업데이트
- [ ] `app/api/orders/register/route.ts` — 기본 삽입 status `'신규주문'`으로 변경
- [ ] Supabase SQL 마이그레이션 스크립트 작성 (`sql/migrate_status.sql`)

---

## Phase 2 — 캘린더 인터랙션 고도화 (날짜 클릭 → 드로어)

### 동작 시나리오
1. 데스크톱: 날짜 셀 클릭 → **오른쪽에서 슬라이드-인 사이드 드로어** (width: 420px)
2. 모바일: 날짜 셀 클릭 → **하단에서 올라오는 바텀시트** (max-height: 90vh)
3. 드로어/시트 안에 해당 날짜의 주문이 **시간순 정렬**된 상세 카드로 표시
4. 드로어 상단 우측에 **🖨️ (선택한 날짜) 주문서 출력** 버튼
5. 닫기: 바깥 영역 클릭 또는 ✕ 버튼

### 체크리스트

- [ ] **[NEW]** `app/components/DayDrawer.tsx` 생성
  - Props: `date: Date`, `orders: Order[]`, `onClose`, `onOrderClick`, `onStatusChange`, `onDelete`
  - 데스크톱: 우측 드로어 (position: fixed, right: 0, width: 420px)
  - 모바일: 바텀시트 (position: fixed, bottom: 0, full-width)
  - 반응형 전환: CSS `@media (min-width: 768px)` 기반
  - 헤더: "{M}월 {D}일 {요일}" + 주문 건수 + 총 매출
  - 본문: 시간순 정렬된 주문 카드 목록 (OrderCard 재사용)
  - 각 카드 클릭 시 `onOrderClick` 호출 (기존 상세 모달 연결)
  - 🖨️ 프린트 버튼
- [ ] `app/components/CalendarView.tsx` — `DesktopCalendar` 수정
  - 날짜 셀 전체를 클릭 가능하게 변경 (기존: 개별 주문 버튼만 클릭)
  - 클릭 시 `onDayClick(date)` 콜백 호출
  - 선택된 날짜 셀에 하이라이트 시각 효과 추가
- [ ] `app/components/CalendarView.tsx` — `MobileView` 수정
  - 날짜 섹션 헤더 클릭 시 `onDayClick(date)` 호출
- [ ] `app/components/CalendarView.tsx` — props에 `onDayClick` 추가
- [ ] `app/dashboard/page.tsx` — DayDrawer 상태 관리
  - `selectedDay: Date | null` state 추가
  - CalendarView에 `onDayClick` 핸들러 연결
  - DayDrawer 렌더링 조건부 추가
- [ ] `app/globals.css` — 드로어 슬라이드 애니메이션 추가
  - `@keyframes slideInRight` (데스크톱)
  - `@keyframes slideUpDrawer` (모바일)

### Phase 2-B — 선택 날짜 맞춤형 프린트

- [ ] `DayDrawer.tsx` 내부에 프린트 전용 섹션 (`#day-print-section`) 추가
  - 선택된 날짜의 주문만 테이블 형태로 렌더링
  - 컬럼: 번호 / 픽업시간 / 고객명 / 상품 / 레터링·요청 / 금액 / 상태 / 사진유무
- [ ] `app/globals.css` — `@media print` 규칙 업데이트
  - 기존 `#print-section` 외에 `#day-print-section`도 지원
  - 드로어가 열려 있을 때 프린트 → 드로어 내 프린트 섹션만 출력
  - 드로어 없을 때 프린트 → 기존 오늘 주문 출력 유지
- [ ] `DayDrawer.tsx` — 🖨️ 버튼 클릭 시 `window.print()` 호출

---

## Phase 3 — 이미지 업로드 + Lightbox

### Supabase Storage 설정
- [ ] Supabase Dashboard에서 `order_images` 버킷 생성 (Public 접근 허용)
- [ ] RLS 정책: `authenticated` 사용자만 upload 가능, 읽기는 Public

### 체크리스트

- [ ] `app/lib/mockData.ts` — `Order.options`에 `imageUrl?: string` 필드 추가
- [ ] `app/components/ManualOrderSheet.tsx` — 이미지 업로드 UI 추가
  - 드래그앤드롭 / 파일 선택 / **클립보드 붙여넣기(Ctrl+V)** 지원
  - 미리보기 썸네일 표시
  - 저장 시 Supabase Storage에 업로드 후 URL을 `options.imageUrl`에 저장
  - 파일명: `{storeId}/{orderId}_{timestamp}.{ext}` 형식
- [ ] `app/components/PasteBoard.tsx` — 이미지 관련 옵션 표시 (imageUrl이 있으면 썸네일)
- [ ] `app/components/OrderDetailModal.tsx` — 이미지 썸네일 표시
  - `options.imageUrl`이 있으면 카드 상단에 큰 썸네일 표시
  - 클릭 시 `ImageLightbox` 팝업
- [ ] **[NEW]** `app/components/ImageLightbox.tsx` 생성
  - 전체화면 오버레이 + 이미지 원본 크기 표시
  - 배경 클릭 / ESC / ✕ 버튼으로 닫기
- [ ] `DayDrawer.tsx` — 날짜별 주문 카드에 이미지 썸네일 표시 (있는 경우)

---

## Phase 4 — 스마트 중복 체크

### 동작 시나리오
1. 수기 주문 등록(ManualOrderSheet)에서 고객명 + 연락처 입력 후 포커스 벗어날 때
2. 기존 DB에서 동일 이름+번호 주문 검색
3. 일치하는 주문이 있으면 → **팝업 등장**
4. 버튼 A: `[새로운 주문으로 추가]` → 신규 INSERT (기존 유지)
5. 버튼 B: `[기존 주문 수정하기]` → 기존 주문을 로드하여 폼에 채워넣고 UPDATE 모드로 전환

### 체크리스트

- [ ] **[NEW]** `app/components/DuplicateCheckModal.tsx` 생성
  - Props: `existingOrders: Order[]`, `onNewOrder`, `onEditOrder(order)`, `onClose`
  - UI: "🔔 이미 등록된 고객입니다! 어떻게 처리할까요?" 헤더
  - 기존 주문 정보 미리보기 카드 (상품명, 픽업일, 상태 등)
  - 버튼 A: 새로운 주문으로 추가 (초록)
  - 버튼 B: 기존 주문 수정하기 (파랑)
- [ ] `app/components/ManualOrderSheet.tsx` — 중복 체크 로직 추가
  - 고객명 + 연락처 입력 시 `onBlur`에서 Supabase 조회
  - 일치 주문 발견 시 `DuplicateCheckModal` 표시
  - "기존 주문 수정" 선택 시: 폼에 기존 값 auto-fill + `isUpdateMode` state
  - 저장 시 `isUpdateMode`면 `.update()`, 아니면 `.insert()`
- [ ] `app/components/PasteBoard.tsx` — AI 파싱 결과 저장 전 동일한 중복 체크 적용

---

## Supabase 마이그레이션 SQL

```sql
-- sql/migrate_status.sql
-- 기존 상태값을 새 프로세스로 변환
UPDATE orders SET status = '신규주문' WHERE status = '입금대기';
UPDATE orders SET status = '픽업대기' WHERE status = '픽업예정';
UPDATE orders SET status = '완료' WHERE status = '픽업완료';
UPDATE orders SET status = '취소' WHERE status = '취소됨';
-- '제작중'은 그대로 유지
```

> ⚠️ 이 SQL은 코드 배포 **직전 또는 동시에** 실행해야 합니다.

---

## 작업 순서

```
Phase 1 (상태 로직) → Phase 2 (캘린더+드로어+프린트) → Phase 3 (이미지) → Phase 4 (중복 체크)
```

각 Phase 완료 시마다 `npm run build`로 빌드 검증 후 커밋.
