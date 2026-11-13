import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, GitCompare } from "lucide-react";
import { compareOsConfigurations } from "../../game/models/os-compare";
import type {
  OsConfigurationField,
  OsProject,
} from "../../game/models/os";
import {
  calculateOsEcosystemMetrics,
  calculateOsKernelMetrics,
} from "../../game/formulas/os";
import { formatDecimal, formatNumber } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface OsVersionCompareProps {
  locale: "ru" | "en";
  project: OsProject;
}

const METRIC_KEYS = [
  "overallScore",
  "performanceScore",
  "stabilityScore",
  "securityScore",
  "compatibilityScore",
  "systemQualityScore",
  "ecosystemScore",
  "compatibleApplications",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

export function OsVersionCompare({ locale, project }: OsVersionCompareProps) {
  const copy = translations[locale].os;
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

    const changes = compareOsConfigurations(from.configuration, to.configuration);
    const fromKernel = calculateOsKernelMetrics(from.configuration);
    const toKernel = calculateOsKernelMetrics(to.configuration);
    const fromEcosystem = calculateOsEcosystemMetrics(from.configuration, fromKernel);
    const toEcosystem = calculateOsEcosystemMetrics(to.configuration, toKernel);

    const metrics: Record<MetricKey, { before: number; after: number }> = {
      overallScore: { before: fromKernel.overallScore, after: toKernel.overallScore },
      performanceScore: { before: fromKernel.performanceScore, after: toKernel.performanceScore },
      stabilityScore: { before: fromKernel.stabilityScore, after: toKernel.stabilityScore },
      securityScore: { before: fromKernel.securityScore, after: toKernel.securityScore },
      compatibilityScore: { before: fromKernel.compatibilityScore, after: toKernel.compatibilityScore },
      systemQualityScore: { before: fromKernel.systemQualityScore, after: toKernel.systemQualityScore },
      ecosystemScore: { before: fromEcosystem.ecosystemScore, after: toEcosystem.ecosystemScore },
      compatibleApplications: {
        before: fromEcosystem.compatibleApplications,
        after: toEcosystem.compatibleApplications,
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

  const optionGroups: Partial<Record<OsConfigurationField, unknown>> = {
    targetPlatform: copy.options.targetPlatform,
    kernelType: copy.options.kernelType,
    bootloader: copy.options.bootloader,
    scheduler: copy.options.scheduler,
    memoryManager: copy.options.memoryManager,
    ipcModel: copy.options.ipcModel,
    moduleSupport: copy.options.moduleSupport,
    driverModel: copy.options.driverModel,
    filesystem: copy.options.filesystem,
    driverFramework: copy.options.driverFramework,
    networkStack: copy.options.networkStack,
    permissions: copy.options.permissions,
    encryption: copy.options.encryption,
    updateModel: copy.options.updateModel,
    packageManager: copy.options.packageManager,
    diagnostics: copy.options.diagnostics,
    gui: copy.options.gui,
    sdk: copy.options.sdk,
    api: copy.options.api,
    developerTools: copy.options.developerTools,
    appStore: copy.options.appStore,
  };

  function formatValue(field: OsConfigurationField, value: unknown): string {
    if (field === "supportedArchitectures") {
      return Array.isArray(value) ? value.map((item) => String(item).toUpperCase()).join(", ") : "—";
    }
    if (field === "virtualMemory") {
      return value ? copy.versionCompare.yes : copy.versionCompare.no;
    }
    if (field === "addressBits") {
      return copy.versionCompare.bits.replace("{bits}", String(value));
    }
    if (typeof value === "number") {
      return formatNumber(value, locale);
    }
    const group = optionGroups[field] as Record<string, string> | undefined;
    if (group && typeof value === "string") {
      return group[value] ?? value;
    }
    return String(value);
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
                {copy.versions.version} {version.version}
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
          const formattedDelta = `${delta > 0 ? "+" : ""}${formatDecimal(delta, locale, 1)}`;
          return (
            <article className="version-compare__metric" key={key}>
              <span>{copy.metrics[key]}</span>
              <strong>
                {formatNumber(values.before, locale)}
                <ArrowRight aria-hidden="true" size={12} />
                {formatNumber(values.after, locale)}
              </strong>
              <small
                className={
                  delta > 0
                    ? "version-compare__delta version-compare__delta--up"
                    : delta < 0
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
