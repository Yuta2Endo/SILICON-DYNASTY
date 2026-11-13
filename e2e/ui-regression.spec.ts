import { expect, test, type Page } from "@playwright/test";

async function openGame(page: Page) {
  await page.goto("/");
  const continueButton = page.getByRole("button", { name: "Продолжить" });
  await continueButton.waitFor({ state: "visible", timeout: 10_000 });
  await continueButton.click();
  await expect(page.getByRole("heading", { name: "Панель компании", level: 1 })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
}

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows four primary destinations and a focusable More sheet", async ({ page }) => {
    await openGame(page);

    const navigation = page.getByRole("navigation", { name: "Основная навигация" });
    await expect(navigation.getByRole("button")).toHaveCount(5);
    await expect(navigation.getByRole("button", { name: "Ещё" })).toBeVisible();
    await expect(navigation.getByRole("button", { name: "Настройки" })).toHaveCount(0);

    await navigation.getByRole("button", { name: "Ещё" }).click();
    const sheet = page.getByRole("dialog", { name: "Ещё" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Настройки" }).click();

    await expect(page.getByRole("heading", { name: "Настройки", level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test("keeps product tabs scrollable and OS editor sections usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page);

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Процессор" })
    .click();

  const productTabs = page.locator(".product-workspace-tabs");
  await expect(productTabs).toBeVisible();
  const tabMetrics = await productTabs.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(tabMetrics.scrollWidth).toBeGreaterThan(tabMetrics.clientWidth);

  await productTabs.getByRole("button", { name: "ОС" }).click();
  await expect(page.getByRole("heading", { name: "Лаборатория ОС", level: 1 })).toBeVisible();

  await page.locator("#os-new-project-name").fill("UI QA OS");
  await page
    .locator(".cpu-create-form")
    .getByRole("button", { name: "Создать проект" })
    .click();
  await expect(page.locator("#os-project-name")).toBeVisible();

  await page.getByRole("tab", { name: "Системы" }).click();
  await expect(page.locator("#os-panel-systems")).toBeVisible();
  await expect(page.locator("#os-panel-core")).toBeHidden();

  await page.getByRole("tab", { name: "Экосистема" }).click();
  await expect(page.locator("#os-panel-ecosystem")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("keeps market tabs in one row and renders the 14-day market pulse", async ({ page }) => {
  await openGame(page);

  const nextDay = page.getByRole("button", { name: "Следующий день" });
  await nextDay.click();
  await expect(nextDay).toBeEnabled();
  await nextDay.click();
  await expect(nextDay).toBeEnabled();

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Рынок" })
    .click();
  await expect(page.getByRole("heading", { name: "Рынок и продажи", level: 1 })).toBeVisible();

  const tabs = page.locator(".market-tabs").getByRole("tab");
  await expect(tabs).toHaveCount(3);
  const tabRows = await tabs.evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().top)),
  );
  expect(new Set(tabRows).size).toBe(1);

  await expect(page.getByRole("heading", { name: "Динамика рынка" })).toBeVisible();
  await expect(page.locator(".market-pulse .trend-sparkline")).toHaveCount(3);
  await expectNoHorizontalOverflow(page);
});

test("compares two saved OS versions", async ({ page }) => {
  await openGame(page);

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Процессор" })
    .click();
  await page.locator(".product-workspace-tabs").getByRole("button", { name: "ОС" }).click();
  await expect(page.getByRole("heading", { name: "Лаборатория ОС", level: 1 })).toBeVisible();

  await page.locator("#os-new-project-name").fill("Compare E2E OS");
  await page
    .locator(".cpu-create-form")
    .getByRole("button", { name: "Создать проект" })
    .click();
  await expect(page.locator("#os-project-name")).toBeVisible();

  await page.selectOption("#os-field-kernelType", "microkernel");
  await page.selectOption("#os-field-ipcModel", "message-passing");
  await page.selectOption("#os-field-driverModel", "user-space");
  await page.getByRole("button", { name: "Сохранить версию" }).click();

  const compare = page.locator(".os-compare");
  await expect(compare).toBeVisible();
  await expect(compare.locator("select")).toHaveCount(2);
  await expect(compare.locator(".os-compare__metric")).toHaveCount(8);
  await expectNoHorizontalOverflow(page);
});
