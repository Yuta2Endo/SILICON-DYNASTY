import { expect, test, type Page } from "@playwright/test";

import { createOsProject, createDefaultOsConfiguration, type OsRelease } from "../src/game/models/os";
import { createInitialGameState } from "../src/game/models/game-state";

async function continueGame(page: Page) {
  const continueButton = page.getByRole("button", { name: "Продолжить" });
  await continueButton.waitFor({ state: "visible", timeout: 10_000 });
  await continueButton.click();
  await expect(page.getByRole("heading", { name: "Панель компании", level: 1 })).toBeVisible();
}

test("licenses a released OS through a commercial contract", async ({ page }) => {
  const configuration = createDefaultOsConfiguration();
  const project = createOsProject("os-1", "Commercial OS", configuration, "1995-01-01");
  const release: OsRelease = {
    id: "os-release-1",
    version: 1,
    stage: "stable",
    createdOn: "1995-01-01",
    configuration,
    qualityScore: 72,
    appealScore: 64,
    costUsd: 80_000,
  };
  const state = {
    ...createInitialGameState(),
    company: {
      ...createInitialGameState().company,
      reputation: 50,
      balance: 100_000,
    },
    osProjects: [{ ...project, releases: [release] }],
  };

  await page.goto("/");
  await page.getByRole("button", { name: "Продолжить" }).waitFor({ state: "visible", timeout: 10_000 });

  await page.evaluate(async (save) => {
    const request = indexedDB.open("silicon-dynasty");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("game-saves", "readwrite");
      transaction.objectStore("game-saves").put(save, "current");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, state);

  await page.reload();
  await continueGame(page);

  await page.getByRole("button", { name: "Следующий день" }).click();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Рынок" })
    .click();

  const contracts = page.locator('section[aria-labelledby="market-commercial-title"]');
  await expect(contracts.getByRole("heading", { name: "Коммерческие контракты" })).toBeVisible();
  const accept = contracts.getByRole("button", { name: "Принять" });
  await expect(accept).toBeVisible();
  await accept.click();

  await expect(contracts.getByText("Активные контракты")).toBeVisible();
  await expect(contracts.getByText("Commercial OS stable v1")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Обзор" })
    .click();
  await expect(page.getByRole("heading", { name: "Коммерческая выручка" })).toBeVisible();
  await expect(page.getByText("Лицензия ОС")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
});
