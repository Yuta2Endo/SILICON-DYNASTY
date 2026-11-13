import { describe, expect, it } from "vitest";
import { formatCurrency, formatGameDate, formatNumber, formatYear } from "./formatters";

describe("localized formatters", () => {
  it("formats years without number grouping", () => {
    expect(formatYear(1995, "ru")).toBe("1995");
    expect(formatYear(1995, "en")).toBe("1995");
  });

  it("formats dates and amounts using the selected locale", () => {
    expect(formatGameDate("1995-01-01", "en")).toContain("January");
    expect(formatNumber(10_000, "ru")).not.toBe("10000");
    expect(formatCurrency(100_000, "en")).toContain("$100,000");
  });
});
