import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, GitCompare } from "lucide-react";
import {
  compareCloudConfigurations,
  type CloudConfigurationField,
  type CloudConfigurationValue,
} from "../../game/models/cloud-compare";
import type { CloudConfiguration, CloudProject } from "../../game/models/cloud";
import type { GameState } from "../../game/models/game-state";
import { calculateCloudMetrics } from "../../game/formulas/cloud";
import { formatCurrency, formatDecimal, formatNumber } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface CloudVersionCompareProps {
  locale: "ru" | "en";
  project: CloudProject;
  state: GameState;
}

const METRIC_KEYS = [
  "overallScore",
  "capacityScore",
  "computeUnits",
  "availability",
  "operatingCostPerDayUsd",
  "capexUsd",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

const LOWER_IS_BETTER: Record<MetricKey, boolean> = {
  overallScore: false,
  capacityScore: false,
  computeUnits: false,
  availability: false,
  operatingCostPerDayUsd: true,
  capexUsd: true,
};

const FIELD_LABELS = {
  serverDeviceProjectId: "serverDevice",
  serverDeviceVersion: "serverVersion",
  dataCenters: "dataCenters",
  serversPerCenter: "serversPerCenter",
  storageTb: "storageTb",
  networkGbps: "networkGbps",
  aiAcceleratorUnits: "aiAcceleratorUnits",
  redundancy: "redundancy",
} as const satisfies Record<CloudConfigurationField, keyof typeof translations.ru.devices.cloud.fields>;

export function CloudVersionCompare({ locale, project, state }: CloudVersionCompareProps) {
  const copy = translations[locale].devices;
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
    const context = {
      cpuProjects: state.cpuProjects,
      componentProjects: state.componentProjects,
      osProjects: state.osProjects,
      aiProjects: state.aiProjects,
      deviceProjects: state.deviceProjects,
    };
    const changes = compareCloudConfigurations(from.configuration, to.configuration);
    const before = calculateCloudMetrics(from.configuration, context);
    const after = calculateCloudMetrics(to.configuration, context);
    const metrics = Object.fromEntries(
      METRIC_KEYS.map((key) => [key, { before: before[key], after: after[key] }]),
    ) as Record<MetricKey, { before: number; after: number }>;
    return { changes, metrics, from, to };
  }, [from, to, state.aiProjects, state.componentProjects, state.cpuProjects, state.deviceProjects, state.osProjects]);

  if (versions.length < 2 || !comparison) {
    return (
      <section className="version-compare cloud-compare">
        <header className="version-compare__header">
          <span className="version-compare__icon"><GitCompare aria-hidden="true" size={18} /></span>
          <div>
            <h2>{copy.cloud.versionCompare.title}</h2>
            <p>{copy.cloud.versionCompare.emptyHint}</p>
          </div>
        </header>
      </section>
    );
  }

  function formatConfigValue(
    field: CloudConfigurationField,
    value: CloudConfigurationValue,
    configuration: CloudConfiguration,
  ): string {
    if (field === "serverDeviceProjectId") {
      if (String(value).length === 0) return copy.optional;
      const server = state.deviceProjects.find((candidate) => candidate.id === value);
      return server?.name ?? copy.cloud.versionCompare.notFound;
    }

    if (field === "serverDeviceVersion") {
      const server = state.deviceProjects.find(
        (candidate) => candidate.id === configuration.serverDeviceProjectId,
      );
      const versionExists = server?.versions.some(
        (candidate) => candidate.version === Number(value),
      );
      return versionExists
        ? `${copy.versions.version} ${formatNumber(Number(value), locale)}`
        : copy.cloud.versionCompare.notFound;
    }

    return formatNumber(Number(value), locale);
  }

  function formatMetricValue(key: MetricKey, value: number): string {
    if (key === "availability") return `${formatDecimal(value, locale, 2)}%`;
    if (key === "operatingCostPerDayUsd") {
      return `${formatCurrency(value, locale)}${copy.cloud.metrics.perDay}`;
    }
    if (key === "capexUsd") return formatCurrency(value, locale);
    if (key === "computeUnits") return formatDecimal(value, locale, 1);
    return formatDecimal(value, locale, 1);
  }

  function formatDelta(key: MetricKey, delta: number): string {
    const sign = delta > 0 ? "+" : "−";
    if (key === "availability") return `${sign}${formatDecimal(Math.abs(delta), locale, 2)}%`;
    if (key === "operatingCostPerDayUsd" || key === "capexUsd") {
      return `${sign}${formatCurrency(Math.abs(delta), locale)}`;
    }
    if (key === "computeUnits") return `${sign}${formatDecimal(Math.abs(delta), locale, 1)}`;
    return `${sign}${formatDecimal(Math.abs(delta), locale, 1)}`;
  }

  return (
    <section className="version-compare cloud-compare">
      <header className="version-compare__header">
        <span className="version-compare__icon"><GitCompare aria-hidden="true" size={18} /></span>
        <div>
          <h2>{copy.cloud.versionCompare.title}</h2>
          <p>{copy.cloud.versionCompare.hint}</p>
        </div>
        <span className="status-pill">
          {copy.cloud.versionCompare.changed.replace("{count}", String(comparison.changes.length))}
        </span>
      </header>

      <div className="version-compare__selectors">
        <label>
          <span>{copy.cloud.versionCompare.from}</span>
          <select
            aria-label={copy.cloud.versionCompare.from}
            onChange={(event) => setFromVersion(Number(event.currentTarget.value))}
            value={fromVersion}
          >
            {versions.map((version) => (
              <option key={version.version} value={version.version}>
                {copy.versions.version} {version.version}
              </option>
            ))}
          </select>
        </label>
        <ArrowRight aria-hidden="true" className="version-compare__arrow" size={18} />
        <label>
          <span>{copy.cloud.versionCompare.to}</span>
          <select
            aria-label={copy.cloud.versionCompare.to}
            onChange={(event) => setToVersion(Number(event.currentTarget.value))}
            value={toVersion}
          >
            {versions.map((version) => (
              <option key={version.version} value={version.version}>
                {copy.versions.version} {version.version}
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
          const deltaClass = delta === 0
            ? "version-compare__delta"
            : improved
              ? "version-compare__delta version-compare__delta--up"
              : "version-compare__delta version-compare__delta--down";
          return (
            <article className="version-compare__metric" key={key}>
              <p>{copy.cloud.versionCompare.metrics[key]}</p>
              <div>
                <span>{formatMetricValue(key, values.before)}</span>
                <ArrowRight aria-hidden="true" size={14} />
                <strong>{formatMetricValue(key, values.after)}</strong>
              </div>
              <span className={deltaClass}>{delta === 0 ? copy.cloud.versionCompare.unchanged : formatDelta(key, delta)}</span>
            </article>
          );
        })}
      </div>

      <div className="version-compare__changes">
        <h3>{copy.cloud.versionCompare.changed.replace("{count}", String(comparison.changes.length))}</h3>
        {comparison.changes.length === 0 ? (
          <p className="version-compare__empty"><Check aria-hidden="true" size={16} /> {copy.cloud.versionCompare.noChanges}</p>
        ) : (
          <ul>
            {comparison.changes.map((change) => (
              <li key={change.field}>
                <span className="version-compare__change-label">{copy.cloud.fields[FIELD_LABELS[change.field]]}</span>
                <strong className="version-compare__change-value version-compare__change-value--before">
                  {formatConfigValue(change.field, change.before, comparison.from.configuration)}
                </strong>
                <ArrowRight aria-hidden="true" size={14} />
                <strong className="version-compare__change-value version-compare__change-value--after">
                  {formatConfigValue(change.field, change.after, comparison.to.configuration)}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
