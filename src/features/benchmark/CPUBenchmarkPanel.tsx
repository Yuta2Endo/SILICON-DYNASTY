import { Activity, Gauge, MemoryStick, Play, Thermometer, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { CpuConfiguration } from "../../game/models/cpu";
import {
  runCpuBenchmarks,
  type CpuBenchmarkResult,
} from "../../game/formulas/benchmark";
import type { Locale } from "../../game/models/game-state";
import { formatDecimal } from "../../localization/formatters";
import { translations, type TranslationMessages } from "../../localization/messages";

interface CPUBenchmarkPanelProps {
  configuration: CpuConfiguration;
  configurationIsValid: boolean;
  locale: Locale;
}

export function CPUBenchmarkPanel({ configuration, configurationIsValid, locale }: CPUBenchmarkPanelProps) {
  const copy = translations[locale].cpu.benchmark;
  const [results, setResults] = useState<CpuBenchmarkResult[] | null>(null);
  const [hasRunError, setHasRunError] = useState(false);

  useEffect(() => {
    setResults(null);
    setHasRunError(false);
  }, [configuration]);

  function handleRun() {
    setHasRunError(false);
    try {
      setResults(runCpuBenchmarks(configuration));
    } catch {
      setResults(null);
      setHasRunError(true);
    }
  }

  return (
    <section className="cpu-benchmark-panel" aria-labelledby="cpu-benchmark-title">
      <header className="cpu-benchmark-panel__header">
        <div className="cpu-benchmark-panel__intro">
          <span className="cpu-benchmark-panel__icon" aria-hidden="true"><Activity size={19} /></span>
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="cpu-benchmark-title">{copy.title}</h2>
            <p>{copy.hint}</p>
          </div>
        </div>
        <button
          aria-controls="cpu-benchmark-results"
          aria-describedby="cpu-benchmark-help"
          className="button button--primary cpu-benchmark-panel__run"
          disabled={!configurationIsValid}
          onClick={handleRun}
          type="button"
        >
          <Play aria-hidden="true" size={16} />
          {copy.run}
        </button>
      </header>

      <p className="cpu-benchmark-panel__note" id="cpu-benchmark-help">
        {!configurationIsValid ? copy.invalidConfiguration : copy.simulationNote}
      </p>

      {hasRunError && <p className="cpu-benchmark-panel__error" role="alert">{copy.runError}</p>}

      {results ? (
        <div className="cpu-benchmark-results" aria-live="polite" id="cpu-benchmark-results">
          {results.map((result) => (
            <BenchmarkResultCard copy={copy} key={result.workloadId} locale={locale} result={result} />
          ))}
        </div>
      ) : (
        <div className="cpu-benchmark-panel__empty" role="status">
          <Gauge aria-hidden="true" size={17} />
          <span>{copy.empty}</span>
        </div>
      )}
    </section>
  );
}

type BenchmarkCopy = TranslationMessages["cpu"]["benchmark"];

function BenchmarkResultCard({
  copy,
  locale,
  result,
}: {
  copy: BenchmarkCopy;
  locale: Locale;
  result: CpuBenchmarkResult;
}) {
  const workloadLabel = copy.workloads[result.workloadId];

  return (
    <article className="cpu-benchmark-result" aria-labelledby={`cpu-benchmark-${result.workloadId}`}>
      <header className="cpu-benchmark-result__header">
        <div>
          <h3 id={`cpu-benchmark-${result.workloadId}`}>{workloadLabel}</h3>
          <span className="cpu-benchmark-result__tag">{copy.simulated}</span>
        </div>
        <span className={`cpu-benchmark-result__status${result.supported ? " is-supported" : " is-unavailable"}`}>
          {result.supported ? copy.supported : copy.unavailable}
        </span>
      </header>

      {!result.supported ? (
        <p className="cpu-benchmark-result__unavailable">
          {copy.insufficientMemory
            .replace("{required}", formatDecimal(result.requiredMemoryGb, locale, 2))
            .replace("{available}", formatDecimal(result.availableMemoryGb, locale, 2))}
        </p>
      ) : (
        <dl className="cpu-benchmark-result__metrics">
          <Metric icon={Gauge} label={copy.singleCore} value={`${formatDecimal(result.singleCoreTasksPerSecond, locale, 3)} ${copy.tasksPerSecond}`} />
          <Metric icon={Activity} label={copy.multiCore} value={`${formatDecimal(result.multiCoreTasksPerSecond, locale, 3)} ${copy.tasksPerSecond}`} />
          <Metric
            icon={MemoryStick}
            label={copy.memoryBandwidth}
            value={`${formatDecimal(result.achievedMemoryBandwidthGbPerSecond, locale, 3)} / ${formatDecimal(result.memoryBandwidthGbPerSecond, locale, 2)} GB/s`}
          />
          <Metric icon={Zap} label={copy.power} value={`${formatDecimal(result.estimatedPowerW, locale, 1)} W`} />
          <Metric icon={Thermometer} label={copy.temperature} value={`${formatDecimal(result.estimatedTemperatureC, locale, 1)} °C`} />
          <Metric icon={Gauge} label={copy.effectiveClock} value={`${formatDecimal(result.effectiveClockMHz, locale, 1)} MHz`} />
          <Metric
            icon={Thermometer}
            label={copy.thermalState}
            value={result.thermallyThrottled
              ? copy.throttled.replace("{percent}", formatDecimal((1 - result.thermalThrottleFactor) * 100, locale, 1))
              : copy.notThrottled}
          />
        </dl>
      )}
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="cpu-benchmark-metric">
      <dt><Icon aria-hidden="true" size={14} />{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
