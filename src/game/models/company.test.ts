import { describe, expect, it } from "vitest";
import { validateCompany } from "./company";
import { createInitialGameState } from "./game-state";

describe("validateCompany", () => {
  it("accepts the initial company", () => {
    const result = validateCompany(createInitialGameState().company);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("rejects invalid financial, reputation, and staffing values", () => {
    const result = validateCompany({
      ...createInitialGameState().company,
      balance: Number.NaN,
      reputation: 101,
      employeeCount: 1.5,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.balance).toBeDefined();
    expect(result.errors.reputation).toBeDefined();
    expect(result.errors.employeeCount).toBeDefined();
  });

  it("rejects a blank or overlong name", () => {
    const company = createInitialGameState().company;

    expect(validateCompany({ ...company, name: " " }).errors.name).toBeDefined();
    expect(validateCompany({ ...company, name: "S".repeat(41) }).errors.name).toBeDefined();
  });
});
