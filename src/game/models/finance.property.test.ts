import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  applyFinanceTransaction,
  createInitialFinanceState,
  EXPENSE_CATEGORIES,
  type FinanceState,
} from "./finance";

const categories = ["sales", ...EXPENSE_CATEGORIES] as const;

describe("finance property invariants", () => {
  it("keeps lifetime totals and daily cash flow aligned with the ledger", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            category: fc.constantFrom(...categories),
            day: fc.integer({ min: 1, max: 28 }),
            amountUsd: fc.integer({ min: 1, max: 10_000 }),
          }),
          { maxLength: 80 },
        ),
        (entries) => {
          let finance: FinanceState = createInitialFinanceState();
          let balance = 10_000_000;

          for (const entry of entries) {
            const amount = entry.category === "sales" ? entry.amountUsd : -entry.amountUsd;
            balance += amount;
            finance = applyFinanceTransaction(
              finance,
              {
                date: `1995-01-${String(entry.day).padStart(2, "0")}`,
                category: entry.category,
                amountUsd: amount,
              },
              balance,
            );
          }

          const revenue = finance.transactions
            .filter((transaction) => transaction.category === "sales")
            .reduce((total, transaction) => total + transaction.amountUsd, 0);
          const expenses = finance.transactions
            .filter((transaction) =>
              EXPENSE_CATEGORIES.includes(
                transaction.category as (typeof EXPENSE_CATEGORIES)[number],
              ),
            )
            .reduce((total, transaction) => total - transaction.amountUsd, 0);
          const netCashFlow = finance.transactions.reduce(
            (total, transaction) => total + transaction.amountUsd,
            0,
          );

          expect(finance.lifetimeRevenueUsd).toBeCloseTo(revenue, 2);
          expect(finance.lifetimeExpensesUsd).toBeCloseTo(expenses, 2);
          expect(
            finance.dailyRecords.reduce((total, record) => total + record.netCashFlowUsd, 0),
          ).toBeCloseTo(netCashFlow, 2);
        },
      ),
      { numRuns: 50 },
    );
  });
});
