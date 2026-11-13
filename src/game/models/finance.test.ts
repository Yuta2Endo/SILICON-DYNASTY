import { describe, expect, it } from "vitest";
import {
  applyFinanceTransaction,
  createInitialFinanceState,
  getDailyOperatingExpenses,
  getFinanceDailyRecord,
  InvalidFinanceDataError,
  parseFinanceState,
  recordDailyUnits,
} from "./finance";

describe("finance model", () => {
  it("keeps signed transactions, daily totals, and lifetime totals consistent", () => {
    let finance = createInitialFinanceState();

    finance = applyFinanceTransaction(
      finance,
      { date: "1995-01-01", category: "sales", amountUsd: 1_000 },
      11_080,
    );
    finance = applyFinanceTransaction(
      finance,
      { date: "1995-01-01", category: "manufacturing", amountUsd: -200 },
      10_880,
    );
    finance = applyFinanceTransaction(
      finance,
      { date: "1995-01-01", category: "payroll", amountUsd: -120 },
      10_760,
    );
    finance = applyFinanceTransaction(
      finance,
      { date: "1995-01-01", category: "loan-proceeds", amountUsd: 500 },
      11_260,
    );
    finance = applyFinanceTransaction(
      finance,
      { date: "1995-01-01", category: "loan-repayment", amountUsd: -100 },
      11_160,
    );

    const record = getFinanceDailyRecord(finance, "1995-01-01");

    expect(record).toMatchObject({
      revenueUsd: 1_000,
      manufacturingUsd: 200,
      payrollUsd: 120,
      financingUsd: 400,
      netProfitUsd: 680,
      netCashFlowUsd: 1_080,
      closingBalanceUsd: 11_160,
    });
    expect(getDailyOperatingExpenses(record)).toBe(320);
    expect(finance.lifetimeRevenueUsd).toBe(1_000);
    expect(finance.lifetimeExpensesUsd).toBe(320);
    expect(finance.lifetimeFinancingUsd).toBe(400);
    expect(finance.transactions.map((transaction) => transaction.category)).toEqual([
      "loan-repayment",
      "loan-proceeds",
      "payroll",
      "manufacturing",
      "sales",
    ]);
    expect(parseFinanceState(finance)).toEqual(finance);
  });

  it("rejects transactions whose sign contradicts the category", () => {
    const finance = createInitialFinanceState();

    expect(() =>
      applyFinanceTransaction(
        finance,
        { date: "1995-01-01", category: "sales", amountUsd: -100 },
        99_900,
      ),
    ).toThrow(InvalidFinanceDataError);
    expect(() =>
      applyFinanceTransaction(
        finance,
        { date: "1995-01-01", category: "payroll", amountUsd: 100 },
        100_100,
      ),
    ).toThrow(InvalidFinanceDataError);
  });

  it("records production and sales units without duplicating a daily record", () => {
    let finance = applyFinanceTransaction(
      createInitialFinanceState(),
      { date: "1995-01-01", category: "overhead", amountUsd: -80 },
      99_920,
    );
    finance = recordDailyUnits(finance, "1995-01-01", { produced: 100, sold: 12 }, 99_920);
    finance = recordDailyUnits(finance, "1995-01-01", { produced: 5, sold: 3 }, 99_920);

    expect(finance.dailyRecords).toHaveLength(1);
    expect(finance.dailyRecords[0]).toMatchObject({
      unitsProduced: 105,
      unitsSold: 15,
      overheadUsd: 80,
    });
  });

  it("rejects a daily record whose stored totals were tampered with", () => {
    const finance = applyFinanceTransaction(
      createInitialFinanceState(),
      { date: "1995-01-01", category: "sales", amountUsd: 500 },
      100_500,
    );
    const tampered = {
      ...finance,
      dailyRecords: finance.dailyRecords.map((record) => ({
        ...record,
        netProfitUsd: record.netProfitUsd + 1,
      })),
    };

    expect(() => parseFinanceState(tampered)).toThrow(InvalidFinanceDataError);
  });
});
