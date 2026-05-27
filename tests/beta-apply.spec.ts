import { test, expect } from "@playwright/test";

test.describe("오더캐치 1기 사전 경험단 신청 프로세스 E2E 테스트", () => {
  test("홈페이지 요금표에서 사전 신청 버튼을 누르고 양식을 기재해 신청을 완료할 수 있다.", async ({ page }) => {
    // 1. 랜딩 페이지 접속
    await page.goto("/");
    await expect(page).toHaveTitle(/오더캐치/);

    // 2. 프로 요금제 카드의 '1기 사전 경험단 신청하기' 버튼 탐색 및 클릭
    const applyButton = page.locator("button:has-text('1기 사전 경험단 신청하기')").first();
    await expect(applyButton).toBeVisible();
    await applyButton.click();

    // 3. 신청서 모달 노출 검증
    const modalTitle = page.locator("h2:has-text('1기 사전 경험단 신청')");
    await expect(modalTitle).toBeVisible();

    // API 응답 모니터링 준비 (제출 시 텔레그램/구글시트 API 연동 검증용)
    const apiResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/beta-apply") && response.status() === 200,
      { timeout: 15000 }
    );

    // 4. 양식 입력
    await page.fill("input[placeholder='예: 단골 꽃집, 핑크 래빗 케이크']", "QA E2E 테스트 매장");
    await page.fill("input[placeholder='대표자 실명을 적어주세요.']", "QA 테스터");
    await page.fill("input[placeholder='010-0000-0000']", "010-9876-5432");
    
    // 주요 품목 버튼 클릭 (디저트/베이커리 클릭)
    const dessertButton = page.locator("button:has-text('디저트/베이커리')");
    await dessertButton.click();

    // SNS 채널명 입력
    await page.fill("input[placeholder='예: @store_username 또는 단골꽃집채널']", "@qa_test_shop");

    // 5. 신청 완료 버튼 클릭
    const submitButton = page.locator("button:has-text('동결 혜택받고 사전 신청하기 →')");
    await submitButton.click();

    // 6. API 호출 성공 여부 및 결과 가로채기
    const response = await apiResponsePromise;
    const responseBody = await response.json();
    expect(responseBody.success).toBe(true);

    // 7. 성공 토스트 메시지 팝업 검증
    // 토스트 내부에 포함될 문구 대기
    const toastMessage = page.locator("text=사전 경험단 신청이 완료되었습니다");
    await expect(toastMessage).toBeVisible({ timeout: 10000 });

    // 8. 모달이 닫혔는지 확인
    await expect(modalTitle).not.toBeVisible();
  });
});
