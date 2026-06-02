import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe.skip("오더캐치 대시보드 주문 등록 및 사진 업로드 E2E 테스트", () => {
  const testImagePath = path.join(__dirname, "test-image.png");

  test.beforeAll(() => {
    // 테스트용 가짜 이미지 파일 생성
    fs.writeFileSync(testImagePath, "fake image content");
  });

  test.afterAll(() => {
    // 테스트 종료 후 가짜 파일 삭제
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  test("로컬 개발자 계정으로 로그인하여 새 수동 주문을 등록하고 사진 업로드가 정상 동작함을 확인한다.", async ({ page }) => {
    // 1. 랜딩 페이지 접속 및 개발자 로그인 클릭
    await page.goto("/");
    const devLoginButton = page.locator("button:has-text('🛠️ 개발자')");
    await expect(devLoginButton).toBeVisible();
    await devLoginButton.click();

    // 2. 대시보드로 성공적으로 리다이렉트 되었는지 확인
    await page.waitForURL("**/dashboard");

    // [중요] 신규 테스트 계정이라 매장 정보가 없어 온보딩 모달이 뜬 경우 동적으로 대응 (대기 방식 개선)
    const chooseModeText = page.locator("text=오더캐치를 시작하는 방법을 선택해주세요");
    try {
      // 단순히 isVisible()을 즉시 체크하는 대신, 렌더링 마운트를 대기합니다.
      await expect(chooseModeText).toBeVisible({ timeout: 4000 });
      
      // '새 매장 만들기' 버튼 클릭
      await page.locator("button:has-text('새 매장 만들기')").click();
      
      // 매장 생성 폼 입력 (매장 ID는 중복 방지를 위해 유니크하게 생성)
      const uniqueSlug = `qa-shop-${Date.now()}`;
      await page.fill("input[placeholder='예: 아만다 케이크']", "QA E2E 테스트 매장");
      await page.fill("input[placeholder='사장님 성함']", "QA 테스터");
      await page.fill("input[placeholder='예: amanda-cake (고객 공유용 주소로 사용됨)']", uniqueSlug);

      // '오더캐치 시작하기' 클릭
      const startBtn = page.locator("button:has-text('오더캐치 시작하기')");
      await expect(startBtn).toBeEnabled();
      await startBtn.click();
      
      // 온보딩 모달이 닫히는 것을 대기
      await expect(chooseModeText).not.toBeVisible({ timeout: 8000 });
    } catch (e) {
      console.log("온보딩 모달이 감지되지 않았거나 이미 매장이 설정되어 있습니다. 스킵합니다.");
    }

    // 대시보드가 정상적으로 보이는지 검증 (인쇄 전용 hidden 텍스트 대신 '로그아웃' 버튼 존재 확인)
    await expect(page.locator("button:has-text('로그아웃')").first()).toBeVisible({ timeout: 10000 });

    // 3. '새로운 주문 바로 등록' 버튼 클릭
    const newOrderButton = page.locator("button:has-text('새로운 주문 바로 등록')").first();
    await expect(newOrderButton).toBeVisible();
    await newOrderButton.click();

    // 4. '수기 등록' 탭 클릭
    const manualTab = page.locator("text=수기 등록");
    await expect(manualTab).toBeVisible();
    await manualTab.click();

    // 5. 수기 폼 필드 채우기
    const testName = "QA 이미지테스터";
    await page.fill("input[placeholder='홍길동']", testName);
    await page.fill("input[placeholder='예: 레터링 케이크 2호']", "QA E2E 케이크");

    // 6. 주문 등록하기 버튼 클릭
    const saveButton = page.locator("button:has-text('주문 등록하기')");
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // 7. 주문 카드가 정상적으로 생성되었는지 확인 및 클릭하여 상세 모달 열기
    // [보완] 달력 셀 안의 가려진 조그만 글자 대신, 우측 사이드바(aside)의 상세 목록 카드를 명확하게 클릭합니다.
    const orderCard = page.locator("aside").locator(`text=${testName}`).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await orderCard.click();

    // 8. 주문 상세 모달 진입 확인 (헤더 텍스트 변경: '사진 관리' 텍스트 검증)
    const detailHeader = page.locator("text=사진 관리");
    await expect(detailHeader).toBeVisible({ timeout: 8000 });

    // 9. 사진 업로드 파일 인풋에 가짜 파일 주입
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(testImagePath);

    // 10. 사진 등록 성공 토스트 메시지 탐지
    const successToast = page.locator("text=사진이 주문에 등록되었습니다");
    await expect(successToast).toBeVisible({ timeout: 15000 });

    // 11. 상세 모달을 닫습니다 (X 버튼 매칭)
    const closeButton = page.locator("button:has(svg >> line)").first();
    await expect(closeButton).toBeVisible();
    await closeButton.click();
  });
});
