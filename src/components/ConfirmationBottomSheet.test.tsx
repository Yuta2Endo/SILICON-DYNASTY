import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ConfirmationBottomSheet } from "./ConfirmationBottomSheet";

function Harness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">Open</button>
      {open && (
        <ConfirmationBottomSheet
          cancelLabel="Cancel"
          confirmLabel="Confirm"
          message="Confirm this action."
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          title="Confirm"
        />
      )}
    </>
  );
}

afterEach(cleanup);

describe("ConfirmationBottomSheet", () => {
  it("traps focus, closes on Escape and restores the trigger", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(document.activeElement).toBe(cancel);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);

    await user.tab();
    expect(document.activeElement).toBe(cancel);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
