import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../../game/models/game-state";
import { createAiProject, createDefaultAiConfiguration } from "../../game/models/ai";
import { translations } from "../../localization/messages";
import { AiDesignerPage } from "./AiDesignerPage";

afterEach(cleanup);

const ru = translations.ru;
const baseState = createInitialGameState();
const aiProject = createAiProject(
  "ai-1",
  "Dynasty Vision",
  createDefaultAiConfiguration(),
  baseState.gameDate,
);
const stateWithProject = { ...baseState, aiProjects: [aiProject] };

function renderDesigner(overrides: Partial<Parameters<typeof AiDesignerPage>[0]> = {}) {
  return render(
    <AiDesignerPage
      isSaving={false}
      onCreateProject={async () => null}
      onDirtyChange={() => undefined}
      onOpenComponents={() => undefined}
      onOpenCpu={() => undefined}
      onOpenOs={() => undefined}
      onSaveVersion={async () => true}
      state={stateWithProject}
      {...overrides}
    />,
  );
}

describe("AI designer", () => {
  it("creates an AI project with the default model configuration", async () => {
    const user = userEvent.setup();
    const onCreateProject = vi.fn(async () => null);
    renderDesigner({ state: baseState, onCreateProject });

    await user.type(screen.getByLabelText(ru.ai.createNameLabel), "Dynasty Vision");
    await user.click(screen.getByRole("button", { name: ru.ai.createButton }));

    await waitFor(() => expect(onCreateProject).toHaveBeenCalledTimes(1));
    expect(onCreateProject).toHaveBeenCalledWith("Dynasty Vision", createDefaultAiConfiguration());
  });

  it("saves model parameters and a dataset as a new version", async () => {
    const user = userEvent.setup();
    const onSaveVersion = vi.fn(async () => true);
    renderDesigner({ onSaveVersion });

    await user.selectOptions(screen.getByLabelText(ru.ai.fields.architecture), "cnn");
    const layers = screen.getByLabelText(ru.ai.fields.layers);
    await user.clear(layers);
    await user.type(layers, "4");
    await user.type(screen.getByLabelText(ru.ai.datasets.name), "Vision Corpus");
    await user.click(screen.getByRole("button", { name: ru.ai.datasets.addButton }));
    await user.click(screen.getByRole("button", { name: ru.ai.saveButton }));

    await waitFor(() => expect(onSaveVersion).toHaveBeenCalledTimes(1));
    expect(onSaveVersion).toHaveBeenCalledWith(
      "ai-1",
      "Dynasty Vision",
      expect.objectContaining({ architecture: "cnn", layers: 4 }),
      [expect.objectContaining({ name: "Vision Corpus", modality: "text" })],
    );
  });

  it("shows a parameter error and blocks saving an invalid model", async () => {
    const user = userEvent.setup();
    const onSaveVersion = vi.fn(async () => true);
    renderDesigner({ onSaveVersion });

    const parameters = screen.getByLabelText(ru.ai.fields.parameterCountM);
    await user.clear(parameters);
    await user.type(parameters, "0");

    expect(await screen.findByText(/Значение должно быть от/)).toBeTruthy();
    expect(screen.getByRole("button", { name: ru.ai.saveButton }).hasAttribute("disabled")).toBe(true);
    expect(onSaveVersion).not.toHaveBeenCalled();
  });

  it("rejects an invalid dataset before adding it", async () => {
    const user = userEvent.setup();
    renderDesigner();

    await user.type(screen.getByLabelText(ru.ai.datasets.name), "Broken dataset");
    const quality = screen.getByLabelText(ru.ai.datasets.quality);
    await user.clear(quality);
    await user.type(quality, "101");
    await user.click(screen.getByRole("button", { name: ru.ai.datasets.addButton }));

    expect(await screen.findByText(ru.ai.validation.datasetQuality)).toBeTruthy();
    expect(screen.getByText(ru.ai.datasets.emptyTitle)).toBeTruthy();
  });

  it("switches to the CPU workspace", async () => {
    const user = userEvent.setup();
    const onOpenCpu = vi.fn();
    renderDesigner({ onOpenCpu });

    await user.click(screen.getByRole("button", { name: ru.productWorkspace.cpu }));
    expect(onOpenCpu).toHaveBeenCalledTimes(1);
  });
});
