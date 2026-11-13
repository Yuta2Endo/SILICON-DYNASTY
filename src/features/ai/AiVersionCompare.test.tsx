import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AiVersionCompare } from "./AiVersionCompare";
import {
  createAiProject,
  createDefaultAiConfiguration,
  saveAiVersion,
  type AiDataset,
} from "../../game/models/ai";
import { translations } from "../../localization/messages";

function dataset(qualityScore: number): AiDataset {
  return {
    id: "dataset-1",
    name: "Vision Corpus",
    modality: "images",
    sizeGb: 40,
    qualityScore,
    diversityScore: 60,
    license: "permissive",
    processingCostUsd: 500,
  };
}

afterEach(cleanup);

describe("AI version comparison", () => {
  it("shows an empty hint until two versions are saved", () => {
    const project = createAiProject(
      "ai-1",
      "Vision Model",
      createDefaultAiConfiguration(),
      "1995-01-01",
    );
    const copy = translations.ru.ai;

    render(<AiVersionCompare locale="ru" project={project} />);

    expect(screen.getByText(copy.versionCompare.title)).toBeTruthy();
    expect(screen.getByText(copy.versionCompare.emptyHint)).toBeTruthy();
  });

  it("compares metrics and dataset changes between saved versions", () => {
    const configuration = createDefaultAiConfiguration();
    let project = createAiProject("ai-1", "Vision Model", configuration, "1995-01-01");
    project = saveAiVersion(project, "Vision Model", configuration, [dataset(70)], "1995-01-02");
    project = saveAiVersion(project, "Vision Model", { ...configuration, layers: 6 }, [dataset(90)], "1995-01-03");
    const copy = translations.ru.ai;

    const { container } = render(<AiVersionCompare locale="ru" project={project} />);

    expect(screen.getByText(copy.versionCompare.metrics.qualityScore)).toBeTruthy();
    expect(container.querySelectorAll(".version-compare__metric")).toHaveLength(6);
    expect(screen.getByText(copy.versionCompare.datasetKinds.changed)).toBeTruthy();
    expect(screen.getByText("Vision Corpus")).toBeTruthy();
    expect(screen.getByText(copy.versionCompare.datasetFields.qualityScore)).toBeTruthy();
  });
});
