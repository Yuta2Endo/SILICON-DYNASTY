import { useState } from "react";
import {
  Banknote,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Download,
  FlaskConical,
  Landmark,
  Percent,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
import type { GameState } from "../../game/models/game-state";
import {
  ANALYTICS_RANGE_OPTIONS,
  analyticsCsv,
  buildAnalyticsReport,
  type AnalyticsPoint,
  type AnalyticsRangeDays,
} from "../../game/formulas/analytics";
import {
  formatCurrency,
  formatDecimal,
  formatNumber,
  formatShortGameDate,
} from "../../localization/formatters";
import { translations, type TranslationMessages } from "../../localization/messages";
import { MetricCard } from "../../components/MetricCard";

interface AnalyticsPanelProps {
  state: GameState;
}

export function AnalyticsPanel({ state }: AnalyticsPanelProps) {
  const locale = state.settings.locale;
  const copy = translations[locale].analytics;
  const researchNames = translations[locale].research.technologies;
  const [rangeDays, setRangeDays] = useState<AnalyticsRangeDays>(30);
  const [feedback, setFeedback] = useState<string | null>(null);
  const report = buildAnalyticsReport(state, rangeDays);
  const { corporate, market, technology } = report;

  const handleExport = () => {
    try {
      if (typeof URL.createObjectURL !== "function") {
        throw new Error("Blob downloads are unavailable.");
      }
      const blob = new Blob([analyticsCsv(report)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `silicon-dynasty-analytics-${state.gameDate}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback(copy.exportSuccess);
    } catch {
      setFeedback(copy.exportError);
    }
  };

  return (
    <div className="page-stack analytics-page">
      <section className="analytics-header">
        <div>
          <p className="analytics-eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          <p>{copy.hint}</p>
        </div>
        <div className="analytics-actions">
          <div className="analytics-range" role="group" aria-label={copy.rangeLabel}>
            {ANALYTICS_RANGE_OPTIONS.map((days) => (
              <button
                aria-pressed={rangeDays === days}
                className={`segment-button${rangeDays === days ? " is-selected" : ""}`}
                key={days}
                onClick={() => setRangeDays(days)}
                type="button"
              >
                {copy.ranges[`d${days}` as keyof typeof copy.ranges]}
              </button>
            ))}
          </div>
          <button className="button button--secondary button--sm" onClick={handleExport} type="button">
            <Download aria-hidden="true" size={16} />
            {copy.exportCsv}
          </button>
        </div>
      </section>

      {feedback && <p aria-live="polite" className="inline-feedback">{feedback}</p>}

      <section className="metrics-grid" aria-label={copy.kpiLabel}>
        <MetricCard
          accent="blue"
          detail={report.fromDate && report.toDate
            ? `${formatShortGameDate(report.fromDate, locale)} — ${formatShortGameDate(report.toDate, locale)}`
            : copy.noRange}
          icon={Banknote}
          label={copy.kpis.revenue}
          value={formatCurrency(corporate.revenueUsd, locale)}
        />
        <MetricCard
          accent={corporate.netProfitUsd >= 0 ? "green" : "amber"}
          detail={copy.margin.replace("{value}", formatDecimal(corporate.netMargin * 100, locale, 1))}
          icon={TrendingUp}
          label={copy.kpis.netProfit}
          value={formatCurrency(corporate.netProfitUsd, locale)}
        />
        <MetricCard
          accent="violet"
          detail={copy.units.replace("{value}", formatNumber(market.playerUnits, locale))}
          icon={Percent}
          label={copy.kpis.marketShare}
          value={`${formatDecimal(market.marketShare * 100, locale, 2)}%`}
        />
        <MetricCard
          accent="amber"
          detail={copy.debt.replace("{value}", formatCurrency(corporate.debtUsd, locale))}
          icon={Wallet}
          label={copy.kpis.balance}
          value={formatCurrency(corporate.closingBalanceUsd, locale)}
        />
      </section>

      <section className="analytics-card" aria-labelledby="analytics-chart-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="analytics-chart-title">{copy.chart.title}</h2>
            <p>{copy.chart.description}</p>
          </div>
          <BarChart3 aria-hidden="true" size={20} />
        </div>
        <AnalyticsChart copy={copy.chart} locale={locale} points={report.points} />
      </section>

      <div className="analytics-grid">
        <section className="analytics-card" aria-labelledby="analytics-corporate-title">
          <div className="analytics-section-heading">
            <div>
              <h2 id="analytics-corporate-title">{copy.corporate.title}</h2>
              <p>{copy.corporate.hint}</p>
            </div>
            <Landmark aria-hidden="true" size={20} />
          </div>
          <dl className="analytics-data-list">
            <AnalyticsRow label={copy.corporate.expenses} value={formatCurrency(corporate.expensesUsd, locale)} />
            <AnalyticsRow label={copy.corporate.manufacturing} value={formatCurrency(corporate.manufacturingUsd, locale)} />
            <AnalyticsRow label={copy.corporate.payroll} value={formatCurrency(corporate.payrollUsd, locale)} />
            <AnalyticsRow label={copy.corporate.overhead} value={formatCurrency(corporate.overheadUsd, locale)} />
            <AnalyticsRow label={copy.corporate.marketing} value={formatCurrency(corporate.marketingUsd, locale)} />
            <AnalyticsRow label={copy.corporate.research} value={formatCurrency(corporate.researchUsd, locale)} />
            <AnalyticsRow label={copy.corporate.release} value={formatCurrency(corporate.releaseUsd, locale)} />
            <AnalyticsRow label={copy.corporate.interest} value={formatCurrency(corporate.interestUsd, locale)} />
            <AnalyticsRow label={copy.corporate.tax} value={formatCurrency(corporate.taxUsd, locale)} />
            <AnalyticsRow label={copy.corporate.averageRevenue} value={formatCurrency(corporate.averageDailyRevenueUsd, locale)} />
            <AnalyticsRow label={copy.corporate.averageProfit} value={formatCurrency(corporate.averageDailyProfitUsd, locale)} />
            <AnalyticsRow
              label={copy.corporate.runway}
              value={corporate.cashRunwayDays === null
                ? copy.corporate.runwayUnlimited
                : copy.corporate.runwayValue.replace("{days}", formatNumber(corporate.cashRunwayDays, locale))}
            />
          </dl>
          <div className="analytics-lifetime">
            <h3>{copy.corporate.lifetimeTitle}</h3>
            <dl className="analytics-data-list">
              <AnalyticsRow label={copy.corporate.lifetimeRevenue} value={formatCurrency(corporate.lifetimeRevenueUsd, locale)} />
              <AnalyticsRow label={copy.corporate.lifetimeExpenses} value={formatCurrency(corporate.lifetimeExpensesUsd, locale)} />
              <AnalyticsRow label={copy.corporate.lifetimeTaxes} value={formatCurrency(corporate.lifetimeTaxesUsd, locale)} />
              <AnalyticsRow label={copy.corporate.lifetimeInterest} value={formatCurrency(corporate.lifetimeInterestUsd, locale)} />
              <AnalyticsRow label={copy.corporate.lifetimeFinancing} value={formatCurrency(corporate.lifetimeFinancingUsd, locale)} />
            </dl>
          </div>
        </section>

        <section className="analytics-card" aria-labelledby="analytics-market-title">
          <div className="analytics-section-heading">
            <div>
              <h2 id="analytics-market-title">{copy.market.title}</h2>
              <p>{copy.market.hint}</p>
            </div>
            <Trophy aria-hidden="true" size={20} />
          </div>
          <dl className="analytics-data-list">
            <AnalyticsRow label={copy.market.revenue} value={formatCurrency(market.revenueUsd, locale)} />
            <AnalyticsRow label={copy.market.units} value={formatNumber(market.playerUnits, locale)} />
            <AnalyticsRow label={copy.market.demand} value={formatNumber(market.totalDemandUnits, locale)} />
            <AnalyticsRow label={copy.market.componentUnits} value={formatNumber(market.componentUnits, locale)} />
            <AnalyticsRow label={copy.market.componentRevenue} value={formatCurrency(market.componentRevenueUsd, locale)} />
            <AnalyticsRow label={copy.market.activeProducts} value={formatNumber(market.activeProducts, locale)} />
            <AnalyticsRow label={copy.market.activeComponents} value={formatNumber(market.activeComponentProducts, locale)} />
            <AnalyticsRow label={copy.market.competitorActions} value={formatNumber(market.competitorActions, locale)} />
            <AnalyticsRow
              label={copy.market.bestDay}
              value={market.bestDay
                ? `${formatShortGameDate(market.bestDay.date, locale)} · ${formatCurrency(market.bestDay.revenueUsd, locale)}`
                : copy.market.noBestDay}
            />
          </dl>

          <div className="analytics-subsection">
            <h3>{copy.market.segmentsTitle}</h3>
            {market.segments.length === 0 ? (
              <p className="market-empty-text">{copy.market.noSegments}</p>
            ) : (
              <div className="analytics-segment-list">
                {market.segments.map((segment) => (
                  <article className="analytics-segment" key={segment.segmentId}>
                    <div>
                      <strong>{copy.segments[segment.segmentId]}</strong>
                      <span>{copy.market.segmentUnits.replace("{value}", formatNumber(segment.playerUnits, locale))}</span>
                    </div>
                    <span className="analytics-share">{formatDecimal(segment.share * 100, locale, 2)}%</span>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="analytics-subsection">
            <h3>{copy.market.topProductsTitle}</h3>
            {market.topProducts.length === 0 ? (
              <p className="market-empty-text">{copy.market.noProducts}</p>
            ) : (
              <div className="analytics-product-list">
                {market.topProducts.map((product) => (
                  <article className="analytics-product" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.kind === "cpu" ? copy.market.cpu : copy.market.component}</span>
                    </div>
                    <div className="analytics-product__value">
                      <strong>{formatCurrency(product.revenueUsd, locale)}</strong>
                      <span>{copy.market.productUnits.replace("{value}", formatNumber(product.unitsSold, locale))}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="analytics-card" aria-labelledby="analytics-technology-title">
        <div className="analytics-section-heading">
          <div>
            <h2 id="analytics-technology-title">{copy.technology.title}</h2>
            <p>{copy.technology.hint}</p>
          </div>
          <FlaskConical aria-hidden="true" size={20} />
        </div>
        <div className="analytics-technology-grid">
          <article className="analytics-technology-card">
            <CircleDollarSign aria-hidden="true" size={18} />
            <span>{copy.technology.researchCompleted}</span>
            <strong>{formatNumber(technology.researchCompleted, locale)}</strong>
          </article>
          <article className="analytics-technology-card">
            <Banknote aria-hidden="true" size={18} />
            <span>{copy.technology.researchInvested}</span>
            <strong>{formatCurrency(technology.researchInvestedUsd, locale)}</strong>
          </article>
          <article className="analytics-technology-card">
            <Boxes aria-hidden="true" size={18} />
            <span>{copy.technology.projects}</span>
            <strong>{formatNumber(technology.totalProjects, locale)}</strong>
          </article>
          <article className="analytics-technology-card">
            <BarChart3 aria-hidden="true" size={18} />
            <span>{copy.technology.versions}</span>
            <strong>{formatNumber(technology.totalVersions, locale)}</strong>
          </article>
          <article className="analytics-technology-card">
            <TrendingUp aria-hidden="true" size={18} />
            <span>{copy.technology.osReleases}</span>
            <strong>{formatNumber(technology.osReleases, locale)}</strong>
          </article>
          <article className="analytics-technology-card">
            <Trophy aria-hidden="true" size={18} />
            <span>{copy.technology.aiDeployments}</span>
            <strong>{formatNumber(technology.aiDeployments, locale)}</strong>
          </article>
        </div>
        <div className="analytics-subsection">
          <h3>{copy.technology.activeResearchTitle}</h3>
          {technology.activeResearch ? (
            <div className="analytics-research">
              <div>
                <strong>{researchNames[technology.activeResearch.technologyId as keyof typeof researchNames]?.name ?? technology.activeResearch.name}</strong>
                <span>{copy.technology.activeResearchProgress
                  .replace("{progress}", formatNumber(technology.activeResearch.progressDays, locale))
                  .replace("{total}", formatNumber(technology.activeResearch.durationDays, locale))}</span>
              </div>
              <div className="analytics-progress" aria-label={copy.technology.activeResearchProgress
                .replace("{progress}", formatNumber(technology.activeResearch.progressDays, locale))
                .replace("{total}", formatNumber(technology.activeResearch.durationDays, locale))}>
                <span style={{ width: `${Math.round(technology.activeResearch.progress * 100)}%` }} />
              </div>
            </div>
          ) : (
            <p className="market-empty-text">{copy.technology.noActiveResearch}</p>
          )}
        </div>
        <dl className="analytics-data-list analytics-project-counts">
          <AnalyticsRow label={copy.technology.cpuProjects} value={formatNumber(technology.cpuProjects, locale)} />
          <AnalyticsRow label={copy.technology.componentProjects} value={formatNumber(technology.componentProjects, locale)} />
          <AnalyticsRow label={copy.technology.osProjects} value={formatNumber(technology.osProjects, locale)} />
          <AnalyticsRow label={copy.technology.aiProjects} value={formatNumber(technology.aiProjects, locale)} />
          <AnalyticsRow label={copy.technology.deviceProjects} value={formatNumber(technology.deviceProjects, locale)} />
          <AnalyticsRow label={copy.technology.cloudProjects} value={formatNumber(technology.cloudProjects, locale)} />
        </dl>
      </section>
    </div>
  );
}

function AnalyticsRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AnalyticsChart({
  points,
  copy,
  locale,
}: {
  points: AnalyticsPoint[];
  copy: TranslationMessages["analytics"]["chart"];
  locale: GameState["settings"]["locale"];
}) {
  if (points.length === 0) {
    return <p className="market-empty-text">{copy.empty}</p>;
  }

  const width = 720;
  const height = 260;
  const left = 68;
  const right = 18;
  const top = 18;
  const bottom = 40;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = niceChartMax(Math.max(
    1,
    ...points.flatMap((point) => [point.revenueUsd, point.expensesUsd]),
  ));
  const groupWidth = plotWidth / points.length;
  const barWidth = Math.max(2, Math.min(10, groupWidth * 0.3));
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <figure className="analytics-chart">
      <div className="analytics-chart__legend">
        <span><i className="analytics-chart__swatch analytics-chart__swatch--revenue" />{copy.revenue}</span>
        <span><i className="analytics-chart__swatch analytics-chart__swatch--expenses" />{copy.expenses}</span>
      </div>
      <svg
        aria-label={`${copy.title}. ${copy.description}`}
        className="analytics-chart__svg"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>{copy.title}</title>
        <desc>{copy.description}</desc>
        {[0, 0.5, 1].map((ratio) => {
          const y = top + plotHeight - plotHeight * ratio;
          return (
            <g key={ratio}>
              <line className="analytics-chart__grid" x1={left} x2={width - right} y1={y} y2={y} />
              <text className="analytics-chart__axis-label" x={left - 8} y={y + 3} textAnchor="end">
                ${formatNumber(Math.round(maxValue * ratio), locale)}
              </text>
            </g>
          );
        })}
        {points.map((point, index) => {
          const groupX = left + index * groupWidth;
          const centerX = groupX + groupWidth / 2;
          const revenueHeight = (point.revenueUsd / maxValue) * plotHeight;
          const expensesHeight = (point.expensesUsd / maxValue) * plotHeight;
          return (
            <g key={point.date}>
              <rect
                className="analytics-chart__bar analytics-chart__bar--revenue"
                height={Math.max(0, revenueHeight)}
                width={barWidth}
                x={centerX - barWidth - 1}
                y={top + plotHeight - Math.max(0, revenueHeight)}
              />
              <rect
                className="analytics-chart__bar analytics-chart__bar--expenses"
                height={Math.max(0, expensesHeight)}
                width={barWidth}
                x={centerX + 1}
                y={top + plotHeight - Math.max(0, expensesHeight)}
              />
              {index % labelEvery === 0 && (
                <text
                  className="analytics-chart__axis-label"
                  textAnchor="middle"
                  x={centerX}
                  y={height - 14}
                >
                  {formatShortGameDate(point.date, locale)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function niceChartMax(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  return Math.ceil(value / magnitude) * magnitude;
}
