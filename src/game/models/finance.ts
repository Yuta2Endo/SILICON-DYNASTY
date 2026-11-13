import { isValidDateOnly } from "./date";

export const FINANCE_LIMITS = {
  maxTransactionHistory: 120,
  maxDailyRecords: 365,
  maxLoanPrincipalUsd: 1_000_000,
  maxLoanAnnualInterestRate: 1,
} as const;

export const FINANCE_DAILY_RULES = {
  salaryPerEmployeeUsd: 120,
  overheadUsd: 80,
  profitTaxRate: 0.18,
  loanAnnualInterestRate: 0.12,
  emergencyLoanAnnualInterestRate: 0.18,
  emergencyLoanIncrementUsd: 1_000,
} as const;

export const FINANCE_TRANSACTION_CATEGORIES = [
  "sales",
  "manufacturing",
  "payroll",
  "overhead",
  "marketing",
  "research",
  "release",
  "interest",
  "tax",
  "loan-proceeds",
  "loan-repayment",
] as const;

export type FinanceTransactionCategory = (typeof FINANCE_TRANSACTION_CATEGORIES)[number];

export const EXPENSE_CATEGORIES = [
  "manufacturing",
  "payroll",
  "overhead",
  "marketing",
  "research",
  "release",
  "interest",
  "tax",
] as const satisfies readonly FinanceTransactionCategory[];

export interface FinanceTransaction {
  id: string;
  date: string;
  category: FinanceTransactionCategory;
  amountUsd: number;
  note?: string;
}

export interface FinanceDailyRecord {
  date: string;
  revenueUsd: number;
  manufacturingUsd: number;
  payrollUsd: number;
  overheadUsd: number;
  marketingUsd: number;
  researchUsd: number;
  releaseUsd: number;
  interestUsd: number;
  taxUsd: number;
  financingUsd: number;
  netProfitUsd: number;
  netCashFlowUsd: number;
  closingBalanceUsd: number;
  unitsSold: number;
  unitsProduced: number;
}

export interface CompanyLoan {
  principalUsd: number;
  annualInterestRate: number;
}

export interface FinanceState {
  transactions: FinanceTransaction[];
  dailyRecords: FinanceDailyRecord[];
  loan: CompanyLoan | null;
  lifetimeRevenueUsd: number;
  lifetimeExpensesUsd: number;
  lifetimeTaxesUsd: number;
  lifetimeInterestUsd: number;
  lifetimeFinancingUsd: number;
}

export class InvalidFinanceDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFinanceDataError";
  }
}

export function createInitialFinanceState(): FinanceState {
  return {
    transactions: [],
    dailyRecords: [],
    loan: null,
    lifetimeRevenueUsd: 0,
    lifetimeExpensesUsd: 0,
    lifetimeTaxesUsd: 0,
    lifetimeInterestUsd: 0,
    lifetimeFinancingUsd: 0,
  };
}

export function applyFinanceTransaction(
  finance: FinanceState,
  input: {
    date: string;
    category: FinanceTransactionCategory;
    amountUsd: number;
    note?: string;
  },
  closingBalanceUsd: number,
): FinanceState {
  if (!isValidDateOnly(input.date)) {
    throw new InvalidFinanceDataError("Finance transaction date is invalid.");
  }
  if (!Number.isFinite(input.amountUsd)) {
    throw new InvalidFinanceDataError("Finance transaction amount is invalid.");
  }
  if (!Number.isFinite(closingBalanceUsd) || closingBalanceUsd < 0) {
    throw new InvalidFinanceDataError("Finance transaction would leave an invalid balance.");
  }

  const amountUsd = roundUsd(input.amountUsd);
  if (amountUsd === 0) {
    return finance;
  }
  assertTransactionSign(input.category, amountUsd);

  const transaction: FinanceTransaction = {
    id: nextTransactionId(finance.transactions),
    date: input.date,
    category: input.category,
    amountUsd,
    ...(input.note ? { note: input.note } : {}),
  };
  const dailyRecord = updateDailyRecord(
    finance,
    input.date,
    input.category,
    amountUsd,
    closingBalanceUsd,
  );
  const isExpense = EXPENSE_CATEGORIES.includes(input.category as (typeof EXPENSE_CATEGORIES)[number]);

  return {
    ...finance,
    transactions: [transaction, ...finance.transactions].slice(0, FINANCE_LIMITS.maxTransactionHistory),
    dailyRecords: dailyRecord,
    lifetimeRevenueUsd: roundUsd(finance.lifetimeRevenueUsd + (input.category === "sales" ? amountUsd : 0)),
    lifetimeExpensesUsd: roundUsd(finance.lifetimeExpensesUsd + (isExpense ? -amountUsd : 0)),
    lifetimeTaxesUsd: roundUsd(finance.lifetimeTaxesUsd + (input.category === "tax" ? -amountUsd : 0)),
    lifetimeInterestUsd: roundUsd(
      finance.lifetimeInterestUsd + (input.category === "interest" ? -amountUsd : 0),
    ),
    lifetimeFinancingUsd: roundUsd(
      finance.lifetimeFinancingUsd
        + (input.category === "loan-proceeds" ? amountUsd : 0)
        + (input.category === "loan-repayment" ? amountUsd : 0),
    ),
  };
}

export function recordDailyUnits(
  finance: FinanceState,
  date: string,
  units: { sold?: number; produced?: number },
  closingBalanceUsd: number,
): FinanceState {
  const sold = units.sold ?? 0;
  const produced = units.produced ?? 0;
  if (!Number.isInteger(sold) || sold < 0 || !Number.isInteger(produced) || produced < 0) {
    throw new InvalidFinanceDataError("Daily production and sales units must be non-negative integers.");
  }
  if (sold === 0 && produced === 0) {
    return finance;
  }

  const existing = finance.dailyRecords.find((record) => record.date === date);
  const record = existing ?? createEmptyDailyRecord(date, closingBalanceUsd);
  const updated: FinanceDailyRecord = {
    ...record,
    unitsSold: record.unitsSold + sold,
    unitsProduced: record.unitsProduced + produced,
    closingBalanceUsd: roundUsd(closingBalanceUsd),
  };

  return {
    ...finance,
    dailyRecords: replaceDailyRecord(finance.dailyRecords, updated),
  };
}

export function getFinanceDailyRecord(finance: FinanceState, date: string): FinanceDailyRecord | null {
  return finance.dailyRecords.find((record) => record.date === date) ?? null;
}

export function getDailyOperatingExpenses(record: FinanceDailyRecord | null): number {
  if (!record) {
    return 0;
  }
  return roundUsd(
    record.manufacturingUsd
    + record.payrollUsd
    + record.overheadUsd
    + record.marketingUsd
    + record.researchUsd
    + record.releaseUsd
    + record.interestUsd
    + record.taxUsd,
  );
}

export function parseFinanceState(value: unknown): FinanceState {
  if (!isRecord(value)) {
    throw new InvalidFinanceDataError("Finance data must be an object.");
  }

  if (!Array.isArray(value.transactions) || !Array.isArray(value.dailyRecords)) {
    throw new InvalidFinanceDataError("Finance history is missing.");
  }
  if (value.transactions.length > FINANCE_LIMITS.maxTransactionHistory) {
    throw new InvalidFinanceDataError("Finance transaction history is too long.");
  }
  if (value.dailyRecords.length > FINANCE_LIMITS.maxDailyRecords) {
    throw new InvalidFinanceDataError("Finance daily history is too long.");
  }

  const transactions = value.transactions.map(parseTransaction);
  if (new Set(transactions.map((transaction) => transaction.id)).size !== transactions.length) {
    throw new InvalidFinanceDataError("Finance transaction IDs are duplicated.");
  }

  const dailyRecords = value.dailyRecords.map(parseDailyRecord);
  if (new Set(dailyRecords.map((record) => record.date)).size !== dailyRecords.length) {
    throw new InvalidFinanceDataError("Finance daily records contain duplicate dates.");
  }
  for (let index = 1; index < dailyRecords.length; index += 1) {
    if (dailyRecords[index - 1]!.date >= dailyRecords[index]!.date) {
      throw new InvalidFinanceDataError("Finance daily records are not ordered.");
    }
  }

  const loan = value.loan === null ? null : parseLoan(value.loan);

  return {
    transactions,
    dailyRecords,
    loan,
    lifetimeRevenueUsd: parseNonNegativeNumber(value.lifetimeRevenueUsd),
    lifetimeExpensesUsd: parseNonNegativeNumber(value.lifetimeExpensesUsd),
    lifetimeTaxesUsd: parseNonNegativeNumber(value.lifetimeTaxesUsd),
    lifetimeInterestUsd: parseNonNegativeNumber(value.lifetimeInterestUsd),
    lifetimeFinancingUsd: parseFiniteNumber(value.lifetimeFinancingUsd),
  };
}

function updateDailyRecord(
  finance: FinanceState,
  date: string,
  category: FinanceTransactionCategory,
  amountUsd: number,
  closingBalanceUsd: number,
): FinanceDailyRecord[] {
  const existing = finance.dailyRecords.find((record) => record.date === date);
  const record = existing ?? createEmptyDailyRecord(date, closingBalanceUsd);
  const updated: FinanceDailyRecord = { ...record };

  switch (category) {
    case "sales":
      updated.revenueUsd = roundUsd(updated.revenueUsd + amountUsd);
      break;
    case "manufacturing":
      updated.manufacturingUsd = roundUsd(updated.manufacturingUsd - amountUsd);
      break;
    case "payroll":
      updated.payrollUsd = roundUsd(updated.payrollUsd - amountUsd);
      break;
    case "overhead":
      updated.overheadUsd = roundUsd(updated.overheadUsd - amountUsd);
      break;
    case "marketing":
      updated.marketingUsd = roundUsd(updated.marketingUsd - amountUsd);
      break;
    case "research":
      updated.researchUsd = roundUsd(updated.researchUsd - amountUsd);
      break;
    case "release":
      updated.releaseUsd = roundUsd(updated.releaseUsd - amountUsd);
      break;
    case "interest":
      updated.interestUsd = roundUsd(updated.interestUsd - amountUsd);
      break;
    case "tax":
      updated.taxUsd = roundUsd(updated.taxUsd - amountUsd);
      break;
    case "loan-proceeds":
    case "loan-repayment":
      updated.financingUsd = roundUsd(updated.financingUsd + amountUsd);
      break;
  }

  updated.closingBalanceUsd = roundUsd(closingBalanceUsd);
  updated.netProfitUsd = calculateNetProfit(updated);
  updated.netCashFlowUsd = roundUsd(updated.netProfitUsd + updated.financingUsd);

  return replaceDailyRecord(finance.dailyRecords, updated);
}

function createEmptyDailyRecord(date: string, closingBalanceUsd: number): FinanceDailyRecord {
  return {
    date,
    revenueUsd: 0,
    manufacturingUsd: 0,
    payrollUsd: 0,
    overheadUsd: 0,
    marketingUsd: 0,
    researchUsd: 0,
    releaseUsd: 0,
    interestUsd: 0,
    taxUsd: 0,
    financingUsd: 0,
    netProfitUsd: 0,
    netCashFlowUsd: 0,
    closingBalanceUsd: roundUsd(closingBalanceUsd),
    unitsSold: 0,
    unitsProduced: 0,
  };
}

function calculateNetProfit(record: FinanceDailyRecord): number {
  return roundUsd(record.revenueUsd - getDailyOperatingExpenses(record));
}

function replaceDailyRecord(
  records: FinanceDailyRecord[],
  record: FinanceDailyRecord,
): FinanceDailyRecord[] {
  const withoutRecord = records.filter((candidate) => candidate.date !== record.date);
  return [...withoutRecord, record]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-FINANCE_LIMITS.maxDailyRecords);
}

function nextTransactionId(transactions: FinanceTransaction[]): string {
  let sequence = 1;
  while (transactions.some((transaction) => transaction.id === `finance-${sequence}`)) {
    sequence += 1;
  }
  return `finance-${sequence}`;
}

function assertTransactionSign(category: FinanceTransactionCategory, amountUsd: number): void {
  const mustBePositive = category === "sales" || category === "loan-proceeds";
  if (mustBePositive && amountUsd < 0) {
    throw new InvalidFinanceDataError("Finance income cannot be negative.");
  }
  const mustBeNegative = EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])
    || category === "loan-repayment";
  if (mustBeNegative && amountUsd > 0) {
    throw new InvalidFinanceDataError("Finance expense cannot be positive.");
  }
}

function parseTransaction(value: unknown): FinanceTransaction {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.date !== "string"
    || typeof value.category !== "string"
    || typeof value.amountUsd !== "number"
    || (value.note !== undefined && typeof value.note !== "string")
  ) {
    throw new InvalidFinanceDataError("Finance transaction is invalid.");
  }
  if (
    value.id.trim().length === 0
    || !isValidDateOnly(value.date)
    || !FINANCE_TRANSACTION_CATEGORIES.includes(value.category as FinanceTransactionCategory)
    || !Number.isFinite(value.amountUsd)
    || value.amountUsd === 0
  ) {
    throw new InvalidFinanceDataError("Finance transaction is invalid.");
  }
  assertTransactionSign(value.category as FinanceTransactionCategory, value.amountUsd);

  return {
    id: value.id,
    date: value.date,
    category: value.category as FinanceTransactionCategory,
    amountUsd: roundUsd(value.amountUsd),
    ...(value.note ? { note: value.note } : {}),
  };
}

function parseDailyRecord(value: unknown): FinanceDailyRecord {
  if (!isRecord(value) || typeof value.date !== "string" || !isValidDateOnly(value.date)) {
    throw new InvalidFinanceDataError("Finance daily record is invalid.");
  }

  const amountFields = [
    "revenueUsd",
    "manufacturingUsd",
    "payrollUsd",
    "overheadUsd",
    "marketingUsd",
    "researchUsd",
    "releaseUsd",
    "interestUsd",
    "taxUsd",
    "closingBalanceUsd",
  ] as const;
  for (const field of amountFields) {
    if (typeof value[field] !== "number" || !Number.isFinite(value[field]) || value[field] < 0) {
      throw new InvalidFinanceDataError("Finance daily amounts are invalid.");
    }
  }
  for (const field of ["netProfitUsd", "netCashFlowUsd", "financingUsd"] as const) {
    if (typeof value[field] !== "number" || !Number.isFinite(value[field])) {
      throw new InvalidFinanceDataError("Finance daily totals are invalid.");
    }
  }
  if (
    !Number.isInteger(value.unitsSold)
    || (value.unitsSold as number) < 0
    || !Number.isInteger(value.unitsProduced)
    || (value.unitsProduced as number) < 0
  ) {
    throw new InvalidFinanceDataError("Finance daily unit counts are invalid.");
  }

  const record: FinanceDailyRecord = {
    date: value.date,
    revenueUsd: roundUsd(value.revenueUsd as number),
    manufacturingUsd: roundUsd(value.manufacturingUsd as number),
    payrollUsd: roundUsd(value.payrollUsd as number),
    overheadUsd: roundUsd(value.overheadUsd as number),
    marketingUsd: roundUsd(value.marketingUsd as number),
    researchUsd: roundUsd(value.researchUsd as number),
    releaseUsd: roundUsd(value.releaseUsd as number),
    interestUsd: roundUsd(value.interestUsd as number),
    taxUsd: roundUsd(value.taxUsd as number),
    financingUsd: roundUsd(value.financingUsd as number),
    netProfitUsd: roundUsd(value.netProfitUsd as number),
    netCashFlowUsd: roundUsd(value.netCashFlowUsd as number),
    closingBalanceUsd: roundUsd(value.closingBalanceUsd as number),
    unitsSold: value.unitsSold as number,
    unitsProduced: value.unitsProduced as number,
  };

  const expectedProfit = calculateNetProfit(record);
  const expectedCashFlow = roundUsd(expectedProfit + record.financingUsd);
  if (
    Math.abs(expectedProfit - record.netProfitUsd) > 0.01
    || Math.abs(expectedCashFlow - record.netCashFlowUsd) > 0.01
  ) {
    throw new InvalidFinanceDataError("Finance daily totals are inconsistent.");
  }

  return record;
}

function parseLoan(value: unknown): CompanyLoan {
  if (!isRecord(value)) {
    throw new InvalidFinanceDataError("Company loan is invalid.");
  }
  if (
    typeof value.principalUsd !== "number"
    || !Number.isFinite(value.principalUsd)
    || value.principalUsd <= 0
    || typeof value.annualInterestRate !== "number"
    || !Number.isFinite(value.annualInterestRate)
    || value.annualInterestRate < 0
    || value.annualInterestRate > FINANCE_LIMITS.maxLoanAnnualInterestRate
  ) {
    throw new InvalidFinanceDataError("Company loan is invalid.");
  }

  return {
    principalUsd: roundUsd(value.principalUsd),
    annualInterestRate: value.annualInterestRate,
  };
}

function parseNonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new InvalidFinanceDataError("Finance lifetime totals are invalid.");
  }
  return roundUsd(value);
}

function parseFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidFinanceDataError("Finance lifetime totals are invalid.");
  }
  return roundUsd(value);
}

export function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
