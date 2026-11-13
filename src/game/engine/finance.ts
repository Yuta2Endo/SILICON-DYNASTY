import type { GameState } from "../models/game-state";
import { getEconomicCycle } from "../formulas/economy";
import {
  applyFinanceTransaction,
  FINANCE_DAILY_RULES,
  FINANCE_LIMITS,
  getFinanceDailyRecord,
  roundUsd,
  type FinanceTransactionCategory,
} from "../models/finance";

export type FinanceOperationCode =
  | "invalid-amount"
  | "insufficient-funds"
  | "loan-limit"
  | "loan-not-found";

export class FinanceOperationError extends Error {
  constructor(
    readonly code: FinanceOperationCode,
    message: string,
  ) {
    super(message);
    this.name = "FinanceOperationError";
  }
}

export function postFinanceTransaction(
  state: GameState,
  category: FinanceTransactionCategory,
  amountUsd: number,
  note?: string,
): GameState {
  if (!Number.isFinite(amountUsd)) {
    throw new FinanceOperationError("invalid-amount", "Finance transaction amount is invalid.");
  }

  const roundedAmount = roundUsd(amountUsd);
  const nextBalance = roundUsd(state.company.balance + roundedAmount);
  if (nextBalance < 0) {
    throw new FinanceOperationError("insufficient-funds", "The company cannot cover this payment.");
  }

  const finance = applyFinanceTransaction(
    state.finance,
    {
      date: state.gameDate,
      category,
      amountUsd: roundedAmount,
      ...(note ? { note } : {}),
    },
    nextBalance,
  );

  return {
    ...state,
    company: { ...state.company, balance: nextBalance },
    finance,
  };
}

export function takeLoan(state: GameState, amountUsd: number): GameState {
  return borrow(state, amountUsd, FINANCE_DAILY_RULES.loanAnnualInterestRate, false);
}

export function repayLoan(state: GameState, amountUsd: number): GameState {
  const loan = state.finance.loan;
  if (!loan) {
    throw new FinanceOperationError("loan-not-found", "The company has no active loan.");
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new FinanceOperationError("invalid-amount", "Loan repayment amount is invalid.");
  }

  const repayment = roundUsd(Math.min(amountUsd, loan.principalUsd));
  if (repayment > state.company.balance) {
    throw new FinanceOperationError("insufficient-funds", "The company cannot cover this repayment.");
  }

  const nextState = postFinanceTransaction(state, "loan-repayment", -repayment, "Loan repayment");
  const principal = roundUsd(loan.principalUsd - repayment);

  return {
    ...nextState,
    finance: {
      ...nextState.finance,
      loan: principal > 0
        ? { ...loan, principalUsd: principal }
        : null,
    },
  };
}

export function getLoanDailyInterest(state: GameState): number {
  const loan = state.finance.loan;
  if (!loan) {
    return 0;
  }
  return roundUsd((loan.principalUsd * loan.annualInterestRate) / 365);
}

export function getRemainingLoanCapacity(state: GameState): number {
  const principal = state.finance.loan?.principalUsd ?? 0;
  return Math.max(0, roundUsd(FINANCE_LIMITS.maxLoanPrincipalUsd - principal));
}

export function settleDailyFinance(state: GameState, date: string): GameState {
  let nextState = state;
  const cycle = getEconomicCycle(date);
  const payrollUsd = roundUsd(
    state.company.employeeCount * FINANCE_DAILY_RULES.salaryPerEmployeeUsd * cycle.costMultiplier,
  );
  const overheadUsd = roundUsd(FINANCE_DAILY_RULES.overheadUsd * cycle.costMultiplier);
  const marketingUsd = state.market.marketingBudgetUsdPerDay;
  const interestUsd = getLoanDailyInterest(state);
  const fixedCosts = roundUsd(payrollUsd + overheadUsd + marketingUsd + interestUsd);

  nextState = ensureFunds(nextState, fixedCosts, date, "Operating costs");

  if (payrollUsd > 0) {
    nextState = postFinanceTransaction(nextState, "payroll", -payrollUsd, "Payroll");
  }
  if (overheadUsd > 0) {
    nextState = postFinanceTransaction(nextState, "overhead", -overheadUsd, "Facility overhead");
  }
  if (marketingUsd > 0) {
    nextState = postFinanceTransaction(nextState, "marketing", -marketingUsd, "Marketing budget");
  }
  if (interestUsd > 0) {
    nextState = postFinanceTransaction(nextState, "interest", -interestUsd, "Loan interest");
  }

  const record = getFinanceDailyRecord(nextState.finance, date);
  const expensesBeforeTax = record
    ? record.manufacturingUsd
      + record.payrollUsd
      + record.overheadUsd
      + record.marketingUsd
      + record.researchUsd
      + record.releaseUsd
      + record.interestUsd
    : 0;
  const taxableProfit = roundUsd((record?.revenueUsd ?? 0) - expensesBeforeTax);
  const taxUsd = taxableProfit > 0
    ? roundUsd(taxableProfit * FINANCE_DAILY_RULES.profitTaxRate)
    : 0;

  if (taxUsd > 0) {
    nextState = ensureFunds(nextState, taxUsd, date, "Profit tax");
    nextState = postFinanceTransaction(nextState, "tax", -taxUsd, "Profit tax");
  }

  return {
    ...nextState,
    finance: {
      ...nextState.finance,
      dailyRecords: nextState.finance.dailyRecords.map((dailyRecord) =>
        dailyRecord.date === date && dailyRecord.closingBalanceUsd !== nextState.company.balance
          ? { ...dailyRecord, closingBalanceUsd: nextState.company.balance }
          : dailyRecord,
      ),
    },
  };
}

function borrow(
  state: GameState,
  amountUsd: number,
  annualInterestRate: number,
  emergency: boolean,
): GameState {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new FinanceOperationError("invalid-amount", "Loan amount is invalid.");
  }

  const amount = roundUsd(amountUsd);
  const currentPrincipal = state.finance.loan?.principalUsd ?? 0;
  if (currentPrincipal + amount > FINANCE_LIMITS.maxLoanPrincipalUsd) {
    throw new FinanceOperationError("loan-limit", "The loan limit has been reached.");
  }

  const nextState = postFinanceTransaction(
    state,
    "loan-proceeds",
    amount,
    emergency ? "Emergency financing" : "Bank loan",
  );
  const principal = roundUsd(currentPrincipal + amount);
  const rate = emergency
    ? Math.max(annualInterestRate, FINANCE_DAILY_RULES.emergencyLoanAnnualInterestRate)
    : state.finance.loan?.annualInterestRate ?? annualInterestRate;

  return {
    ...nextState,
    finance: {
      ...nextState.finance,
      loan: {
        principalUsd: principal,
        annualInterestRate: rate,
      },
    },
  };
}

function ensureFunds(
  state: GameState,
  requiredUsd: number,
  date: string,
  note: string,
): GameState {
  if (!Number.isFinite(requiredUsd) || requiredUsd <= 0 || state.company.balance >= requiredUsd) {
    return state;
  }

  const shortfall = roundUsd(requiredUsd - state.company.balance);
  const increment = FINANCE_DAILY_RULES.emergencyLoanIncrementUsd;
  const amount = Math.ceil(shortfall / increment) * increment;
  const capacity = getRemainingLoanCapacity(state);
  if (amount > capacity) {
    throw new FinanceOperationError(
      "loan-limit",
      `Emergency financing for ${note} exceeds the debt limit on ${date}.`,
    );
  }

  return borrow(
    state,
    amount,
    FINANCE_DAILY_RULES.emergencyLoanAnnualInterestRate,
    true,
  );
}
