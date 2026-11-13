import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createComponentProject,
  createDefaultComponentConfiguration,
} from "../../game/models/components";
import { createInitialGameState } from "../../game/models/game-state";
import { translations } from "../../localization/messages";
import { ComponentDesignerPage } from "./ComponentDesignerPage";

afterEach(cleanup);

const ru = translations.ru;
const baseState = createInitialGameState();
const gpuProject = createComponentProject(
  "component-1",
  "Dynasty Graphics",
  "gpu",
  createDefaultComponentConfiguration("gpu"),
  baseState.gameDate,
);
const stateWithGpu = { ...baseState, componentProjects: [gpuProject] };

function renderDesigner(overrides: Partial<Parameters<typeof ComponentDesignerPage>[0]> = {}) {
  return render(
    <ComponentDesignerPage
      isSaving={false}
      onCreateProject={async () => null}
      onDirtyChange={() => undefined}
      onOpenCpu={() => undefined}
      onSaveVersion={async () => true}
      state={stateWithGpu}
      {...overrides}
    />,
  );
}

describe("Component designer", () => {
  it("creates a component project of the selected type", async () => {
    const user = userEvent.setup();
    const onCreateProject = vi.fn(async () => null);
    renderDesigner({ state: baseState, onCreateProject });

    await user.selectOptions(screen.getByLabelText(ru.components.createType), "ssd");
    await user.type(screen.getByRole("textbox", { name: ru.components.createName }), "Dynasty SSD");
    await user.click(screen.getByRole("button", { name: ru.components.createButton }));

    await waitFor(() => expect(onCreateProject).toHaveBeenCalledTimes(1));
    expect(onCreateProject).toHaveBeenCalledWith(
      "ssd",
      "Dynasty SSD",
      expect.objectContaining({ type: "ssd" }),
    );
  });

  it("validates and saves a new configuration version", async () => {
    const user = userEvent.setup();
    const onSaveVersion = vi.fn(async () => true);
    renderDesigner({ onSaveVersion });

    const computeUnits = screen.getByRole("spinbutton", { name: ru.components.fields.computeUnits });
    await user.clear(computeUnits);
    await user.type(computeUnits, "16");
    await user.click(screen.getByRole("button", { name: ru.components.saveVersion }));

    await waitFor(() => expect(onSaveVersion).toHaveBeenCalledTimes(1));
    expect(onSaveVersion).toHaveBeenCalledWith(
      "component-1",
      "Dynasty Graphics",
      expect.objectContaining({ computeUnits: 16 }),
    );
  });

  it("shows a validation error instead of saving an invalid value", async () => {
    const user = userEvent.setup();
    const onSaveVersion = vi.fn(async () => true);
    renderDesigner({ onSaveVersion });

    const computeUnits = screen.getByRole("spinbutton", { name: ru.components.fields.computeUnits });
    await user.clear(computeUnits);
    await user.type(computeUnits, "0");
    await user.click(screen.getByRole("button", { name: ru.components.saveVersion }));

    expect(await screen.findByText(/Введите целое число/)).toBeTruthy();
    expect(onSaveVersion).not.toHaveBeenCalled();
  });

  it("switches back to the CPU workspace", async () => {
    const user = userEvent.setup();
    const onOpenCpu = vi.fn();
    renderDesigner({ onOpenCpu });

    await user.click(screen.getByRole("button", { name: ru.productWorkspace.cpu }));

    expect(onOpenCpu).toHaveBeenCalledTimes(1);
  });
});
