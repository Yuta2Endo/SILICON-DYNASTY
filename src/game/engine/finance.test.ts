import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../models/game-state";
import { getFinanceDailyRecord } from "../models/finance";
import {
  FinanceOperationError,
  getLoanDailyInterest,
  postFinanceTransaction,
  repayLoan,
  settleDailyFinance,
  takeLoan,
} from "./finance";

describe("finance engine", () => {
  it("takes and repays a loan while keeping cash and principal in sync", () => {
    const initial = createInitialGameState();
    const borrowed = takeLoan(initial, 10_000);

    expect(borrowed.company.balance).toBe(110_000);
    expect(borrowed.finance.loan).toEqual({ principalUsd: 10_000, annualInterestRate: 0.12 });
    expect(borrowed.finance.lifetimeFinancingUsd).toBe(10_000);
    expect(getLoanDailyInterest(borrowed)).toBe(3.29);

    const partiallyRepaid = repayLoan(borrowed, 4_000);
    expect(partiallyRepaid.company.balance).toBe(106_000);
    expect(partiallyRepaid.finance.loan?.principalUsd).toBe(6_000);

    const fullyRepaid = repayLoan(partiallyRepaid, 10_000);
    expect(fullyRepaid.company.balance).toBe(100_000);
    expect(fullyRepaid.finance.loan).toBeNull();
  });

  it("rejects a repayment that is larger than the available cash", () => {
    const borrowed = takeLoan(createInitialGameState(), 10_000);
    const poor = { ...borrowed, company: { ...borrowed.company, balance: 100 } };

    expect(() => repayLoan(poor, 500)).toThrow(FinanceOperationError);
  });

  it("settles payroll and overhead and records a closing balance", () => {
    const settled = settleDailyFinance(createInitialGameState(), "1995-01-01");

    expect(settled.company.balance).toBe(99_800);
    expect(getFinanceDailyRecord(settled.finance, "1995-01-01")).toMatchObject({
      payrollUsd: 120,
      overheadUsd: 80,
      netProfitUsd: -200,
      closingBalanceUsd: 99_800,
    });
  });

  it("taxes positive daily profit after operating expenses", () => {
    const withRevenue = postFinanceTransaction(
      createInitialGameState(),
      "sales",
      10_000,
      "Test sales",
    );
    const settled = settleDailyFinance(withRevenue, "1995-01-01");
    const record = getFinanceDailyRecord(settled.finance, "1995-01-01");

    expect(record?.revenueUsd).toBe(10_000);
    expect(record?.taxUsd).toBe(1_764);
    expect(record?.netProfitUsd).toBe(8_036);
    expect(settled.company.balance).toBe(108_036);
    expect(settled.finance.lifetimeTaxesUsd).toBe(1_764);
  });

  it("uses emergency financing when cash cannot cover fixed daily costs", () => {
    const initial = createInitialGameState();
    const lowCash = { ...initial, company: { ...initial.company, balance: 100 } };
    const settled = settleDailyFinance(lowCash, "1995-01-01");

    expect(settled.company.balance).toBe(900);
    expect(settled.finance.loan).toMatchObject({
      principalUsd: 1_000,
      annualInterestRate: 0.18,
    });
    expect(getFinanceDailyRecord(settled.finance, "1995-01-01")).toMatchObject({
      payrollUsd: 120,
      overheadUsd: 80,
      financingUsd: 1_000,
      netCashFlowUsd: 800,
      closingBalanceUsd: 900,
    });
  });
});
