import {
  AppWindow,
  BatteryFull,
  Boxes,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Code2,
  FileText,
  Gamepad2,
  Globe,
  LayoutGrid,
  Lock,
  MonitorCog,
  Search,
  Server,
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
  type OsPreviewShell,
} from "../../game/models/os-preview";
import { formatDecimal } from "../../localization/formatters";
import { translations } from "../../localization/messages";

const APP_ICONS: Record<string, LucideIcon> = {
  notes: FileText,
  "web-browser": Globe,
  "office-suite": BriefcaseBusiness,
  "developer-studio": Code2,
  "game-runtime": Gamepad2,
  "enterprise-console": Building2,
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
  const model = buildOsPreviewModel(configuration, project);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const activeApp = model.apps.find((app) => app.id === activeAppId) ?? null;
  const DeviceIcon = DEVICE_ICONS[model.device];
  const ShellIcon = SHELL_ICONS[model.shell];
  const stageLabel = model.stage === "development"
    ? copy.development
    : t.os.releases.stages[model.stage];
  const nextHint = model.nextShell
    ? copy.nextHints[model.shell]
    : copy.maxLevel;

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setIsStartOpen(false);
      setActiveAppId(null);
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
        </div>
      </header>

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
                          setActiveAppId(app.id);
                        }}
                      />
                    ))}
                  </div>

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
            <div className="os-preview-window__rows" aria-hidden="true">
              {copy.windowRows.map((row) => <span key={row}>{row}</span>)}
            </div>
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
