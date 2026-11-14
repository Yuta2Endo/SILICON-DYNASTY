import {
  Activity,
  AppWindow,
  BatteryFull,
  Boxes,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Code2,
  FileText,
  FolderOpen,
  Gamepad2,
  Globe,
  LayoutGrid,
  Lock,
  MonitorCog,
  Power,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { GameState } from "../../game/models/game-state";
import type { OsConfiguration, OsProject } from "../../game/models/os";
import {
  buildOsPreviewModel,
  type OsPreviewApp,
  type OsPreviewDevice,
  type OsPreviewModel,
  type OsPreviewShell,
} from "../../game/models/os-preview";
import { calculateOsKernelMetrics } from "../../game/formulas/os";
import { formatDecimal } from "../../localization/formatters";
import { translations, type TranslationMessages } from "../../localization/messages";

const APP_ICONS: Record<string, LucideIcon> = {
  notes: FileText,
  "web-browser": Globe,
  "office-suite": BriefcaseBusiness,
  "developer-studio": Code2,
  "game-runtime": Gamepad2,
  "enterprise-console": Building2,
};

const SYSTEM_APP_IDS = ["settings", "files", "task-manager", "updates"] as const;
type SystemAppId = (typeof SYSTEM_APP_IDS)[number];
type PreviewScreen = "boot" | "lock" | "desktop";

const SYSTEM_APP_ICONS: Record<SystemAppId, LucideIcon> = {
  settings: Settings,
  files: FolderOpen,
  "task-manager": Activity,
  updates: RefreshCw,
};

const DEVICE_ICONS: Record<OsPreviewDevice, LucideIcon> = {
  desktop: MonitorCog,
  mobile: Smartphone,
  server: Server,
  gaming: Gamepad2,
};

const SHELL_ICONS: Record<OsPreviewShell, LucideIcon> = {
  terminal: Terminal,
  "desktop-shell": AppWindow,
  "modern-desktop": LayoutGrid,
  adaptive: Sparkles,
};

interface OsPreviewPanelProps {
  configuration: OsConfiguration;
  project: Pick<OsProject, "releases"> | null;
  locale: GameState["settings"]["locale"];
}

export function OsPreviewPanel({ configuration, project, locale }: OsPreviewPanelProps) {
  const t = translations[locale];
  const copy = t.os.preview;
  const appCopy = t.os.applications;
  const releases = project
    ? [...project.releases].sort((left, right) => right.version - left.version)
    : [];
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const selectedRelease = releases.find((release) => release.id === selectedReleaseId) ?? null;
  const previewConfiguration = selectedRelease?.configuration ?? configuration;
  const model = buildOsPreviewModel(
    previewConfiguration,
    project,
    selectedRelease,
  );
  const systemAppCopy = copy.systemApps;
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [activeSystemAppId, setActiveSystemAppId] = useState<SystemAppId | null>(null);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>("desktop");
  const activeApp = model.apps.find((app) => app.id === activeAppId) ?? null;
  const DeviceIcon = DEVICE_ICONS[model.device];
  const ShellIcon = SHELL_ICONS[model.shell];
  const stageLabel = model.stage === "development"
    ? copy.development
    : t.os.releases.stages[model.stage];
  const nextHint = model.nextShell
    ? copy.nextHints[model.shell]
    : copy.maxLevel;

  function restartPreview() {
    setActiveAppId(null);
    setActiveSystemAppId(null);
    setIsStartOpen(false);
    setPreviewScreen("boot");
  }

  useEffect(() => {
    setActiveAppId(null);
    setActiveSystemAppId(null);
    setIsStartOpen(false);
    setPreviewScreen("desktop");
  }, [selectedReleaseId]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setIsStartOpen(false);
      setActiveAppId(null);
      setActiveSystemAppId(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <section
      className={`os-preview-panel os-preview-panel--${model.stage} os-preview-panel--${model.accent}`}
      aria-labelledby="os-preview-title"
    >
      <header className="os-preview-panel__header">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="os-preview-title">{copy.title}</h2>
          <p>{copy.hint}</p>
        </div>
        <div className="os-preview-panel__badges">
          <span className={`os-preview-stage os-preview-stage--${model.stage}`}>{stageLabel}</span>
          <span className="os-preview-version">v{model.versionLabel}</span>
          {model.shell !== "terminal" && (
            <button
              aria-label={copy.screens.restart}
              className="os-preview-power"
              onClick={restartPreview}
              title={copy.screens.restart}
              type="button"
            >
              <Power aria-hidden="true" size={14} />
            </button>
          )}
        </div>
      </header>

      {releases.length > 0 && (
        <div className="os-preview-history">
          <label htmlFor="os-preview-release">{copy.historyTitle}</label>
          <select
            id="os-preview-release"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setSelectedReleaseId(value === "draft" ? null : value);
            }}
            value={selectedReleaseId ?? "draft"}
          >
            <option value="draft">{copy.currentDraft}</option>
            {releases.map((release) => (
              <option key={release.id} value={release.id}>
                {t.os.releases.stages[release.stage]} · v{release.version}.0
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="os-preview-stagebar" aria-label={copy.summary}>
        <span><ShellIcon aria-hidden="true" size={15} />{copy.shells[model.shell]}</span>
        <span><DeviceIcon aria-hidden="true" size={15} />{copy.devices[model.device]}</span>
        <span><ShieldCheck aria-hidden="true" size={15} />{copy.quality}: {formatDecimal(model.quality, locale, 1)}</span>
      </div>

      <div className={`os-preview-device os-preview-device--${model.device}`}>
        <div className="os-preview-device__bezel">
          {model.device === "mobile" && <span className="os-preview-device__notch" aria-hidden="true" />}
          <div className={`os-preview-screen os-preview-screen--${model.shell} os-preview-screen--${model.accent}`}>
            {model.shell === "terminal" ? (
              <TerminalView
                appCount={model.compatibleApps}
                bootSeconds={model.bootSeconds}
                copy={copy}
                kernelType={t.os.options.kernelType[model.kernelType]}
                locale={locale}
                totalApps={model.totalApps}
              />
            ) : previewScreen === "boot" ? (
              <BootScreen
                configuration={previewConfiguration}
                copy={copy.screens}
                locale={locale}
                onContinue={() => setPreviewScreen("lock")}
              />
            ) : previewScreen === "lock" ? (
              <LockScreen
                configuration={previewConfiguration}
                copy={copy.screens}
                locale={locale}
                onUnlock={() => setPreviewScreen("desktop")}
              />
            ) : (
              <>
                <div className="os-preview-topbar">
                  <span className="os-preview-brand"><MonitorCog aria-hidden="true" size={13} />SILICON OS</span>
                  <span className="os-preview-search"><Search aria-hidden="true" size={12} />{copy.search}</span>
                  <span className="os-preview-status">
                    <Wifi aria-hidden="true" size={13} />
                    <BatteryFull aria-hidden="true" size={14} />
                    <time dateTime="09:41">09:41</time>
                  </span>
                </div>

                <div className="os-preview-desktop-area">
                  {model.hasWidgets && (
                    <div className="os-preview-widgets">
                      <div className="os-preview-widget">
                        <span>{copy.quality}</span>
                        <strong>{formatDecimal(model.quality, locale, 0)}</strong>
                      </div>
                      <div className="os-preview-widget">
                        <span>{copy.apps}</span>
                        <strong>{model.compatibleApps}/{model.totalApps}</strong>
                      </div>
                      <div className="os-preview-widget">
                        <span>{copy.stage}</span>
                        <strong>{stageLabel}</strong>
                      </div>
                    </div>
                  )}

                  <div className="os-preview-app-grid" aria-label={copy.apps}>
                    {model.apps.map((app) => (
                      <AppTile
                        app={app}
                        appName={appCopy.names[app.id as keyof typeof appCopy.names] ?? app.id}
                        key={app.id}
                        lockedLabel={copy.locked}
                        onOpen={() => {
                          setIsStartOpen(false);
                          setActiveSystemAppId(null);
                          setActiveAppId(app.id);
                        }}
                      />
                    ))}
                    {SYSTEM_APP_IDS.map((appId) => {
                      const Icon = SYSTEM_APP_ICONS[appId];
                      return (
                        <button
                          aria-label={systemAppCopy[appId].name}
                          className="os-preview-app os-preview-app--system"
                          key={appId}
                          onClick={() => {
                            setIsStartOpen(false);
                            setActiveAppId(null);
                            setActiveSystemAppId(appId);
                          }}
                          type="button"
                        >
                          <span className="os-preview-app__icon"><Icon aria-hidden="true" size={18} /></span>
                          <span className="os-preview-app__name">{systemAppCopy[appId].name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {activeSystemAppId && (
                    <SystemWindowView
                      appId={activeSystemAppId}
                      configuration={previewConfiguration}
                      locale={locale}
                      model={model}
                      onClose={() => setActiveSystemAppId(null)}
                    />
                  )}

                  {activeApp && (
                    <AppWindowView
                      app={activeApp}
                      appName={appCopy.names[activeApp.id as keyof typeof appCopy.names] ?? activeApp.id}
                      category={appCopy.categories[activeApp.category as keyof typeof appCopy.categories] ?? activeApp.category}
                      closeLabel={copy.close}
                      copy={copy}
                      issues={activeApp.issues.map((issue) =>
                        appCopy.issues[issue as keyof typeof appCopy.issues] ?? issue,
                      )}
                      locale={locale}
                      onClose={() => setActiveAppId(null)}
                    />
                  )}

                  {isStartOpen && (
                    <div className="os-preview-start" role="dialog" aria-label={copy.start}>
                      <div className="os-preview-start__header">
                        <span>{copy.apps}</span>
                        <button
                          aria-label={copy.close}
                          className="os-preview-icon-button"
                          onClick={() => setIsStartOpen(false)}
                          type="button"
                        >
                          <X aria-hidden="true" size={14} />
                        </button>
                      </div>
                      <div className="os-preview-start__list">
                        {model.apps.map((app) => {
                          const Icon = APP_ICONS[app.id] ?? AppWindow;
                          const name = appCopy.names[app.id as keyof typeof appCopy.names] ?? app.id;
                          return (
                            <button
                              className={`os-preview-start__item${app.compatible ? "" : " is-locked"}`}
                              key={app.id}
                              onClick={() => {
                                setIsStartOpen(false);
                                setActiveSystemAppId(null);
                                setActiveAppId(app.id);
                              }}
                              type="button"
                            >
                              <Icon aria-hidden="true" size={15} />
                              <span>{name}</span>
                              {!app.compatible && <Lock aria-hidden="true" size={12} />}
                            </button>
                          );
                        })}
                        {SYSTEM_APP_IDS.map((appId) => {
                          const Icon = SYSTEM_APP_ICONS[appId];
                          return (
                            <button
                              className="os-preview-start__item os-preview-start__item--system"
                              key={appId}
                              onClick={() => {
                                setIsStartOpen(false);
                                setActiveAppId(null);
                                setActiveSystemAppId(appId);
                              }}
                              type="button"
                            >
                              <Icon aria-hidden="true" size={15} />
                              <span>{systemAppCopy[appId].name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {model.hasTaskbar && (
                  <div className="os-preview-taskbar">
                    <button
                      aria-expanded={isStartOpen}
                      className="os-preview-start-button"
                      onClick={() => setIsStartOpen((open) => !open)}
                      type="button"
                    >
                      <LayoutGrid aria-hidden="true" size={14} />
                      {copy.start}
                    </button>
                    <div className="os-preview-taskbar__apps" aria-hidden="true">
                      {model.apps.slice(0, 4).map((app) => {
                        const Icon = APP_ICONS[app.id] ?? AppWindow;
                        return <span className={app.compatible ? "" : "is-locked"} key={app.id}><Icon size={14} /></span>;
                      })}
                    </div>
                    <span className="os-preview-taskbar__status">
                      <Wifi aria-hidden="true" size={12} />
                      <BatteryFull aria-hidden="true" size={13} />
                      <time dateTime="09:41">09:41</time>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          {model.device === "server" && <span className="os-preview-device__leds" aria-hidden="true" />}
        </div>
      </div>

      <footer className="os-preview-panel__footer">
        <span className="os-preview-app-count">
          <Boxes aria-hidden="true" size={16} />
          {copy.apps}: <strong>{model.compatibleApps}/{model.totalApps}</strong>
        </span>
        <span className="os-preview-next">
          <Sparkles aria-hidden="true" size={16} />
          <span><strong>{copy.next}:</strong> {nextHint}</span>
          <ChevronRight aria-hidden="true" size={15} />
        </span>
      </footer>
    </section>
  );
}

function AppWindowContent({
  appId,
  fallbackRows,
  locale,
}: {
  appId: string;
  fallbackRows: readonly string[];
  locale: GameState["settings"]["locale"];
}) {
  const content = translations[locale].os.preview.windowContent;

  switch (appId) {
    case "notes":
      return (
        <div aria-hidden="true" className="os-preview-notes">
          <strong>{content.notes.title}</strong>
          {content.notes.lines.map((line) => <span key={line}>{line}</span>)}
        </div>
      );
    case "web-browser":
      return (
        <div aria-hidden="true" className="os-preview-browser">
          <span className="os-preview-browser__address">{content["web-browser"].address}</span>
          <strong>{content["web-browser"].headline}</strong>
          {content["web-browser"].lines.map((line) => <span key={line}>{line}</span>)}
        </div>
      );
    case "office-suite":
      return (
        <div aria-hidden="true" className="os-preview-office">
          <strong>{content["office-suite"].title}</strong>
          <div className="os-preview-office__grid">
            {content["office-suite"].cells.map((cell, index) => (
              <span className={index % 2 === 0 ? "is-label" : ""} key={`${cell}-${index}`}>{cell}</span>
            ))}
          </div>
        </div>
      );
    case "developer-studio":
      return (
        <div aria-hidden="true" className="os-preview-code">
          <span className="os-preview-code__file">{content["developer-studio"].file}</span>
          <pre>
            {content["developer-studio"].code.map((line, index) => (
              <span key={`${line}-${index}`}><em>{index + 1}</em>{line}</span>
            ))}
          </pre>
        </div>
      );
    case "game-runtime":
      return (
        <div aria-hidden="true" className="os-preview-game">
          <span className="os-preview-game__title">{content["game-runtime"].title}</span>
          <div className="os-preview-game__hud">
            <span>{content["game-runtime"].scoreLabel}: <strong>{content["game-runtime"].score}</strong></span>
            <span>{content["game-runtime"].livesLabel}: <strong>{content["game-runtime"].lives}</strong></span>
          </div>
          <span className="os-preview-game__ship">▲</span>
          <p>{content["game-runtime"].hint}</p>
        </div>
      );
    case "enterprise-console":
      return (
        <div aria-hidden="true" className="os-preview-enterprise">
          <strong>{content["enterprise-console"].title}</strong>
          <dl>
            {content["enterprise-console"].labels.map((label, index) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{content["enterprise-console"].values[index]}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    default:
      return (
        <div className="os-preview-window__rows" aria-hidden="true">
          {fallbackRows.map((row) => <span key={row}>{row}</span>)}
        </div>
      );
  }
}

type PreviewScreensCopy = TranslationMessages["os"]["preview"]["screens"];

function BootScreen({
  configuration,
  copy,
  locale,
  onContinue,
}: {
  configuration: OsConfiguration;
  copy: PreviewScreensCopy;
  locale: GameState["settings"]["locale"];
  onContinue: () => void;
}) {
  const t = translations[locale];

  return (
    <div className="os-preview-boot">
      <div className="os-preview-boot__brand">
        <MonitorCog aria-hidden="true" size={17} />
        <span>SILICON OS</span>
      </div>
      <strong>{copy.bootTitle}</strong>
      <p>{copy.bootHint}</p>
      <dl className="os-preview-boot__rows">
        <div><dt>{copy.bootloader}</dt><dd>{t.os.options.bootloader[configuration.bootloader]}</dd></div>
        <div><dt>{copy.kernel}</dt><dd>{t.os.options.kernelType[configuration.kernelType]}</dd></div>
        <div><dt>{copy.security}</dt><dd>{t.os.options.permissions[configuration.permissions]}</dd></div>
      </dl>
      <div className="os-preview-boot__progress" aria-hidden="true"><span /></div>
      <span className="os-preview-boot__status">{copy.bootStatus}</span>
      <button className="os-preview-boot__continue" onClick={onContinue} type="button">
        {copy.bootContinue}
      </button>
    </div>
  );
}

function LockScreen({
  configuration,
  copy,
  locale,
  onUnlock,
}: {
  configuration: OsConfiguration;
  copy: PreviewScreensCopy;
  locale: GameState["settings"]["locale"];
  onUnlock: () => void;
}) {
  const t = translations[locale];
  const needsPassword = configuration.permissions !== "none";

  return (
    <div className="os-preview-lock">
      <span className="os-preview-lock__subtitle">{copy.lockSubtitle}</span>
      <time dateTime="09:41">09:41</time>
      <span className="os-preview-lock__date">{copy.lockDate}</span>
      <span className="os-preview-lock__avatar" aria-hidden="true"><MonitorCog size={22} /></span>
      <strong>{copy.lockUser}</strong>
      <span className="os-preview-lock__hint">
        {needsPassword ? copy.lockHint : copy.lockNoPassword}
      </span>
      {needsPassword && (
        <span className="os-preview-lock__dots" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
      )}
      <span className="os-preview-lock__security">
        <ShieldCheck aria-hidden="true" size={12} />
        {t.os.options.permissions[configuration.permissions]}
        {configuration.encryption !== "none" ? ` · ${t.os.options.encryption[configuration.encryption]}` : ""}
      </span>
      <button className="os-preview-lock__unlock" onClick={onUnlock} type="button">
        {copy.unlock}
      </button>
    </div>
  );
}

function SystemWindowView({
  appId,
  configuration,
  locale,
  model,
  onClose,
}: {
  appId: SystemAppId;
  configuration: OsConfiguration;
  locale: GameState["settings"]["locale"];
  model: OsPreviewModel;
  onClose: () => void;
}) {
  const t = translations[locale];
  const copy = t.os.preview.systemApps;
  const app = copy[appId];
  const metrics = calculateOsKernelMetrics(configuration);
  const Icon = SYSTEM_APP_ICONS[appId];
  const stageLabel = model.stage === "development"
    ? t.os.preview.development
    : t.os.releases.stages[model.stage];

  let content;

  if (appId === "settings") {
    const settingsCopy = copy.settings;
    const rows = [
      [settingsCopy.display, t.os.options.gui[configuration.gui]],
      [settingsCopy.network, t.os.options.networkStack[configuration.networkStack]],
      [settingsCopy.storage, t.os.options.filesystem[configuration.filesystem]],
      [settingsCopy.updates, t.os.options.updateModel[configuration.updateModel]],
      [settingsCopy.privacy, t.os.options.permissions[configuration.permissions]],
      [settingsCopy.drivers, t.os.options.driverFramework[configuration.driverFramework]],
    ];
    content = (
      <dl className="os-preview-system__rows">
        {rows.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    );
  } else if (appId === "files") {
    const filesCopy = copy.files;
    content = (
      <div className="os-preview-files">
        <div className="os-preview-files__path">
          <span>{filesCopy.path} / {t.os.options.filesystem[configuration.filesystem]}</span>
          <strong className={configuration.encryption === "none" ? "" : "is-secure"}>
            {configuration.encryption === "none" ? filesCopy.unencrypted : filesCopy.encrypted}
          </strong>
        </div>
        <div className="os-preview-files__grid">
          <div>
            <strong>{filesCopy.foldersLabel}</strong>
            <ul>{filesCopy.folders.map((folder) => <li key={folder}>{folder}</li>)}</ul>
          </div>
          <div>
            <strong>{filesCopy.filesLabel}</strong>
            <ul>{filesCopy.files.map((file) => <li key={file}>{file}</li>)}</ul>
          </div>
        </div>
        <span className="os-preview-files__permissions">
          {filesCopy.permissions}: {t.os.options.permissions[configuration.permissions]}
        </span>
      </div>
    );
  } else if (appId === "task-manager") {
    const taskCopy = copy["task-manager"];
    const processRows = [
      [taskCopy.performance, formatDecimal(metrics.performanceScore, locale, 0)],
      [taskCopy.memory, `${formatDecimal(metrics.memoryFootprintMb, locale, 0)} MB`],
      [taskCopy.processCapacity, String(metrics.processCapacity)],
      [taskCopy.ipc, `${formatDecimal(metrics.ipcLatencyMicroseconds, locale, 1)} µs`],
      [taskCopy.scheduler, t.os.options.scheduler[configuration.scheduler]],
    ];
    content = (
      <div className="os-preview-task">
        <dl className="os-preview-system__rows">
          {processRows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <strong className="os-preview-task__title">{taskCopy.processes}</strong>
        <div className="os-preview-task__list">
          {taskCopy.processList.map((process, index) => (
            <div key={process}>
              <span>{process}</span>
              <span className="os-preview-task__bar"><i style={{ width: `${[48, 26, 16, 10][index] ?? 8}%` }} /></span>
              <em>{[48, 26, 16, 10][index] ?? 8}%</em>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    const updatesCopy = copy.updates;
    const ready = metrics.updateReadinessScore >= 60;
    content = (
      <div className="os-preview-updates">
        <strong className={`os-preview-updates__status${ready ? " is-ready" : ""}`}>
          {ready ? updatesCopy.ready : updatesCopy.current}
        </strong>
        <dl className="os-preview-system__rows">
          <div><dt>{updatesCopy.channel}</dt><dd>{t.os.options.updateModel[configuration.updateModel]}</dd></div>
          <div><dt>{updatesCopy.packages}</dt><dd>{t.os.options.packageManager[configuration.packageManager]}</dd></div>
          <div><dt>{updatesCopy.latency}</dt><dd>{metrics.updateLatencyDays} {t.os.units.days}</dd></div>
          <div><dt>{updatesCopy.stage}</dt><dd>{stageLabel}</dd></div>
        </dl>
        <div className="os-preview-updates__meter" aria-hidden="true">
          <span style={{ width: `${metrics.updateReadinessScore}%` }} />
        </div>
        <strong className="os-preview-task__title">{updatesCopy.historyTitle}</strong>
        <ul className="os-preview-updates__history">
          {updatesCopy.history.map((entry) => <li key={entry}>{entry}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <div
      aria-label={app.name}
      className="os-preview-window os-preview-window--system"
      role="dialog"
    >
      <div className="os-preview-window__bar">
        <span className="os-preview-window__title"><Icon aria-hidden="true" size={14} />{app.name}</span>
        <button aria-label={t.os.preview.close} className="os-preview-icon-button" onClick={onClose} type="button">
          <X aria-hidden="true" size={14} />
        </button>
      </div>
      <div className="os-preview-window__body">
        <span className="os-preview-window__category">{copy.systemCategory}</span>
        <strong className="os-preview-window__status"><span className="os-preview-dot" aria-hidden="true" />{app.title}</strong>
        {content}
      </div>
    </div>
  );
}

function TerminalView({
  appCount,
  bootSeconds,
  copy,
  kernelType,
  locale,
  totalApps,
}: {
  appCount: number;
  bootSeconds: number;
  copy: {
    terminalBoot: string;
    terminalKernel: string;
    terminalApps: string;
    terminalHint: string;
  };
  kernelType: string;
  locale: GameState["settings"]["locale"];
  totalApps: number;
}) {
  return (
    <div className="os-preview-terminal" aria-label={copy.terminalBoot}>
      <div className="os-preview-terminal__bar">
        <span /><span /><span />
        <em>tty1</em>
      </div>
      <div className="os-preview-terminal__body">
        <p><strong>SILICON/DYNASTY</strong> {copy.terminalBoot}</p>
        <p>{copy.terminalKernel}: {kernelType} · boot: {formatDecimal(bootSeconds, locale, 1)} s</p>
        <p>{copy.terminalApps}: {appCount}/{totalApps}</p>
        <p className="os-preview-terminal__hint">{copy.terminalHint}</p>
        <p className="os-preview-terminal__prompt">&gt; <span className="os-preview-caret" aria-hidden="true" /></p>
      </div>
    </div>
  );
}

function AppTile({
  app,
  appName,
  lockedLabel,
  onOpen,
}: {
  app: OsPreviewApp;
  appName: string;
  lockedLabel: string;
  onOpen: () => void;
}) {
  const Icon = APP_ICONS[app.id] ?? AppWindow;

  return (
    <button
      aria-label={`${appName}${app.compatible ? "" : ` — ${lockedLabel}`}`}
      className={`os-preview-app${app.compatible ? "" : " is-locked"}`}
      onClick={onOpen}
      type="button"
    >
      <span className="os-preview-app__icon"><Icon aria-hidden="true" size={18} /></span>
      <span className="os-preview-app__name">{appName}</span>
      {!app.compatible && <Lock aria-hidden="true" className="os-preview-app__lock" size={11} />}
    </button>
  );
}

function AppWindowView({
  app,
  appName,
  category,
  closeLabel,
  copy,
  issues,
  locale,
  onClose,
}: {
  app: OsPreviewApp;
  appName: string;
  category: string;
  closeLabel: string;
  copy: {
    running: string;
    locked: string;
    windowHint: string;
    windowRows: readonly string[];
  };
  issues: string[];
  locale: GameState["settings"]["locale"];
  onClose: () => void;
}) {
  const Icon = APP_ICONS[app.id] ?? AppWindow;

  return (
    <div
      aria-label={appName}
      className={`os-preview-window${app.compatible ? "" : " os-preview-window--locked"}`}
      role="dialog"
    >
      <div className="os-preview-window__bar">
        <span className="os-preview-window__title"><Icon aria-hidden="true" size={14} />{appName}</span>
        <button aria-label={closeLabel} className="os-preview-icon-button" onClick={onClose} type="button">
          <X aria-hidden="true" size={14} />
        </button>
      </div>
      <div className="os-preview-window__body">
        <span className="os-preview-window__category">{category}</span>
        {app.compatible ? (
          <>
            <strong className="os-preview-window__status"><span className="os-preview-dot" aria-hidden="true" />{copy.running}</strong>
            <p>{copy.windowHint}</p>
            <AppWindowContent appId={app.id} fallbackRows={copy.windowRows} locale={locale} />
          </>
        ) : (
          <>
            <strong className="os-preview-window__status os-preview-window__status--locked">
              <Lock aria-hidden="true" size={13} />{copy.locked}
            </strong>
            <ul className="os-preview-window__issues">
              {issues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
