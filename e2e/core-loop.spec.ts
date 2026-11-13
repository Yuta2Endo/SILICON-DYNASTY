import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  const continueButton = page.getByRole("button", { name: "Продолжить" });
  if (await continueButton.isVisible()) {
    await continueButton.click();
  }
  await expect(page.getByRole("heading", { name: "Панель компании", level: 1 })).toBeVisible();
});

test("navigates the core workspace and exports an analytics report", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Рынок" })
    .click();

  await expect(page.getByRole("heading", { name: "Рынок и продажи", level: 1 })).toBeVisible();
  await page.getByRole("tab", { name: "Аналитика" }).click();
  await expect(page.getByRole("heading", { name: "Аналитика компании" })).toBeVisible();

  await page.getByRole("button", { name: "7 дней" }).click();
  await expect(page.getByRole("button", { name: "7 дней" })).toHaveAttribute("aria-pressed", "true");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("silicon-dynasty-analytics-");
  expect(download.suggestedFilename()).toContain(".csv");
});

test("exports the current save from Settings", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Настройки" })
    .click();

  await expect(page.getByRole("heading", { name: "Сохранения и восстановление" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспортировать JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^silicon-dynasty-\d{4}-\d{2}-\d{2}\.json$/);
});
