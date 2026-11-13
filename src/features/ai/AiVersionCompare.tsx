import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Database, GitCompare } from "lucide-react";
import { compareAiVersions } from "../../game/models/ai-compare";
import type {
  AiConfigurationField,
  AiProject,
} from "../../game/models/ai";
import { calculateAiModelMetrics } from "../../game/formulas/ai";
import { formatDecimal, formatNumber } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface AiVersionCompareProps {
  locale: "ru" | "en";
  project: AiProject;
}

const METRIC_KEYS = [
  "qualityScore",
  "commercialReadinessScore",
  "trainingReadinessScore",
  "inferenceEfficiencyScore",
  "trainingVramGb",
  "inferenceVramGb",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

const LOWER_IS_BETTER: Record<MetricKey, boolean> = {
  qualityScore: false,
  commercialReadinessScore: false,
  trainingReadinessScore: false,
  inferenceEfficiencyScore: false,
  trainingVramGb: true,
  inferenceVramGb: true,
};

export function AiVersionCompare({ locale, project }: AiVersionCompareProps) {
  const copy = translations[locale].ai;
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
    const changes = compareAiVersions(from, to);
    const before = calculateAiModelMetrics(from.configuration, from.datasets);
    const after = calculateAiModelMetrics(to.configuration, to.datasets);
    const metrics = Object.fromEntries(
      METRIC_KEYS.map((key) => [key, { before: before[key], after: after[key] }]),
    ) as Record<MetricKey, { before: number; after: number }>;
    return { changes, metrics };
  }, [from, to]);

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

  function formatConfigValue(field: AiConfigurationField, value: string | number): string {
    if (field === "architecture") {
      return copy.options.architecture[value as keyof typeof copy.options.architecture] ?? String(value);
    }
    if (field === "precision") {
      return copy.options.precision[value as keyof typeof copy.options.precision] ?? String(value);
    }
    if (field === "quantization") {
      return copy.options.quantization[value as keyof typeof copy.options.quantization] ?? String(value);
    }
    return typeof value === "number" ? formatNumber(value, locale) : String(value);
  }

  function formatMetric(key: MetricKey, value: number): string {
    if (key === "trainingVramGb" || key === "inferenceVramGb") {
      return `${formatDecimal(value, locale, 1)} ${copy.units.gb}`;
    }
    return formatDecimal(value, locale, 1);
  }

  function formatDelta(key: MetricKey, delta: number): string {
    const formatted = `${delta > 0 ? "+" : ""}${formatDecimal(delta, locale, 2)}`;
    return key === "trainingVramGb" || key === "inferenceVramGb"
      ? `${formatted} ${copy.units.gb}`
      : formatted;
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
                {copy.versionLabel} {version.version}
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
                {copy.versionLabel} {version.version}
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
                {delta === 0 ? copy.versionCompare.unchanged : formatDelta(key, delta)}
              </small>
            </article>
          );
        })}
      </div>

      <div className="version-compare__changes">
        <h3>
          {comparison.changes.identical
            ? copy.versionCompare.identical
            : copy.versionCompare.changed.replace(
                "{count}",
                String(comparison.changes.totalChanges),
              )}
        </h3>

        {comparison.changes.configurationChanges.length > 0 && (
          <ul>
            {comparison.changes.configurationChanges.map((change) => (
              <li key={change.field}>
                <span className="version-compare__change-label">{copy.fields[change.field]}</span>
                <strong className="version-compare__change-value version-compare__change-value--before">
                  {formatConfigValue(change.field, change.before)}
                </strong>
                <ArrowRight aria-hidden="true" size={13} />
                <strong className="version-compare__change-value version-compare__change-value--after">
                  {formatConfigValue(change.field, change.after)}
                </strong>
              </li>
            ))}
          </ul>
        )}

        {comparison.changes.identical && (
          <p className="version-compare__empty">
            <Check aria-hidden="true" size={16} /> {copy.versionCompare.noChanges}
          </p>
        )}

        {comparison.changes.datasetChanges.length > 0 && (
          <div className="ai-compare__datasets">
            <h4><Database aria-hidden="true" size={16} /> {copy.versionCompare.datasetsTitle}</h4>
            <ul className="ai-compare__dataset-list">
              {comparison.changes.datasetChanges.map((change) => (
                <li
                  className={`ai-compare__dataset ai-compare__dataset--${change.kind}`}
                  key={`${change.kind}-${change.id}`}
                >
                  <div className="ai-compare__dataset-head">
                    <strong>{change.name}</strong>
                    <span className="ai-compare__dataset-kind">
                      {copy.versionCompare.datasetKinds[change.kind]}
                    </span>
                  </div>
                  {change.fields.length > 0 && (
                    <p>
                      {change.fields
                        .map((field) => copy.versionCompare.datasetFields[field])
                        .join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
