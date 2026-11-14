import type { FinanceDailyRecord } from "../../game/models/finance";
import {
  buildCashFlowWaterfall,
  type CashFlowStep,
  type CashFlowStepId,
} from "../../game/formulas/finance-visuals";
import { formatCurrency } from "../../localization/formatters";
import type { TranslationMessages } from "../../localization/messages";

type FinanceCopy = TranslationMessages["market"]["finance"];

const FLOW_ORDER: CashFlowStepId[] = [
  "opening",
  "revenue",
  "manufacturing",
  "payroll",
  "overhead",
  "marketing",
  "research",
  "release",
  "interest",
  "tax",
  "financing",
  "closing",
];

function stepLabel(step: CashFlowStep, copy: FinanceCopy): string {
  if (step.id === "opening") {
    return copy.waterfallOpening;
  }
  if (step.id === "closing") {
    return copy.waterfallClosing;
  }
  return copy.breakdown[step.id];
}

function signed(value: number, locale: "ru" | "en"): string {
  return `${value > 0 ? "+" : ""}${formatCurrency(value, locale)}`;
}

export function CashFlowWaterfall({
  copy,
  locale,
  record,
}: {
  copy: FinanceCopy;
  locale: "ru" | "en";
  record: FinanceDailyRecord;
}) {
  const bridge = buildCashFlowWaterfall(record);
  const span = Math.max(1, bridge.maxUsd - bridge.minUsd);
  const zeroPercent = ((0 - bridge.minUsd) / span) * 100;
  const ordered = [...bridge.steps].sort(
    (left, right) => FLOW_ORDER.indexOf(left.id) - FLOW_ORDER.indexOf(right.id),
  );

  return (
    <div className="finance-waterfall">
      <div className="finance-waterfall__summary">
        <div>
          <span>{copy.waterfallOpening}</span>
          <strong>{formatCurrency(bridge.openingBalanceUsd, locale)}</strong>
        </div>
        <div>
          <span>{copy.waterfallNet}</span>
          <strong className={bridge.netCashFlowUsd >= 0 ? "is-positive" : "is-negative"}>
            {signed(bridge.netCashFlowUsd, locale)}
          </strong>
        </div>
        <div>
          <span>{copy.waterfallClosing}</span>
          <strong>{formatCurrency(bridge.closingBalanceUsd, locale)}</strong>
        </div>
      </div>

      <ol className="finance-waterfall__list">
        {ordered.map((step) => {
          const isTotal = step.kind === "total";
          const start = isTotal ? 0 : step.startUsd;
          const end = step.endUsd;
          const left = ((Math.min(start, end) - bridge.minUsd) / span) * 100;
          const width = Math.max(0.8, (Math.abs(end - start) / span) * 100);
          const amount = isTotal ? step.endUsd : step.amountUsd;
          return (
            <li
              aria-label={`${stepLabel(step, copy)}: ${isTotal ? formatCurrency(amount, locale) : signed(amount, locale)}`}
              className={`finance-waterfall__row finance-waterfall__row--${step.kind}`}
              key={step.id}
            >
              <span className="finance-waterfall__label">{stepLabel(step, copy)}</span>
              <span className="finance-waterfall__track" aria-hidden="true">
                <i
                  className="finance-waterfall__bar"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </span>
              <strong className={`finance-waterfall__amount finance-waterfall__amount--${step.kind}`}>
                {isTotal ? formatCurrency(amount, locale) : signed(amount, locale)}
              </strong>
            </li>
          );
        })}
      </ol>

      <div className="finance-waterfall__scale" aria-hidden="true">
        <span>{formatCurrency(bridge.minUsd, locale)}</span>
        <i style={{ left: `${zeroPercent}%` }} />
        <span>{formatCurrency(bridge.maxUsd, locale)}</span>
      </div>
    </div>
  );
}
