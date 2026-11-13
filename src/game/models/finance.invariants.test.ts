import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./game-state";
import {
  applyFinanceTransaction,
  createInitialFinanceState,
  EXPENSE_CATEGORIES,
  type FinanceState,
  type FinanceTransactionCategory,
} from "./finance";
import { exportGameState, parseImportedGameState } from "../application/save-transfer";

const CATEGORIES: readonly FinanceTransactionCategory[] = [
  "sales",
  "manufacturing",
  "payroll",
  "overhead",
  "research",
  "release",
  "interest",
  "tax",
];

describe("finance invariants", () => {
  it("keeps lifetime totals, daily cash flow and net profit consistent", () => {
    let finance: FinanceState = createInitialFinanceState();
    let balance = 100_000;

    for (let index = 0; index < 48; index += 1) {
      const category = CATEGORIES[index % CATEGORIES.length]!;
      const amount = category === "sales" ? 1_000 + index * 25 : -(40 + index * 7);
      balance += amount;
      finance = applyFinanceTransaction(
        finance,
        {
          date: `1995-01-${String((index % 28) + 1).padStart(2, "0")}`,
          category,
          amountUsd: amount,
          note: `invariant-${index}`,
        },
        balance,
      );
    }

    const revenue = finance.transactions
      .filter((transaction) => transaction.category === "sales")
      .reduce((total, transaction) => total + transaction.amountUsd, 0);
    const expenses = finance.transactions
      .filter((transaction) =>
        EXPENSE_CATEGORIES.includes(transaction.category as (typeof EXPENSE_CATEGORIES)[number]),
      )
      .reduce((total, transaction) => total - transaction.amountUsd, 0);
    const netCashFlow = finance.transactions.reduce(
      (total, transaction) => total + transaction.amountUsd,
      0,
    );

    expect(finance.lifetimeRevenueUsd).toBeCloseTo(revenue, 2);
    expect(finance.lifetimeExpensesUsd).toBeCloseTo(expenses, 2);
    expect(finance.dailyRecords.reduce((total, record) => total + record.netCashFlowUsd, 0))
      .toBeCloseTo(netCashFlow, 2);
    expect(finance.dailyRecords.reduce((total, record) => total + record.netProfitUsd, 0))
      .toBeCloseTo(revenue - expenses, 2);

    const state = { ...createInitialGameState(), finance };
    const restored = parseImportedGameState(exportGameState(state));
    expect(restored.finance).toEqual(finance);
  });
});
