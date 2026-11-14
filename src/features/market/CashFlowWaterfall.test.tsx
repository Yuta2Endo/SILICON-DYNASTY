import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { FinanceDailyRecord } from "../../game/models/finance";
import { translations } from "../../localization/messages";
import { CashFlowWaterfall } from "./CashFlowWaterfall";

afterEach(cleanup);

const copy = translations.ru.market.finance;
const record: FinanceDailyRecord = {
  date: "1995-01-01",
  revenueUsd: 1_000,
  manufacturingUsd: 200,
  payrollUsd: 120,
  overheadUsd: 80,
  marketingUsd: 50,
  researchUsd: 0,
  releaseUsd: 0,
  interestUsd: 10,
  taxUsd: 100,
  financingUsd: -50,
  netProfitUsd: 440,
  netCashFlowUsd: 390,
  closingBalanceUsd: 1_390,
  unitsSold: 10,
  unitsProduced: 12,
};

describe("CashFlowWaterfall", () => {
  it("shows opening, flow categories, net and closing balances", () => {
    render(<CashFlowWaterfall copy={copy} locale="ru" record={record} />);

    expect(screen.getAllByText(copy.waterfallOpening).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.waterfallNet)).toBeTruthy();
    expect(screen.getAllByText(copy.waterfallClosing).length).toBeGreaterThan(0);
    expect(screen.getByText(copy.breakdown.manufacturing)).toBeTruthy();
    expect(screen.getByText(copy.breakdown.financing)).toBeTruthy();
    expect(screen.getByText(/\+390/)).toBeTruthy();
  });

  it("renders a zero-flow day as opening and closing only", () => {
    render(
      <CashFlowWaterfall
        copy={copy}
        locale="ru"
        record={{
          ...record,
          revenueUsd: 0,
          manufacturingUsd: 0,
          payrollUsd: 0,
          overheadUsd: 0,
          marketingUsd: 0,
          interestUsd: 0,
          taxUsd: 0,
          financingUsd: 0,
          netProfitUsd: 0,
          netCashFlowUsd: 0,
          closingBalanceUsd: 1_000,
        }}
      />,
    );

    expect(screen.queryByText(copy.breakdown.manufacturing)).toBeNull();
    expect(screen.getAllByText(copy.waterfallOpening).length).toBeGreaterThan(0);
    expect(screen.getAllByText(copy.waterfallClosing).length).toBeGreaterThan(0);
  });
});
