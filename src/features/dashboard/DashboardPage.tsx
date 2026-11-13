import { useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  Cpu,
  FlaskConical,
  History,
  MonitorCog,
  Percent,
  Rocket,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { MetricCard } from "../../components/MetricCard";
import type { ScreenId } from "../../app/navigation";
import { getTutorialSteps, type TutorialStepId } from "../../game/models/game-experience";
import type { GameState } from "../../game/models/game-state";
import { getCompetitor } from "../../game/models/market";
import {
  formatCurrency,
  formatDecimal,
  formatGameDate,
  formatNumber,
  formatShortGameDate,
  formatYear,
} from "../../localization/formatters";
import { translations } from "../../localization/messages";

const QUICK_START_DISMISSED_KEY = "silicon-dynasty:quick-start-dismissed";

const STEP_TARGETS: Record<TutorialStepId, { screen: ScreenId; advanceDay?: boolean }> = {
  "design-cpu": { screen: "cpu" },
  "design-component": { screen: "components" },
  "design-os": { screen: "os" },
  "design-ai": { screen: "ai" },
  "build-device": { screen: "devices" },
  "advance-day": { screen: "dashboard", advanceDay: true },
  "start-research": { screen: "research" },
  "release-product": { screen: "market" },
  "make-sale": { screen: "market" },
};

interface DashboardPageProps {
  state: GameState;
  isSaving: boolean;
  onAdvanceDay: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export function DashboardPage({
  state,
  isSaving,
  onAdvanceDay,
  onNavigate,
}: DashboardPageProps) {
  const locale = state.settings.locale;
  const t = translations[locale];
  const latestMarket = state.market.dailySummaries.at(-1);
  const latestFinance = state.finance.dailyRecords.at(-1);
  const recentActions = state.market.actions.slice(0, 4);
  const tutorialSteps = getTutorialSteps(state);
  const completedSteps = tutorialSteps.filter((step) => step.completed).length;
  const nextStep = tutorialSteps.find((step) => !step.completed);
  const upcomingSteps = tutorialSteps.filter((step) => !step.completed).slice(0, 3);
  const [isQuickStartDismissed, setIsQuickStartDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(QUICK_START_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const showQuickStart = Boolean(nextStep) && !isQuickStartDismissed;
  const progressPercent = Math.round((completedSteps / tutorialSteps.length) * 100);

  const activeProducts = state.market.products.filter((product) => product.status === "active");
  const activeComponentProducts = state.market.componentProducts.filter(
    (product) => product.status === "active",
  );
  const hasActiveProduct = activeProducts.length > 0 || activeComponentProducts.length > 0;
  const hasStockout = activeProducts.some((product) => product.inventoryUnits === 0);
  const alerts = [
    state.company.balance < 5_000
      ? { id: "low-cash", message: t.dashboard.alertLowCash, screen: "finance" as ScreenId }
      : null,
    latestFinance && latestFinance.netProfitUsd < 0
      ? { id: "negative-profit", message: t.dashboard.alertNegativeProfit, screen: "finance" as ScreenId }
      : null,
    !hasActiveProduct
      ? { id: "no-products", message: t.dashboard.alertNoProducts, screen: "market" as ScreenId }
      : null,
    hasStockout
      ? { id: "stockout", message: t.dashboard.alertStockout, screen: "market" as ScreenId }
      : null,
    !state.research.activeProject && state.research.completedTechnologyIds.length === 0
      ? { id: "no-research", message: t.dashboard.alertNoResearch, screen: "research" as ScreenId }
      : null,
  ].filter((alert): alert is NonNullable<typeof alert> => alert !== null).slice(0, 3);

  const quickActions: Array<{
    id: string;
    label: string;
    icon: typeof Cpu;
    screen: ScreenId;
  }> = [
    { id: "cpu", label: t.dashboard.quickActionCpu, icon: Cpu, screen: "cpu" },
    { id: "product", label: t.dashboard.quickActionProduct, icon: Rocket, screen: "market" },
    { id: "research", label: t.dashboard.quickActionResearch, icon: FlaskConical, screen: "research" },
    { id: "os", label: t.dashboard.quickActionOs, icon: MonitorCog, screen: "os" },
  ];

  function dismissQuickStart() {
    setIsQuickStartDismissed(true);
    try {
      window.localStorage.setItem(QUICK_START_DISMISSED_KEY, "1");
    } catch {
      // The hint can be dismissed for the current session even without storage access.
    }
  }

  function handleTutorialStep(stepId: TutorialStepId) {
    const target = STEP_TARGETS[stepId];
    if (target.advanceDay) {
      onAdvanceDay();
      return;
    }
    onNavigate(target.screen);
  }

  return (
    <div className="page-stack">
      {showQuickStart && nextStep && (
        <Panel
          action={(
            <button
              aria-label={t.dashboard.quickStartDismiss}
              className="dashboard-quick-start__dismiss"
              onClick={dismissQuickStart}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          )}
          className="dashboard-quick-start"
          description={t.dashboard.quickStartHint}
          icon={Sparkles}
          title={t.dashboard.quickStartTitle}
          tone="accent"
        >
          <div className="dashboard-quick-start__progress">
            <div className="dashboard-quick-start__progress-copy">
              <strong>{t.dashboard.quickStartNext}</strong>
              <span>
                {t.dashboard.quickStartProgress
                  .replace("{completed}", String(completedSteps))
                  .replace("{total}", String(tutorialSteps.length))}
              </span>
            </div>
            <div
              aria-label={t.dashboard.quickStartProgress
                .replace("{completed}", String(completedSteps))
                .replace("{total}", String(tutorialSteps.length))}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progressPercent}
              className="dashboard-quick-start__track"
              role="progressbar"
            >
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <ol className="dashboard-quick-start__steps">
            {upcomingSteps.map((step) => {
              const isNext = step.id === nextStep.id;
              const target = STEP_TARGETS[step.id];
              return (
                <li className={isNext ? "is-next" : ""} key={step.id}>
                  <span className="dashboard-quick-start__step-icon" aria-hidden="true">
                    {isNext ? <Circle size={17} /> : <CheckCircle2 size={17} />}
                  </span>
                  <span className="dashboard-quick-start__step-label">
                    {t.settings.journey.steps[step.id]}
                  </span>
                  {isNext && (
                    <Button
                      disabled={isSaving}
                      onClick={() => handleTutorialStep(step.id)}
                      size="sm"
                      trailingIcon={<ArrowUpRight aria-hidden="true" size={15} />}
                      variant="primary"
                    >
                      {target.advanceDay ? t.dashboard.quickStartAdvance : t.dashboard.quickStartOpen}
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>
      )}

      <section className="timeline-card" aria-label={t.dashboard.gameDate}>
        <div className="timeline-card__copy">
          <span className="timeline-card__icon" aria-hidden="true">
            <CalendarDays size={20} strokeWidth={1.8} />
          </span>
          <div>
            <p className="timeline-card__label">{t.dashboard.gameDate}</p>
            <p className="timeline-card__date">{formatGameDate(state.gameDate, locale)}</p>
            <p className="timeline-card__hint">{t.dashboard.timelineNote}</p>
          </div>
        </div>
        <Button
          disabled={isSaving}
          onClick={onAdvanceDay}
          trailingIcon={<ArrowUpRight aria-hidden="true" size={17} />}
          variant="primary"
        >
          {isSaving ? t.common.saving : t.dashboard.advanceDay}
        </Button>
      </section>

      <section className="metrics-grid" aria-label={t.screens.dashboard.title}>
        <MetricCard
          accent="blue"
          detail={t.dashboard.balanceHint}
          icon={CircleDollarSign}
          label={t.dashboard.balance}
          value={formatCurrency(state.company.balance, locale)}
        />
        <MetricCard
          accent="violet"
          detail={t.dashboard.reputationHint}
          icon={Sparkles}
          label={t.dashboard.reputation}
          value={`${formatNumber(state.company.reputation, locale)} / 100`}
        />
        <MetricCard
          accent="green"
          detail={t.dashboard.teamHint}
          icon={UsersRound}
          label={t.dashboard.team}
          value={formatNumber(state.company.employeeCount, locale)}
        />
        <MetricCard
          accent="amber"
          detail={t.dashboard.foundedHint}
          icon={CalendarDays}
          label={t.dashboard.founded}
          value={formatYear(state.company.foundedYear, locale)}
        />
        <MetricCard
          accent="green"
          detail={t.dashboard.dailyRevenueHint}
          icon={Banknote}
          label={t.dashboard.dailyRevenue}
          value={formatCurrency(latestFinance?.revenueUsd ?? 0, locale)}
        />
        <MetricCard
          accent="blue"
          detail={t.dashboard.netProfitHint}
          icon={TrendingUp}
          label={t.dashboard.netProfit}
          value={formatCurrency(latestFinance?.netProfitUsd ?? 0, locale)}
        />
        <MetricCard
          accent="violet"
          detail={t.dashboard.marketShareHint}
          icon={Percent}
          label={t.dashboard.marketShare}
          value={`${formatDecimal((latestMarket?.marketShare ?? 0) * 100, locale, 2)}%`}
        />
        <MetricCard
          accent="amber"
          detail={t.dashboard.dailyUnitsHint}
          icon={ShoppingCart}
          label={t.dashboard.dailyUnits}
          value={formatNumber((latestMarket?.playerUnits ?? 0) + (latestMarket?.componentUnits ?? 0), locale)}
        />
      </section>

      <Panel
        className="dashboard-command-center"
        description={t.dashboard.commandCenterHint}
        icon={Zap}
        title={t.dashboard.commandCenterTitle}
      >
        <div className="command-center-grid">
          <div className="command-center-block">
            <h3>{t.dashboard.quickActionsTitle}</h3>
            <div className="command-center-actions">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    className="command-center-action"
                    key={action.id}
                    onClick={() => onNavigate(action.screen)}
                    type="button"
                  >
                    <span className="command-center-action__icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <span>{action.label}</span>
                    <ArrowUpRight aria-hidden="true" size={15} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="command-center-block command-center-block--alerts">
            <h3>{t.dashboard.alertsTitle}</h3>
            {alerts.length === 0 ? (
              <p className="command-center-empty">
                <CheckCircle2 aria-hidden="true" size={17} />
                {t.dashboard.alertsEmpty}
              </p>
            ) : (
              <ul className="command-center-alerts">
                {alerts.map((alert) => (
                  <li key={alert.id}>
                    <span className="command-center-alert__dot" aria-hidden="true" />
                    <span>{alert.message}</span>
                    <Button
                      onClick={() => onNavigate(alert.screen)}
                      size="sm"
                      variant="ghost"
                    >
                      {t.dashboard.alertOpen}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Panel>

      <section className="dashboard-lower-grid">
        <article className="foundation-card">
          <div className="foundation-card__topline">
            <span className="foundation-card__icon" aria-hidden="true"><Sparkles size={19} /></span>
            <span className="status-pill">{t.dashboard.foundationTag}</span>
          </div>
          <h2>{t.dashboard.foundationTitle}</h2>
          <p>{t.dashboard.foundationBody}</p>
          <div className="foundation-card__footer">
            <span className="foundation-card__year tabular-nums">{formatYear(state.company.foundedYear, locale)}</span>
            <span className="foundation-card__rule" aria-hidden="true" />
            <span className="foundation-card__caption">{state.company.name}</span>
          </div>
        </article>

        <article className="activity-card">
          <div className="section-heading">
            <span className="section-heading__icon" aria-hidden="true"><History size={18} /></span>
            <h2>{t.dashboard.activityTitle}</h2>
          </div>
          {recentActions.length === 0 ? (
            <div className="empty-activity">
              <span className="empty-activity__icon" aria-hidden="true"><History size={20} /></span>
              <strong>{t.dashboard.activityEmpty}</strong>
              <p>{t.dashboard.activityHint}</p>
            </div>
          ) : (
            <ul className="activity-event-list">
              {recentActions.map((action) => {
                const competitor = getCompetitor(action.competitorId);
                return (
                  <li className="activity-event" key={action.id}>
                    <span className="activity-event__date">{formatShortGameDate(action.date, locale)}</span>
                    <strong>{competitor?.name ?? action.competitorId}</strong>
                    <span>
                      {t.market.actions[action.type]} · {t.market.actions.value.replace(
                        "{percent}",
                        formatDecimal(action.valuePercent, locale, 1),
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
