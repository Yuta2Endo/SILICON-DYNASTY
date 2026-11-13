import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, GitCompare } from "lucide-react";
import {
  compareDeviceConfigurations,
  type DeviceConfigurationField,
  type DeviceConfigurationValue,
} from "../../game/models/device-compare";
import type { DeviceConfiguration, DeviceProject, DeviceType } from "../../game/models/devices";
import type { GameState } from "../../game/models/game-state";
import { calculateDeviceMetrics } from "../../game/formulas/devices";
import { formatCurrency, formatDecimal } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface DeviceVersionCompareProps {
  locale: "ru" | "en";
  project: DeviceProject;
  state: GameState;
}

const METRIC_KEYS = [
  "overallScore",
  "performanceScore",
  "appealScore",
  "compatibilityScore",
  "unitCostUsd",
  "powerW",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

const LOWER_IS_BETTER: Record<MetricKey, boolean> = {
  overallScore: false,
  performanceScore: false,
  appealScore: false,
  compatibilityScore: false,
  unitCostUsd: true,
  powerW: true,
};

const FIELD_LABELS = {
  type: "type",
  cpuProjectId: "cpuProject",
  cpuVersion: "cpuVersion",
  motherboardProjectId: "motherboardProjectId",
  ramProjectId: "ramProjectId",
  storageProjectId: "storageProjectId",
  gpuProjectId: "gpuProjectId",
  networkingProjectId: "networkingProjectId",
  aiAcceleratorProjectId: "aiAcceleratorProjectId",
  osProjectId: "osProject",
  osReleaseId: "osRelease",
  aiProjectId: "aiProject",
  aiDeploymentId: "aiDeployment",
} as const satisfies Record<DeviceConfigurationField, string>;

export function DeviceVersionCompare({ locale, project, state }: DeviceVersionCompareProps) {
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
    };
    const changes = compareDeviceConfigurations(from.configuration, to.configuration);
    const before = calculateDeviceMetrics(from.configuration, context);
    const after = calculateDeviceMetrics(to.configuration, context);
    const metrics = Object.fromEntries(
      METRIC_KEYS.map((key) => [key, { before: before[key], after: after[key] }]),
    ) as Record<MetricKey, { before: number; after: number }>;
    return { changes, metrics, from, to };
  }, [from, to, state.aiProjects, state.componentProjects, state.cpuProjects, state.osProjects]);

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

  function resolveProjectName(
    projects: readonly { id: string; name: string }[],
    id: string | null,
  ): string {
    if (!id) return copy.versionCompare.none;
    return projects.find((candidate) => candidate.id === id)?.name ?? copy.versionCompare.notFound;
  }

  function formatConfigValue(
    field: DeviceConfigurationField,
    value: DeviceConfigurationValue,
    configuration: DeviceConfiguration,
  ): string {
    if (value === null) return copy.versionCompare.none;

    switch (field) {
      case "type":
        return copy.deviceTypes[value as DeviceType] ?? String(value);
      case "cpuProjectId":
        return resolveProjectName(state.cpuProjects, String(value));
      case "motherboardProjectId":
      case "ramProjectId":
      case "storageProjectId":
      case "gpuProjectId":
      case "networkingProjectId":
      case "aiAcceleratorProjectId":
        return resolveProjectName(state.componentProjects, value === null ? null : String(value));
      case "osProjectId":
        return resolveProjectName(state.osProjects, String(value));
      case "osReleaseId": {
        const osProject = state.osProjects.find((candidate) => candidate.id === configuration.osProjectId);
        const release = osProject?.releases.find((candidate) => candidate.id === value);
        return release
          ? `${copy.releaseStages[release.stage]} · ${copy.versions.version} ${release.version}`
          : copy.versionCompare.notFound;
      }
      case "aiProjectId":
        return resolveProjectName(state.aiProjects, String(value));
      case "aiDeploymentId": {
        const aiProject = state.aiProjects.find((candidate) => candidate.id === configuration.aiProjectId);
        const deployment = aiProject?.deployments.find((candidate) => candidate.id === value);
        return deployment
          ? `${copy.versions.version} ${deployment.version}`
          : copy.versionCompare.notFound;
      }
      default:
        return String(value);
    }
  }

  function formatMetricValue(key: MetricKey, value: number): string {
    if (key === "unitCostUsd") return formatCurrency(value, locale);
    if (key === "powerW") return `${formatDecimal(value, locale, 1)} ${copy.units.watt}`;
    return formatDecimal(value, locale, 1);
  }

  function formatDelta(key: MetricKey, delta: number): string {
    const sign = delta > 0 ? "+" : "−";
    if (key === "unitCostUsd") return `${sign}${formatCurrency(Math.abs(delta), locale)}`;
    if (key === "powerW") return `${sign}${formatDecimal(Math.abs(delta), locale, 1)} ${copy.units.watt}`;
    return `${sign}${formatDecimal(Math.abs(delta), locale, 1)}`;
  }

  return (
    <section className="version-compare">
      <header className="version-compare__header">
        <span className="version-compare__icon"><GitCompare aria-hidden="true" size={18} /></span>
        <div>
          <h2>{copy.versionCompare.title}</h2>
          <p>{copy.versionCompare.hint}</p>
        </div>
        <span className="status-pill">
          {copy.versionCompare.changed.replace("{count}", String(comparison.changes.length))}
        </span>
      </header>

      <div className="version-compare__selectors">
        <label>
          <span>{copy.versionCompare.from}</span>
          <select
            aria-label={copy.versionCompare.from}
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
          <span>{copy.versionCompare.to}</span>
          <select
            aria-label={copy.versionCompare.to}
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
              <p>{copy.versionCompare.metrics[key]}</p>
              <div>
                <span>{formatMetricValue(key, values.before)}</span>
                <ArrowRight aria-hidden="true" size={14} />
                <strong>{formatMetricValue(key, values.after)}</strong>
              </div>
              <span className={deltaClass}>{delta === 0 ? copy.versionCompare.unchanged : formatDelta(key, delta)}</span>
            </article>
          );
        })}
      </div>

      <div className="version-compare__changes">
        <h3>{copy.versionCompare.changed.replace("{count}", String(comparison.changes.length))}</h3>
        {comparison.changes.length === 0 ? (
          <p className="version-compare__empty"><Check aria-hidden="true" size={16} /> {copy.versionCompare.noChanges}</p>
        ) : (
          <ul>
            {comparison.changes.map((change) => (
              <li key={change.field}>
                <span className="version-compare__change-label">{copy.fields[FIELD_LABELS[change.field]]}</span>
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
