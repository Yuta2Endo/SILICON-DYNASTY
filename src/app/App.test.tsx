import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { GameState } from "../game/models/game-state";
import { createGameApplication } from "../game/application/game-application";
import type { GameStateRepository } from "../storage/repositories/GameStateRepository";
import { App } from "./App";

class MemoryGameStateRepository implements GameStateRepository {
  state: GameState | null = null;

  async load(): Promise<GameState | null> {
    return this.state;
  }

  async save(state: GameState): Promise<void> {
    this.state = state;
  }
}

afterEach(cleanup);

describe("App", () => {
  it("navigates, saves a company name, and changes language without losing game data", async () => {
    const user = userEvent.setup();
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    render(<App application={application} />);

    expect(await screen.findByRole("heading", { name: "Панель компании" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Компания" }));
    expect(await screen.findByRole("heading", { name: "Профиль компании" })).toBeTruthy();

    const companyNameInput = await screen.findByRole("textbox", { name: "Название компании" });
    await user.clear(companyNameInput);
    await user.type(companyNameInput, "Dynasty Labs");
    await user.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    await waitFor(async () => {
      expect((await application.load()).company.name).toBe("Dynasty Labs");
    });

    await user.click(screen.getByRole("button", { name: "Настройки" }));
    await user.click(await screen.findByRole("button", { name: "English" }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeTruthy();

    const state = await application.load();
    expect(state.company.name).toBe("Dynasty Labs");
    expect(state.settings.locale).toBe("en");

    await user.click(screen.getByRole("button", { name: "Overview" }));
    expect(await screen.findByRole("heading", { name: "Company dashboard" })).toBeTruthy();
  });

  it("opens the main menu on start and continues to the dashboard", async () => {
    const user = userEvent.setup();
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    render(<App application={application} initialMenuOpen />);

    expect(await screen.findByRole("dialog", { name: "SILICON DYNASTY" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Продолжить" }));
    expect(await screen.findByRole("heading", { name: "Панель компании" })).toBeTruthy();
  });

  it("advances the game date through the dashboard action", async () => {
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    render(<App application={application} />);

    await screen.findByRole("heading", { name: "Панель компании" });
    fireEvent.click(screen.getByRole("button", { name: "Следующий день" }));

    await waitFor(async () => {
      expect((await application.load()).gameDate).toBe("1995-01-02");
    });
  });

  it("opens the Market screen and switches to Finance", async () => {
    const user = userEvent.setup();
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    render(<App application={application} />);
    await screen.findByRole("heading", { name: "Панель компании" });

    await user.click(screen.getByRole("button", { name: "Рынок" }));
    expect(await screen.findByRole("heading", { name: "Рынок и продажи" })).toBeTruthy();

    const financeTab = await screen.findByRole("tab", { name: "Финансы" });
    await user.click(financeTab);
    expect(await screen.findByRole("heading", { name: "Финансы" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Финансы" }).getAttribute("aria-selected")).toBe("true");
  });

  it("opens the OS Lab from the product workspace and creates an OS project", async () => {
    const user = userEvent.setup();
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    render(<App application={application} />);
    await screen.findByRole("heading", { name: "Панель компании" });
    await user.click(screen.getByRole("button", { name: "Процессор" }));
    await screen.findByRole("heading", { name: "Конструктор процессоров" });

    await user.click(await screen.findByRole("button", { name: "ОС" }));
    expect(await screen.findByRole("heading", { name: "Лаборатория ОС" })).toBeTruthy();

    await user.type(await screen.findByRole("textbox", { name: "Название проекта" }), "Dynasty OS");
    await user.click(await screen.findByRole("button", { name: "Создать проект" }));
    expect(await screen.findByRole("heading", { name: "Dynasty OS" })).toBeTruthy();

    await waitFor(async () => {
      const reloaded = await createGameApplication(repository).load();
      expect(reloaded.osProjects[0]?.name).toBe("Dynasty OS");
      expect(reloaded.osProjects[0]?.versions).toHaveLength(1);
    });
  });

  it("opens the AI Lab from the product workspace and creates an AI project", async () => {
    const user = userEvent.setup();
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    render(<App application={application} />);
    await screen.findByRole("heading", { name: "Панель компании" });
    await user.click(screen.getByRole("button", { name: "Процессор" }));
    await screen.findByRole("heading", { name: "Конструктор процессоров" });

    await user.click(await screen.findByRole("button", { name: "ИИ" }));
    expect(await screen.findByRole("heading", { name: "Лаборатория ИИ" })).toBeTruthy();

    await user.type(await screen.findByRole("textbox", { name: "Название проекта" }), "Dynasty Vision");
    await user.click(await screen.findByRole("button", { name: "Создать проект" }));
    expect((await screen.findAllByDisplayValue("Dynasty Vision")).length).toBeGreaterThan(0);

    await waitFor(async () => {
      const reloaded = await createGameApplication(repository).load();
      expect(reloaded.aiProjects[0]?.name).toBe("Dynasty Vision");
      expect(reloaded.aiProjects[0]?.versions).toHaveLength(1);
    });
  });

  it("creates and versions a CPU project, rejects invalid input, and protects unsaved edits", async () => {
    const user = userEvent.setup();
    const repository = new MemoryGameStateRepository();
    const application = createGameApplication(repository);

    render(<App application={application} />);
    await screen.findByRole("heading", { name: "Панель компании" });
    await user.click(screen.getByRole("button", { name: "Процессор" }));
    expect(await screen.findByRole("heading", { name: "Конструктор процессоров" })).toBeTruthy();

    await user.type(screen.getByRole("textbox", { name: "Название проекта" }), "Dynasty Core");
    await user.click(screen.getByRole("button", { name: "Создать CPU-проект" }));

    const clockInput = await screen.findByRole("spinbutton", { name: "Базовая частота (МГц)" });
    const threadInput = screen.getByRole("spinbutton", { name: "Потоки" });
    await user.clear(clockInput);
    await user.type(clockInput, "125");

    await user.click(screen.getByRole("button", { name: "Обзор" }));
    expect(await screen.findByRole("dialog", { name: "Несохранённые изменения" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Продолжить редактирование" }));

    await user.clear(threadInput);
    await user.type(threadInput, "0");
    await user.click(screen.getByRole("button", { name: "Сохранить новую версию" }));
    expect(screen.getByText("Допустимый диапазон: от 1 до 512.")).toBeTruthy();
    expect((await application.load()).cpuProjects[0]?.versions).toHaveLength(1);

    await user.clear(threadInput);
    await user.type(threadInput, "1");
    await user.click(screen.getByRole("button", { name: "Сохранить новую версию" }));

    await waitFor(async () => {
      const reloaded = await createGameApplication(repository).load();
      expect(reloaded.cpuProjects[0]?.configuration.clockMHz).toBe(125);
      expect(reloaded.cpuProjects[0]?.versions.map((version) => version.version)).toEqual([1, 2]);
    });
  });
});
