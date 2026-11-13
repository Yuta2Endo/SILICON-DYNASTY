import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, GitCompare } from "lucide-react";
import { compareCpuConfigurations } from "../../game/models/cpu-compare";
import type { CpuConfigurationField, CpuProject } from "../../game/models/cpu";
import { runCpuBenchmark } from "../../game/formulas/benchmark";
import {
  calculateCpuMarketPerformanceScore,
  estimateManufacturingCost,
} from "../../game/formulas/market";
import { formatCurrency, formatDecimal, formatNumber } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface CpuVersionCompareProps {
  locale: "ru" | "en";
  project: CpuProject;
}

const METRIC_KEYS = [
  "performanceScore",
  "unitCostUsd",
  "integerTasks",
  "floatingTasks",
  "memoryBandwidth",
  "temperature",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

const LOWER_IS_BETTER: Record<MetricKey, boolean> = {
  performanceScore: false,
  unitCostUsd: true,
  integerTasks: false,
  floatingTasks: false,
  memoryBandwidth: false,
  temperature: true,
};

export function CpuVersionCompare({ locale, project }: CpuVersionCompareProps) {
  const copy = translations[locale].cpu;
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

    const changes = compareCpuConfigurations(from.configuration, to.configuration);
    const fromInteger = runCpuBenchmark(from.configuration, "integer");
    const toInteger = runCpuBenchmark(to.configuration, "integer");
    const fromFloating = runCpuBenchmark(from.configuration, "floating-point");
    const toFloating = runCpuBenchmark(to.configuration, "floating-point");
    const fromMemory = runCpuBenchmark(from.configuration, "memory");
    const toMemory = runCpuBenchmark(to.configuration, "memory");

    const metrics: Record<MetricKey, { before: number; after: number }> = {
      performanceScore: {
        before: calculateCpuMarketPerformanceScore(from.configuration),
        after: calculateCpuMarketPerformanceScore(to.configuration),
      },
      unitCostUsd: {
        before: estimateManufacturingCost(from.configuration).unitCostUsd,
        after: estimateManufacturingCost(to.configuration).unitCostUsd,
      },
      integerTasks: {
        before: fromInteger.multiCoreTasksPerSecond,
        after: toInteger.multiCoreTasksPerSecond,
      },
      floatingTasks: {
        before: fromFloating.multiCoreTasksPerSecond,
        after: toFloating.multiCoreTasksPerSecond,
      },
      memoryBandwidth: {
        before: fromMemory.achievedMemoryBandwidthGbPerSecond,
        after: toMemory.achievedMemoryBandwidthGbPerSecond,
      },
      temperature: {
        before: fromInteger.estimatedTemperatureC,
        after: toInteger.estimatedTemperatureC,
      },
    };

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

  const optionGroups: Partial<Record<CpuConfigurationField, Record<string, string>>> = {
    isa: copy.options.isa,
    architecture: copy.options.architecture,
    microarchitecture: copy.options.microarchitecture,
    memoryStandard: copy.options.memory,
  };

  function formatValue(field: CpuConfigurationField, value: unknown): string {
    if (field === "simdExtensions") {
      if (!Array.isArray(value) || value.length === 0) return copy.options.noSimd;
      return value
        .map((item) => copy.options.simd[item as keyof typeof copy.options.simd] ?? String(item))
        .join(", ");
    }
    if (field === "unitCostUsd" && typeof value === "number") {
      return formatCurrency(value, locale);
    }
    if (typeof value === "number") {
      return field === "ipc" || field === "l2CacheMbPerCore"
        ? formatDecimal(value, locale, 3)
        : formatNumber(value, locale);
    }
    const group = optionGroups[field];
    if (group && typeof value === "string") {
      return group[value] ?? value;
    }
    return String(value);
  }

  function formatMetric(key: MetricKey, value: number): string {
    if (key === "unitCostUsd") return formatCurrency(value, locale);
    if (key === "temperature") return `${formatDecimal(value, locale, 1)} °C`;
    return formatDecimal(value, locale, 2);
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
