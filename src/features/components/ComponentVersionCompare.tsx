import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, GitCompare } from "lucide-react";
import { compareComponentConfigurations } from "../../game/models/component-compare";
import type {
  ComponentConfigurationField,
  ComponentProject,
} from "../../game/models/components";
import {
  calculateComponentGrossMargin,
  calculateComponentPerformanceScore,
  calculateSuggestedComponentPrice,
  estimateComponentManufacturingCost,
  getComponentMarketProfile,
} from "../../game/formulas/components";
import { formatCurrency, formatDecimal, formatNumber } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface ComponentVersionCompareProps {
  locale: "ru" | "en";
  project: ComponentProject;
}

const METRIC_KEYS = [
  "performanceScore",
  "unitCostUsd",
  "suggestedPrice",
  "grossMargin",
  "power",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

const LOWER_IS_BETTER: Record<MetricKey, boolean> = {
  performanceScore: false,
  unitCostUsd: true,
  suggestedPrice: false,
  grossMargin: false,
  power: true,
};

function componentMetrics(project: ComponentProject) {
  const manufacturing = estimateComponentManufacturingCost(project.configuration);
  const profile = getComponentMarketProfile(project.type);
  const suggestedPrice = calculateSuggestedComponentPrice(manufacturing.unitCostUsd, profile);
  return {
    performanceScore: calculateComponentPerformanceScore(project.configuration),
    unitCostUsd: manufacturing.unitCostUsd,
    suggestedPrice,
    grossMargin: calculateComponentGrossMargin(suggestedPrice, manufacturing.unitCostUsd),
    power: project.configuration.tdpW,
  };
}

export function ComponentVersionCompare({ locale, project }: ComponentVersionCompareProps) {
  const copy = translations[locale].components;
  const versions = project.versions;
  const latestVersion = versions.at(-1)?.version ?? 1;
  const previousVersion = versions.at(-2)?.version ?? latestVersion;
  const [fromVersion, setFromVersion] = useState(previousVersion);
  const [toVersion, setToVersion] = useState(latestVersion);

  useEffect(() => {
    setFromVersion(versions.at(-2)?.version ?? versions.at(-1)?.version ?? 1);
    setToVersion(versions.at(-1)?.version ?? 1);
  }, [project.id, versions.length]);

  const from = versions.find((version) => version.version === fromVersion) ?? versions.at(-1);
  const to = versions.find((version) => version.version === toVersion) ?? versions.at(-1);

  const comparison = useMemo(() => {
    if (!from || !to) return null;
    const changes = compareComponentConfigurations(from.configuration, to.configuration);
    const before = componentMetrics({ ...project, configuration: from.configuration });
    const after = componentMetrics({ ...project, configuration: to.configuration });
    const metrics = Object.fromEntries(
      METRIC_KEYS.map((key) => [key, { before: before[key], after: after[key] }]),
    ) as Record<MetricKey, { before: number; after: number }>;
    return { changes, metrics };
  }, [from, project, to]);

  if (versions.length < 2 || !comparison) {
    return (
      <section className="version-compare">
        <header className="version-compare__header">
          <span className="version-compare__icon"><GitCompare aria-hidden="true" size={18} /></span>
          <div>
            <h2>{copy.versionCompare.title}</h2>
            <p>{copy.versionCompare.emptyHint}</p>
          </div>
        </header>
      </section>
    );
  }

  const optionGroups: Partial<Record<ComponentConfigurationField, Record<string, string>>> = {
    bus: copy.options.bus as Record<string, string>,
    memoryStandard: copy.options.memoryStandard as Record<string, string>,
    interface: copy.options.interface as Record<string, string>,
    formFactor: copy.options.formFactor as Record<string, string>,
    supportedIsa: copy.options.supportedIsa as Record<string, string>,
    interconnect: copy.options.interconnect as Record<string, string>,
    precisions: copy.options.precisions as Record<string, string>,
    medium: copy.options.medium as Record<string, string>,
    standard: copy.options.standard as Record<string, string>,
  };

  function formatValue(field: ComponentConfigurationField, value: unknown): string {
    if (field === "precisions") {
      if (!Array.isArray(value) || value.length === 0) return copy.versionCompare.none;
      return value
        .map((item) => copy.options.precisions[item as keyof typeof copy.options.precisions] ?? String(item))
        .join(", ");
    }
    if (typeof value === "boolean") {
      return value ? copy.versionCompare.yes : copy.versionCompare.no;
    }
    if (typeof value === "number") {
      return Number.isInteger(value)
        ? formatNumber(value, locale)
        : formatDecimal(value, locale, 2);
    }
    const group = optionGroups[field];
    if (group && typeof value === "string") {
      return group[value] ?? value;
    }
    return String(value);
  }

  function formatMetric(key: MetricKey, value: number): string {
    if (key === "unitCostUsd" || key === "suggestedPrice") return formatCurrency(value, locale);
    if (key === "grossMargin") return `${formatDecimal(value * 100, locale, 1)}%`;
    if (key === "power") return `${formatNumber(value, locale)} W`;
    return formatDecimal(value, locale, 3);
  }

  return (
    <section className="version-compare">
      <header className="version-compare__header">
        <span className="version-compare__icon"><GitCompare aria-hidden="true" size={18} /></span>
        <div>
          <h2>{copy.versionCompare.title}</h2>
          <p>{copy.versionCompare.hint}</p>
        </div>
      </header>

      <div className="version-compare__selectors">
        <label>
          <span>{copy.versionCompare.from}</span>
          <select
            onChange={(event) => setFromVersion(Number(event.currentTarget.value))}
            value={fromVersion}
          >
            {versions.map((version) => (
              <option key={version.version} value={version.version}>
                {copy.version} {version.version}
              </option>
            ))}
          </select>
        </label>
        <ArrowRight aria-hidden="true" className="version-compare__arrow" size={18} />
        <label>
          <span>{copy.versionCompare.to}</span>
          <select
            onChange={(event) => setToVersion(Number(event.currentTarget.value))}
            value={toVersion}
          >
            {versions.map((version) => (
              <option key={version.version} value={version.version}>
                {copy.version} {version.version}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="version-compare__metrics">
        {METRIC_KEYS.map((key) => {
          const values = comparison.metrics[key];
          const delta = values.after - values.before;
          const improved = LOWER_IS_BETTER[key] ? delta < 0 : delta > 0;
          const worsened = LOWER_IS_BETTER[key] ? delta > 0 : delta < 0;
          const formattedDelta = `${delta > 0 ? "+" : ""}${formatDecimal(delta, locale, 2)}`;
          return (
            <article className="version-compare__metric" key={key}>
              <span>{copy.versionCompare.metrics[key]}</span>
              <strong>
                {formatMetric(key, values.before)}
                <ArrowRight aria-hidden="true" size={12} />
                {formatMetric(key, values.after)}
              </strong>
              <small
                className={
                  improved
                    ? "version-compare__delta version-compare__delta--up"
                    : worsened
                      ? "version-compare__delta version-compare__delta--down"
                      : "version-compare__delta"
                }
              >
                {delta === 0 ? copy.versionCompare.unchanged : formattedDelta}
              </small>
            </article>
          );
        })}
      </div>

      <div className="version-compare__changes">
        <h3>
          {comparison.changes.length === 0
            ? copy.versionCompare.identical
            : copy.versionCompare.changed.replace("{count}", String(comparison.changes.length))}
        </h3>
        {comparison.changes.length === 0 ? (
          <p className="version-compare__empty"><Check aria-hidden="true" size={16} /> {copy.versionCompare.noChanges}</p>
        ) : (
          <ul>
            {comparison.changes.map((change) => (
              <li key={change.field}>
                <span className="version-compare__change-label">{copy.fields[change.field]}</span>
                <strong className="version-compare__change-value version-compare__change-value--before">
                  {formatValue(change.field, change.before)}
                </strong>
                <ArrowRight aria-hidden="true" size={13} />
                <strong className="version-compare__change-value version-compare__change-value--after">
                  {formatValue(change.field, change.after)}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
