import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../../game/models/game-state";
import { MAX_SAVE_IMPORT_BYTES } from "../../game/application/save-transfer";
import { translations } from "../../localization/messages";
import type { SaveOverview } from "../../storage/repositories/SaveManagement";
import { SettingsPage } from "./SettingsPage";

const copy = translations.ru.settings.saveManagement;

function overviewWithData(): SaveOverview {
  return {
    supported: true,
    autosave: {
      savedAt: "2026-11-13T10:00:00.000Z",
      gameDate: "1995-01-01",
      companyName: "Silicon Dynasty",
      balanceUsd: 100_000,
      schemaVersion: 11,
    },
    backup: {
      savedAt: "2026-11-12T10:00:00.000Z",
      gameDate: "1995-01-01",
      companyName: "Backup Dynasty",
      balanceUsd: 90_000,
      schemaVersion: 11,
    },
    slots: [{
      slotId: "slot-1",
      savedAt: "2026-11-13T09:00:00.000Z",
      gameDate: "1995-01-01",
      companyName: "Slot Dynasty",
      balanceUsd: 80_000,
      schemaVersion: 11,
    }],
  };
}

function renderSettings(overrides: Partial<Parameters<typeof SettingsPage>[0]> = {}) {
  const state = createInitialGameState();
  const props = {
    state,
    onUpdate: vi.fn(),
    saveOverview: overviewWithData(),
    isSaveBusy: false,
    saveManagementError: false,
    onRefreshSaves: vi.fn(),
    onSaveToSlot: vi.fn(async () => true),
    onLoadSlot: vi.fn(async () => true),
    onDeleteSlot: vi.fn(async () => true),
    onExportSave: vi.fn(async () => "{}"),
    onImportSave: vi.fn(async () => true),
    onRestoreBackup: vi.fn(async () => true),
    ...overrides,
  };
  render(<SettingsPage {...props} />);
  return props;
}

afterEach(cleanup);

describe("SettingsPage save management", () => {
  it("renders autosave, backup, slots and the game journey", () => {
    renderSettings();

    expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
    expect(screen.getByText(copy.autosaveTitle)).toBeTruthy();
    expect(screen.getByText(copy.backupTitle)).toBeTruthy();
    expect(screen.getByText("Слот 1")).toBeTruthy();
    expect(screen.getByText("Slot Dynasty")).toBeTruthy();
    expect(screen.getByRole("heading", { name: translations.ru.settings.journey.title })).toBeTruthy();
    expect(screen.getByText(
      translations.ru.settings.journey.progress.replace("{completed}", "0").replace("{total}", "9"),
    )).toBeTruthy();
  });

  it("saves the current state to a slot and shows success feedback", async () => {
    const user = userEvent.setup();
    const props = renderSettings();

    await user.click(screen.getAllByRole("button", { name: copy.saveToSlot })[0]!);
    await waitFor(() => expect(props.onSaveToSlot).toHaveBeenCalledWith("slot-1"));
    expect(await screen.findByText(copy.saveSuccess)).toBeTruthy();
  });

  it("rejects an invalid import file and keeps the current state unchanged", async () => {
    const { container } = render(
      <SettingsPage
        state={createInitialGameState()}
        onUpdate={vi.fn()}
        saveOverview={overviewWithData()}
        isSaveBusy={false}
        saveManagementError={false}
        onRefreshSaves={vi.fn()}
        onSaveToSlot={vi.fn(async () => true)}
        onLoadSlot={vi.fn(async () => true)}
        onDeleteSlot={vi.fn(async () => true)}
        onExportSave={vi.fn(async () => "{}")}
        onImportSave={vi.fn(async () => false)}
        onRestoreBackup={vi.fn(async () => true)}
      />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{invalid"], "save.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => "{invalid" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(copy.importError)).toBeTruthy();
    expect(screen.queryByText(copy.importSuccess)).toBeNull();
  });

  it("rejects an oversized import file without reading it", async () => {
    const onImportSave = vi.fn(async () => true);
    const { container } = render(
      <SettingsPage
        state={createInitialGameState()}
        onUpdate={vi.fn()}
        saveOverview={overviewWithData()}
        isSaveBusy={false}
        saveManagementError={false}
        onRefreshSaves={vi.fn()}
        onSaveToSlot={vi.fn(async () => true)}
        onLoadSlot={vi.fn(async () => true)}
        onDeleteSlot={vi.fn(async () => true)}
        onExportSave={vi.fn(async () => "{}")}
        onImportSave={onImportSave}
        onRestoreBackup={vi.fn(async () => true)}
      />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([""], "oversized.json", { type: "application/json" });
    const text = vi.fn(async () => "{}");
    Object.defineProperty(file, "size", { value: MAX_SAVE_IMPORT_BYTES + 1 });
    Object.defineProperty(file, "text", { value: text });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(
      copy.importTooLarge.replace("{max}", String(MAX_SAVE_IMPORT_BYTES / (1024 * 1024))),
    )).toBeTruthy();
    expect(text).not.toHaveBeenCalled();
    expect(onImportSave).not.toHaveBeenCalled();
  });

  it("asks for confirmation before loading a filled slot", async () => {
    const user = userEvent.setup();
    const props = renderSettings();

    await user.click(screen.getAllByRole("button", { name: copy.loadSlot })[0]!);
    expect(await screen.findByRole("alertdialog", { name: copy.confirmTitle })).toBeTruthy();
    expect(screen.getByText(copy.loadConfirm.replace("{number}", "1"))).toBeTruthy();

    await user.click(screen.getByRole("button", { name: copy.confirm }));
    await waitFor(() => expect(props.onLoadSlot).toHaveBeenCalledWith("slot-1"));
    expect(await screen.findByText(copy.loadSuccess)).toBeTruthy();
  });

  it("shows the unsupported-storage state when slots are unavailable", () => {
    renderSettings({
      saveOverview: {
        supported: false,
        autosave: null,
        backup: null,
        slots: [],
      },
    });

    expect(screen.getByText(copy.unavailable)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.saveToSlot })).toBeNull();
  });
});
