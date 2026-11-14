import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../../game/models/game-state";
import { translations } from "../../localization/messages";
import { ResearchTechTree } from "./ResearchTechTree";

const copy = translations.ru.research;

function renderTree(state = createInitialGameState()) {
  const onStartResearch = vi.fn().mockResolvedValue(true);
  render(
    <ResearchTechTree
      copy={copy}
      isSaving={false}
      locale="ru"
      onStartResearch={onStartResearch}
      selectedCategory="all"
      state={state}
    />,
  );
  return { onStartResearch };
}

afterEach(cleanup);

describe("ResearchTechTree", () => {
  it("renders the six eras, every technology and the selected details", () => {
    renderTree();

    const tree = screen.getByRole("region", { name: copy.treeLabel });
    expect(within(tree).getAllByRole("button")).toHaveLength(27);
    expect(tree.querySelectorAll(".research-tree__column-heading")).toHaveLength(6);
    expect(tree.querySelectorAll(".research-tree__edge")).toHaveLength(25);

    expect(screen.getByRole("heading", { name: copy.technologies["out-of-order"].name }))
      .toBeTruthy();
    expect(screen.getByText(copy.treeHint)).toBeTruthy();
  });

  it("selects a technology and starts it from the detail panel", async () => {
    const user = userEvent.setup();
    const { onStartResearch } = renderTree();

    await user.click(screen.getByRole("button", {
      name: `${copy.technologies["arm-isa"].name}: ${copy.statuses.available}`,
    }));

    const detail = screen.getByText(copy.treeSelected).closest("aside");
    expect(detail).not.toBeNull();
    expect(within(detail as HTMLElement).getByRole("heading", {
      name: copy.technologies["arm-isa"].name,
    })).toBeTruthy();

    await user.click(within(detail as HTMLElement).getByRole("button", {
      name: copy.startResearch,
    }));
    expect(onStartResearch).toHaveBeenCalledWith("arm-isa");
  });

  it("dims technologies outside the selected category", () => {
    render(
      <ResearchTechTree
        copy={copy}
        isSaving={false}
        locale="ru"
        onStartResearch={vi.fn().mockResolvedValue(true)}
        selectedCategory="graphics"
        state={createInitialGameState()}
      />,
    );

    const graphics = screen.getByRole("button", {
      name: `${copy.technologies["three-dimensional-graphics"].name}: ${copy.statuses.future}`,
    });
    const cpu = screen.getByRole("button", {
      name: `${copy.technologies["out-of-order"].name}: ${copy.statuses.available}`,
    });

    expect(graphics.classList.contains("is-dimmed")).toBe(false);
    expect(cpu.classList.contains("is-dimmed")).toBe(true);
  });

  it("shows completed research and disables starting it", () => {
    const state = createInitialGameState();
    state.research = {
      ...state.research,
      completedTechnologyIds: ["out-of-order"],
      legacyUnlockIds: ["cpu.out-of-order"],
    };

    renderTree(state);

    expect(screen.getByText(copy.statuses.completed)).toBeTruthy();
    expect((screen.getByRole("button", { name: copy.startResearch }) as HTMLButtonElement).disabled)
      .toBe(true);
  });
});
