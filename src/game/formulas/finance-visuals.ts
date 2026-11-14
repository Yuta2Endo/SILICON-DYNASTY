import type { FinanceDailyRecord } from "../models/finance";

export type CashFlowStepId =
  | "opening"
  | "revenue"
  | "manufacturing"
  | "payroll"
  | "overhead"
  | "marketing"
  | "research"
  | "release"
  | "interest"
  | "tax"
  | "financing"
  | "closing";

export type CashFlowStepKind = "total" | "positive" | "negative" | "neutral";

export interface CashFlowStep {
  id: CashFlowStepId;
  amountUsd: number;
  startUsd: number;
  endUsd: number;
  kind: CashFlowStepKind;
}

export interface CashFlowWaterfall {
  openingBalanceUsd: number;
  closingBalanceUsd: number;
  netCashFlowUsd: number;
  minUsd: number;
  maxUsd: number;
  steps: CashFlowStep[];
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function flowKind(amount: number): CashFlowStepKind {
  if (amount > 0) {
    return "positive";
  }
  if (amount < 0) {
    return "negative";
  }
  return "neutral";
}

/**
 * Converts one persisted daily record into a cash-flow bridge. The opening
 * balance is derived from closing balance minus net cash flow, so no second
 * ledger is introduced.
 */
export function buildCashFlowWaterfall(record: FinanceDailyRecord): CashFlowWaterfall {
  const openingBalanceUsd = round(record.closingBalanceUsd - record.netCashFlowUsd);
  const flows: Array<{ id: CashFlowStepId; amountUsd: number }> = [
    { id: "revenue", amountUsd: record.revenueUsd },
    { id: "manufacturing", amountUsd: -record.manufacturingUsd },
    { id: "payroll", amountUsd: -record.payrollUsd },
    { id: "overhead", amountUsd: -record.overheadUsd },
    { id: "marketing", amountUsd: -record.marketingUsd },
    { id: "research", amountUsd: -record.researchUsd },
    { id: "release", amountUsd: -record.releaseUsd },
    { id: "interest", amountUsd: -record.interestUsd },
    { id: "tax", amountUsd: -record.taxUsd },
    { id: "financing", amountUsd: record.financingUsd },
  ];

  const steps: CashFlowStep[] = [
    {
      id: "opening",
      amountUsd: openingBalanceUsd,
      startUsd: 0,
      endUsd: openingBalanceUsd,
      kind: "total",
    },
  ];

  let running = openingBalanceUsd;
  for (const flow of flows) {
    const amountUsd = round(flow.amountUsd);
    if (amountUsd === 0) {
      continue;
    }
    const startUsd = running;
    running = round(running + amountUsd);
    steps.push({
      id: flow.id,
      amountUsd,
      startUsd,
      endUsd: running,
      kind: flowKind(amountUsd),
    });
  }

  steps.push({
    id: "closing",
    amountUsd: record.closingBalanceUsd,
    startUsd: 0,
    endUsd: record.closingBalanceUsd,
    kind: "total",
  });

  const values = steps.flatMap((step) => [step.startUsd, step.endUsd, 0]);
  return {
    openingBalanceUsd,
    closingBalanceUsd: record.closingBalanceUsd,
    netCashFlowUsd: record.netCashFlowUsd,
    minUsd: Math.min(...values),
    maxUsd: Math.max(...values),
    steps,
  };
}
