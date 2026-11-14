import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInitialGameState } from "../../game/models/game-state";
import { translations } from "../../localization/messages";
import { CompanyPage } from "./CompanyPage";

afterEach(cleanup);

describe("CompanyPage legacy", () => {
  it("confirms a permanent doctrine choice", async () => {
    const user = userEvent.setup();
    const onChooseDoctrine = vi.fn(async () => true);
    const state = createInitialGameState();
    const copy = translations.ru.company.legacy;

    render(
      <CompanyPage
        isSaving={false}
        onChooseDoctrine={onChooseDoctrine}
        onRename={() => undefined}
        state={state}
      />,
    );

    const card = screen.getByText(copy.doctrines.innovator.name).closest("article");
    expect(card).toBeTruthy();
    await user.click(within(card as HTMLElement).getByRole("button", { name: copy.choose }));

    expect(screen.getByText(copy.confirmTitle)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: copy.confirm }));

    expect(onChooseDoctrine).toHaveBeenCalledWith("innovator");
  });
});
