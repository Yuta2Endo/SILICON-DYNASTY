import { useState } from "react";
import type { MarketSegmentId } from "../../game/models/market";
import type { PricePerformancePoint } from "../../game/formulas/market-visuals";
import {
  formatCurrency,
  formatDecimal,
} from "../../localization/formatters";
import type { TranslationMessages } from "../../localization/messages";

type ScatterCopy = TranslationMessages["market"]["scatter"];

const WIDTH = 640;
const HEIGHT = 300;
const MARGIN = { top: 16, right: 18, bottom: 46, left: 58 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

function niceStep(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

function axis(values: number[], targetTicks = 4): { max: number; ticks: number[] } {
  const maxValue = Math.max(1, ...values);
  const step = niceStep(maxValue / targetTicks);
  const max = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return { max, ticks };
}

export function PricePerformanceScatter({
  copy,
  locale,
  points,
  segmentNames,
}: {
  copy: ScatterCopy;
  locale: "ru" | "en";
  points: readonly PricePerformancePoint[];
  segmentNames: Record<MarketSegmentId, string>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = points.find((point) => point.id === selectedId) ?? points[0] ?? null;

  if (points.length === 0) {
    return (
      <div className="market-scatter__empty">
        <strong>{copy.emptyTitle}</strong>
        <p>{copy.emptyHint}</p>
      </div>
    );
  }

  const priceAxis = axis(points.map((point) => point.priceUsd));
  const performanceAxis = axis(points.map((point) => point.performanceScore));

  const x = (price: number) => MARGIN.left + (price / priceAxis.max) * PLOT_WIDTH;
  const y = (performance: number) =>
    MARGIN.top + PLOT_HEIGHT - (performance / performanceAxis.max) * PLOT_HEIGHT;
  const ordered = [...points].sort((left, right) => {
    if (left.kind === right.kind) {
      return 0;
    }
    return left.kind === "competitor" ? -1 : 1;
  });

  return (
    <div className="market-scatter">
      <figure className="market-scatter__figure">
        <div className="market-scatter__legend" aria-hidden="true">
          <span><i className="market-scatter__legend-dot market-scatter__legend-dot--player" />{copy.player}</span>
          <span><i className="market-scatter__legend-dot market-scatter__legend-dot--competitor" />{copy.competitor}</span>
        </div>
        <svg
          aria-label={`${copy.title}. ${copy.hint}`}
          className="market-scatter__svg"
          role="img"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
          <title>{copy.title}</title>
          <desc>{copy.hint}</desc>
          <g aria-hidden="true">
            {priceAxis.ticks.map((tick) => (
              <g key={`price-${tick}`}>
                <line
                  className="market-scatter__grid"
                  x1={x(tick)}
                  x2={x(tick)}
                  y1={MARGIN.top}
                  y2={MARGIN.top + PLOT_HEIGHT}
                />
                <text
                  className="market-scatter__tick"
                  textAnchor="middle"
                  x={x(tick)}
                  y={HEIGHT - 28}
                >
                  {formatCurrency(tick, locale)}
                </text>
              </g>
            ))}
            {performanceAxis.ticks.map((tick) => (
              <g key={`performance-${tick}`}>
                <line
                  className="market-scatter__grid"
                  x1={MARGIN.left}
                  x2={MARGIN.left + PLOT_WIDTH}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text
                  className="market-scatter__tick"
                  textAnchor="end"
                  x={MARGIN.left - 8}
                  y={y(tick) + 3}
                >
                  {formatDecimal(tick, locale, 1)}
                </text>
              </g>
            ))}
            <text
              className="market-scatter__axis-title"
              textAnchor="middle"
              x={MARGIN.left + PLOT_WIDTH / 2}
              y={HEIGHT - 7}
            >
              {copy.priceAxis}
            </text>
            <text
              className="market-scatter__axis-title"
              textAnchor="middle"
              transform={`rotate(-90 12 ${MARGIN.top + PLOT_HEIGHT / 2})`}
              x={12}
              y={MARGIN.top + PLOT_HEIGHT / 2}
            >
              {copy.performanceAxis}
            </text>
          </g>
          <g>
            {ordered.map((point) => {
              const active = selected?.id === point.id;
              return (
                <g
                  aria-label={`${point.name}, ${segmentNames[point.segmentId]}, ${copy.priceShort} ${formatCurrency(point.priceUsd, locale)}, ${copy.performanceShort} ${formatDecimal(point.performanceScore, locale, 2)}`}
                  aria-pressed={active}
                  className={`market-scatter__point market-scatter__point--${point.kind} market-scatter__point--${point.segmentId}${active ? " is-selected" : ""}`}
                  key={point.id}
                  onClick={() => setSelectedId(point.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(point.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <title>{`${point.name} — ${segmentNames[point.segmentId]} — ${formatCurrency(point.priceUsd, locale)} — ${formatDecimal(point.performanceScore, locale, 2)}`}</title>
                  <circle
                    className="market-scatter__dot-halo"
                    cx={x(point.priceUsd)}
                    cy={y(point.performanceScore)}
                    r={point.kind === "player" ? 9 : 7}
                  />
                  <circle
                    className="market-scatter__dot"
                    cx={x(point.priceUsd)}
                    cy={y(point.performanceScore)}
                    r={point.kind === "player" ? 6 : 4.5}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </figure>

      {selected ? (
        <div className="market-scatter__detail">
          <div>
            <span className="market-scatter__eyebrow">{copy.selected}</span>
            <strong>{selected.name}</strong>
            <small>{selected.sourceName}</small>
          </div>
          <dl>
            <div>
              <dt>{copy.price}</dt>
              <dd>{formatCurrency(selected.priceUsd, locale)}</dd>
            </div>
            <div>
              <dt>{copy.performance}</dt>
              <dd>{formatDecimal(selected.performanceScore, locale, 2)}</dd>
            </div>
            <div>
              <dt>{copy.segment}</dt>
              <dd>{segmentNames[selected.segmentId]}</dd>
            </div>
            <div>
              <dt>{copy.origin}</dt>
              <dd>{selected.kind === "player" ? copy.player : copy.competitor}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
