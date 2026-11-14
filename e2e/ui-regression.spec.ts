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

  await page.locator("#os-field-gui").selectOption("desktop-shell");
  await expect(page.locator(".os-preview-app--system")).toHaveCount(4);
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Настройки" })).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("shows the daily briefing after advancing a day", async ({ page }) => {
  await openGame(page);
  await page.getByRole("button", { name: "Следующий день" }).click();

  await expect(page.getByRole("heading", { name: "Итоги дня" })).toBeVisible();
  await expect(page.getByText(/к прошлому дню/).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
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

  const compare = page.locator(".version-compare");
  await expect(compare).toBeVisible();
  await expect(compare.locator("select")).toHaveCount(2);
  await expect(compare.locator(".version-compare__metric")).toHaveCount(8);
  await expectNoHorizontalOverflow(page);
});

test("compares two saved CPU versions", async ({ page }) => {
  await openGame(page);

  await page
    .getByRole("navigation", { name: "\u041e\u0441\u043d\u043e\u0432\u043d\u0430\u044f \u043d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f" })
    .getByRole("button", { name: "\u041f\u0440\u043e\u0446\u0435\u0441\u0441\u043e\u0440" })
    .click();

  await page.locator("#cpu-new-project-name").fill("Compare E2E CPU");
  await page
    .locator(".cpu-create-form")
    .getByRole("button", { name: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c CPU-\u043f\u0440\u043e\u0435\u043a\u0442" })
    .click();
  await expect(page.locator("#cpu-clock-mhz")).toBeVisible();

  await page.locator("#cpu-clock-mhz").fill("200");
  await page.getByRole("button", { name: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043d\u043e\u0432\u0443\u044e \u0432\u0435\u0440\u0441\u0438\u044e" }).click();

  const compare = page.locator(".version-compare");
  await expect(compare).toBeVisible();
  await expect(compare.locator("select")).toHaveCount(2);
  await expect(compare.locator(".version-compare__metric")).toHaveCount(6);

  const diePreview = page.locator(".cpu-die-preview");
  await expect(diePreview).toBeVisible();
  await expect(diePreview.locator(".cpu-die-block")).toHaveCount(5);
  await expect(diePreview.locator(".cpu-die-block.is-selected")).toHaveCount(1);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(compare).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("compares two saved component versions", async ({ page }) => {
  await openGame(page);

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Процессор" })
    .click();
  await page.locator(".product-workspace-tabs").getByRole("button", { name: "Компоненты" }).click();

  await page.locator("#component-new-project-name").fill("Compare E2E Component");
  await page
    .locator(".cpu-create-form")
    .getByRole("button", { name: "Создать проект компонента" })
    .click();
  await expect(page.locator("#component-field-computeUnits")).toBeVisible();

  await page.locator("#component-field-computeUnits").fill("16");
  await page.getByRole("button", { name: "Сохранить новую версию" }).click();

  const compare = page.locator(".version-compare");
  await expect(compare).toBeVisible();
  await expect(compare.locator("select")).toHaveCount(2);
  await expect(compare.locator(".version-compare__metric")).toHaveCount(5);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(compare).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("compares two saved AI versions", async ({ page }) => {
  await openGame(page);

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Процессор" })
    .click();
  await page.locator(".product-workspace-tabs").getByRole("button", { name: "ИИ" }).click();
  await expect(page.getByRole("heading", { name: "Лаборатория ИИ", level: 1 })).toBeVisible();

  await page.locator("#ai-new-project-name").fill("Compare E2E AI");
  await page
    .locator("form.company-form")
    .getByRole("button", { name: "Создать проект" })
    .click();
  await expect(page.locator("#ai-field-parameterCountM")).toBeVisible();

  await page.locator("#ai-field-parameterCountM").fill("20");
  await page.getByRole("button", { name: "Сохранить версию" }).click();

  const compare = page.locator(".version-compare");
  await expect(compare).toBeVisible();
  await expect(compare.locator("select")).toHaveCount(2);
  await expect(compare.locator(".version-compare__metric")).toHaveCount(6);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(compare).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("shows competitor finances and market status", async ({ page }) => {
  await openGame(page);

  await page.getByRole("button", { name: "Следующий день" }).click();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Рынок" })
    .click();

  await expect(page.getByRole("heading", { name: "Конкуренты" })).toBeVisible();
  const competitors = page.locator(".market-competitor-grid");
  await expect(competitors.getByText("На рынке").first()).toBeVisible();
  await expect(competitors.getByText("Баланс").first()).toBeVisible();
  await expect(competitors.getByText("Чистый результат").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("accepts an OEM design-win offer for a released processor", async ({ page }) => {
  await openGame(page);

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Процессор" })
    .click();
  await page.locator("#cpu-new-project-name").fill("OEM Core");
  await page.locator(".cpu-create-form").getByRole("button", { name: "Создать CPU-проект" }).click();
  await expect(page.locator("#cpu-edit-project-name")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Рынок" })
    .click();
  await page.locator("#market-release-name").fill("OEM One");
  await page.getByRole("button", { name: "Выпустить продукт" }).click();
  await expect(page.getByText("OEM One")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Обзор" })
    .click();
  await page.getByRole("button", { name: "Следующий день" }).click();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Рынок" })
    .click();

  const contracts = page.locator(".oem-contracts");
  await expect(contracts.getByRole("heading", { name: "OEM-контракты" })).toBeVisible();
  await expect(contracts.getByRole("button", { name: "Принять" })).toBeVisible();
  await contracts.getByRole("button", { name: "Принять" }).click();

  await expect(contracts.getByText("Активные контракты")).toBeVisible();
  await expect(contracts.getByText("OEM One")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("chooses a permanent company doctrine from the legacy panel", async ({ page }) => {
  await openGame(page);

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Компания" })
    .click();

  await expect(page.getByRole("heading", { name: "Профиль компании", level: 1 })).toBeVisible();
  const legacy = page.locator(".company-legacy");
  await expect(legacy.getByRole("heading", { name: "Наследие компании" })).toBeVisible();

  const innovator = legacy.locator(".company-doctrine").filter({ hasText: "Инноватор" });
  await innovator.getByRole("button", { name: "Выбрать доктрину" }).click();
  await page.getByRole("button", { name: "Закрепить", exact: true }).click();

  await expect(innovator.getByRole("button", { name: "Активна" })).toBeDisabled();
  await expect(legacy.locator(".company-legacy__active-pill")).toContainText("Активна");

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
});

test("compares two saved device versions", async ({ page }) => {
  await openGame(page);
  await page.getByRole("button", { name: "Следующий день" }).click();

  await page.evaluate(async () => {
    const request = indexedDB.open("silicon-dynasty");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const readRequest = database
      .transaction("game-saves", "readonly")
      .objectStore("game-saves")
      .get("current");
    const state = await new Promise<{ deviceProjects?: unknown[] }>((resolve, reject) => {
      readRequest.onsuccess = () => resolve(readRequest.result as { deviceProjects?: unknown[] });
      readRequest.onerror = () => reject(readRequest.error);
    });
    const base = {
      type: "desktop",
      cpuProjectId: "cpu-missing",
      cpuVersion: 1,
      motherboardProjectId: "component-missing",
      ramProjectId: "component-missing",
      storageProjectId: "component-missing",
      gpuProjectId: null,
      networkingProjectId: null,
      aiAcceleratorProjectId: null,
      osProjectId: "os-missing",
      osReleaseId: "os-release-missing",
      aiProjectId: null,
      aiDeploymentId: null,
    };
    const next = { ...base, type: "laptop", cpuVersion: 2 };
    state.deviceProjects = [{
      id: "device-compare-e2e",
      name: "Compare E2E Device",
      configuration: next,
      versions: [
        { version: 1, savedOn: "1995-01-01", configuration: base },
        { version: 2, savedOn: "1995-01-02", configuration: next },
      ],
    }];
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("game-saves", "readwrite");
      transaction.objectStore("game-saves").put(state, "current");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  const continueButton = page.getByRole("button", { name: "Продолжить" });
  await continueButton.waitFor({ state: "visible", timeout: 10_000 });
  await continueButton.click();

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Процессор" })
    .click();
  await page.locator(".product-workspace-tabs").getByRole("button", { name: "Устройства" }).click();
  await expect(page.getByRole("heading", { name: "Устройства и экосистема", level: 1 })).toBeVisible();

  const compare = page.locator(".version-compare");
  await expect(compare).toBeVisible();
  await expect(compare.locator("select")).toHaveCount(2);
  await expect(compare.locator(".version-compare__metric")).toHaveCount(6);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(compare).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("compares two saved cloud versions", async ({ page }) => {
  await openGame(page);
  await page.getByRole("button", { name: "Следующий день" }).click();

  await page.evaluate(async () => {
    const request = indexedDB.open("silicon-dynasty");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const readRequest = database
      .transaction("game-saves", "readonly")
      .objectStore("game-saves")
      .get("current");
    const state = await new Promise<{ cloudProjects?: unknown[] }>((resolve, reject) => {
      readRequest.onsuccess = () => resolve(readRequest.result as { cloudProjects?: unknown[] });
      readRequest.onerror = () => reject(readRequest.error);
    });
    const first = {
      serverDeviceProjectId: "device-missing",
      serverDeviceVersion: 1,
      dataCenters: 1,
      serversPerCenter: 100,
      storageTb: 1_000,
      networkGbps: 10_000,
      aiAcceleratorUnits: 0,
      redundancy: 2,
    };
    const second = { ...first, dataCenters: 2, redundancy: 3 };
    state.cloudProjects = [{
      id: "cloud-compare-e2e",
      name: "Compare E2E Cloud",
      configuration: second,
      versions: [
        { version: 1, savedOn: "1995-01-01", configuration: first },
        { version: 2, savedOn: "1995-01-02", configuration: second },
      ],
    }];
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("game-saves", "readwrite");
      transaction.objectStore("game-saves").put(state, "current");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  const continueButton = page.getByRole("button", { name: "Продолжить" });
  await continueButton.waitFor({ state: "visible", timeout: 10_000 });
  await continueButton.click();

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Процессор" })
    .click();
  await page.locator(".product-workspace-tabs").getByRole("button", { name: "Устройства" }).click();
  await page.getByRole("tab", { name: "Облако" }).click();

  const cloudCompare = page.locator(".cloud-compare");
  await expect(cloudCompare).toBeVisible();
  await expect(cloudCompare.locator("select")).toHaveCount(2);
  await expect(cloudCompare.locator(".version-compare__metric")).toHaveCount(6);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(cloudCompare).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("orders component production and sees the factory queue", async ({ page }) => {
  await openGame(page);

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Процессор" })
    .click();
  await page.locator(".product-workspace-tabs").getByRole("button", { name: "Компоненты" }).click();
  await page.locator("#component-new-project-name").fill("E2E Manufacturing GPU");
  await page.getByRole("button", { name: "Создать проект компонента" }).click();
  await expect(page.locator("#component-project-name")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Рынок" })
    .click();
  await page.locator("#component-release-name").fill("E2E Manufacturing GPU 100");
  await page.getByRole("button", { name: "Выпустить компонент" }).click();
  await expect(page.getByText("E2E Manufacturing GPU 100")).toBeVisible();

  const manufacturing = page.locator(".manufacturing-panel");
  await expect(manufacturing.getByRole("heading", { name: "Производство" })).toBeVisible();

  await page.getByRole("button", { name: "Заказать производство" }).click();
  await expect(page.locator(".component-production-orders")).toContainText("Партия 100");
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
});
