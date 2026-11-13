import { ArrowUpRight, CalendarDays, CircleDollarSign, History, Sparkles, UsersRound } from "lucide-react";
import type { GameState } from "../../game/models/game-state";
import { formatCurrency, formatGameDate, formatNumber, formatYear } from "../../localization/formatters";
import { translations } from "../../localization/messages";
import { MetricCard } from "../../components/MetricCard";

interface DashboardPageProps {
  state: GameState;
  isSaving: boolean;
  onAdvanceDay: () => void;
}

export function DashboardPage({ state, isSaving, onAdvanceDay }: DashboardPageProps) {
  const locale = state.settings.locale;
  const t = translations[locale];

  return (
    <div className="page-stack">
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
        <button
          className="button button--primary touch-manipulation select-none active:scale-95 transition-transform duration-150 ease-out"
          disabled={isSaving}
          onClick={onAdvanceDay}
          type="button"
        >
          <span>{isSaving ? t.common.saving : t.dashboard.advanceDay}</span>
          <ArrowUpRight aria-hidden="true" size={17} />
        </button>
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
      </section>

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
          <div className="empty-activity">
            <span className="empty-activity__icon" aria-hidden="true"><History size={20} /></span>
            <strong>{t.dashboard.activityEmpty}</strong>
            <p>{t.dashboard.activityHint}</p>
          </div>
        </article>
      </section>
    </div>
  );
}
