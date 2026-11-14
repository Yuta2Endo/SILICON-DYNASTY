import {
  Activity,
  AppWindow,
  ArrowRightLeft,
  BatteryFull,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Code2,
  FileText,
  FolderOpen,
  Gamepad2,
  Globe,
  HardDrive,
  LayoutGrid,
  Lock,
  MonitorCog,
  Palette,
  PanelsTopLeft,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Store,
  Terminal,
  Wifi,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
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

const SYSTEM_APP_IDS = [
  "settings",
  "files",
  "task-manager",
  "updates",
  "security-center",
  "driver-manager",
  "app-store",
  "recovery",
] as const;
type SystemAppId = (typeof SYSTEM_APP_IDS)[number];
type PreviewScreen = "boot" | "lock" | "desktop" | "crash";
type PreviewWindow =
  | { kind: "catalog"; id: string }
  | { kind: "system"; id: SystemAppId };
const PREVIEW_DESKTOP_COUNT = 3;
type PreviewWallpaper = "classic" | "aurora" | "grid";
const PREVIEW_WALLPAPERS: readonly PreviewWallpaper[] = ["classic", "aurora", "grid"];
const INITIAL_DESKTOP_WALLPAPERS: readonly PreviewWallpaper[] = ["classic", "aurora", "grid"];
type PreviewTheme = "dark" | "light";
type PreviewDensity = "comfortable" | "compact";
type PreviewAccent = "blue" | "violet" | "green" | "amber";
interface PreviewAppearance {
  theme: PreviewTheme;
  density: PreviewDensity;
  accent: PreviewAccent;
}
const PREVIEW_THEMES: readonly PreviewTheme[] = ["dark", "light"];
const PREVIEW_DENSITIES: readonly PreviewDensity[] = ["comfortable", "compact"];
const PREVIEW_ACCENTS: readonly PreviewAccent[] = ["blue", "violet", "green", "amber"];
const INITIAL_PREVIEW_APPEARANCE: PreviewAppearance = {
  theme: "dark",
  density: "comfortable",
  accent: "blue",
};
const PREVIEW_ACCENT_COLORS: Record<PreviewAccent, string> = {
  blue: "#3b82f6",
  violet: "#8b5cf6",
  green: "#10b981",
  amber: "#f59e0b",
};
const INITIAL_DESKTOP_WINDOWS: ReadonlyArray<PreviewWindow | null> = Array.from(
  { length: PREVIEW_DESKTOP_COUNT },
  () => null,
);
const SYSTEM_APP_GRID_IDS: readonly SystemAppId[] = SYSTEM_APP_IDS.slice(0, 6);

const SYSTEM_APP_ICONS: Record<SystemAppId, LucideIcon> = {
  settings: Settings,
  files: FolderOpen,
  "task-manager": Activity,
  updates: RefreshCw,
  "security-center": ShieldCheck,
  "driver-manager": Wrench,
  "app-store": Store,
  recovery: RotateCcw,
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
  const [desktopWindows, setDesktopWindows] = useState<Array<PreviewWindow | null>>(
    () => [...INITIAL_DESKTOP_WINDOWS],
  );
  const [activeDesktop, setActiveDesktop] = useState(0);
  const [desktopWallpapers, setDesktopWallpapers] = useState<PreviewWallpaper[]>(
    () => [...INITIAL_DESKTOP_WALLPAPERS],
  );
  const [appearance, setAppearance] = useState<PreviewAppearance>(
    () => ({ ...INITIAL_PREVIEW_APPEARANCE }),
  );
  const activeWindow = desktopWindows[activeDesktop] ?? null;
  const activeWallpaper = desktopWallpapers[activeDesktop] ?? "classic";
  const activeAppId = activeWindow?.kind === "catalog" ? activeWindow.id : null;
  const activeSystemAppId = activeWindow?.kind === "system" ? activeWindow.id : null;
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>("desktop");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isMissionControlOpen, setIsMissionControlOpen] = useState(false);

  function setActiveWindowOnDesktop(window: PreviewWindow | null) {
    setDesktopWindows((current) =>
      current.map((value, index) => (index === activeDesktop ? window : value)),
    );
  }

  function setActiveAppId(appId: string | null) {
    setActiveWindowOnDesktop(appId ? { kind: "catalog", id: appId } : null);
  }

  function setActiveSystemAppId(appId: SystemAppId | null) {
    setActiveWindowOnDesktop(appId ? { kind: "system", id: appId } : null);
  }

  function switchDesktop(index: number) {
    setActiveDesktop(index);
    setIsStartOpen(false);
  }

  function moveWindow(from: number, to: number) {
    if (from === to) {
      return;
    }
    setDesktopWindows((current) => {
      const next = [...current];
      const fromWindow = next[from] ?? null;
      const toWindow = next[to] ?? null;
      next[from] = toWindow;
      next[to] = fromWindow;
      return next;
    });
    setActiveDesktop(to);
  }

  function setDesktopWallpaper(index: number, wallpaper: PreviewWallpaper) {
    setDesktopWallpapers((current) =>
      current.map((value, desktop) => (desktop === index ? wallpaper : value)),
    );
  }

  function updateAppearance(patch: Partial<PreviewAppearance>) {
    setAppearance((current) => ({ ...current, ...patch }));
  }

  const openWindows = desktopWindows.flatMap((window, desktop) =>
    window ? [{ desktop, window }] : [],
  );
  const previewMetrics = calculateOsKernelMetrics(previewConfiguration);
  const notifications = buildPreviewNotifications({
    compatibleApps: model.compatibleApps,
    configuration: previewConfiguration,
    copy: copy.notifications,
    securityScore: previewMetrics.securityScore,
    totalApps: model.totalApps,
    updateReadinessScore: previewMetrics.updateReadinessScore,
  });
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
    setDesktopWindows([...INITIAL_DESKTOP_WINDOWS]);
    setDesktopWallpapers([...INITIAL_DESKTOP_WALLPAPERS]);
    setAppearance({ ...INITIAL_PREVIEW_APPEARANCE });
    setActiveDesktop(0);
    setIsStartOpen(false);
    setIsNotificationsOpen(false);
    setIsQuickSettingsOpen(false);
    setIsMissionControlOpen(false);
    setPreviewScreen("boot");
  }

  useEffect(() => {
    setDesktopWindows([...INITIAL_DESKTOP_WINDOWS]);
    setDesktopWallpapers([...INITIAL_DESKTOP_WALLPAPERS]);
    setAppearance({ ...INITIAL_PREVIEW_APPEARANCE });
    setActiveDesktop(0);
    setIsStartOpen(false);
    setIsNotificationsOpen(false);
    setIsQuickSettingsOpen(false);
    setIsMissionControlOpen(false);
    setPreviewScreen("desktop");
  }, [selectedReleaseId]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setIsStartOpen(false);
      setIsNotificationsOpen(false);
      setIsQuickSettingsOpen(false);
      setIsMissionControlOpen(false);
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
          <div
            className={`os-preview-screen os-preview-screen--${model.shell} os-preview-screen--${model.accent} os-preview-screen--theme-${appearance.theme} os-preview-screen--density-${appearance.density}`}
            data-accent={appearance.accent}
            data-wallpaper={activeWallpaper}
            style={{ "--os-preview-accent": PREVIEW_ACCENT_COLORS[appearance.accent] } as CSSProperties}
          >
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
            ) : previewScreen === "crash" ? (
              <CrashScreen
                configuration={previewConfiguration}
                copy={copy.screens}
                locale={locale}
                onRestart={() => setPreviewScreen("boot")}
              />
            ) : (
              <>
                <div className="os-preview-topbar">
                  <span className="os-preview-brand"><MonitorCog aria-hidden="true" size={13} />SILICON OS</span>
                  <span
                    aria-label={copy.missionControl.desktops}
                    className="os-preview-desktops"
                    role="group"
                  >
                    {desktopWindows.map((window, index) => (
                      <button
                        aria-label={copy.missionControl.desktop.replace("{number}", String(index + 1))}
                        aria-pressed={activeDesktop === index}
                        className={`os-preview-desktop-dot${activeDesktop === index ? " is-active" : ""}${window ? " has-window" : ""}`}
                        key={index}
                        onClick={() => switchDesktop(index)}
                        type="button"
                      >
                        {index + 1}
                      </button>
                    ))}
                  </span>
                  <span className="os-preview-search"><Search aria-hidden="true" size={12} />{copy.search}</span>
                  <span className="os-preview-status">
                    <button
                      aria-expanded={isMissionControlOpen}
                      aria-label={copy.missionControl.open}
                      className="os-preview-mission-toggle"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        setIsQuickSettingsOpen(false);
                        setIsMissionControlOpen((open) => !open);
                      }}
                      type="button"
                    >
                      <PanelsTopLeft aria-hidden="true" size={12} />
                    </button>
                    <button
                      aria-expanded={isQuickSettingsOpen}
                      aria-label={copy.quickSettings.open}
                      className="os-preview-quick-toggle"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        setIsMissionControlOpen(false);
                        setIsQuickSettingsOpen((open) => !open);
                      }}
                      type="button"
                    >
                      <SlidersHorizontal aria-hidden="true" size={12} />
                    </button>
                    <button
                      aria-expanded={isNotificationsOpen}
                      aria-label={copy.notifications.open}
                      className="os-preview-bell"
                      onClick={() => {
                        setIsQuickSettingsOpen(false);
                        setIsMissionControlOpen(false);
                        setIsNotificationsOpen((open) => !open);
                      }}
                      type="button"
                    >
                      <Bell aria-hidden="true" size={12} />
                      {notifications.length > 0 && (
                        <span className="os-preview-bell__count">{notifications.length}</span>
                      )}
                    </button>
                    <Wifi aria-hidden="true" size={13} />
                    <BatteryFull aria-hidden="true" size={14} />
                    <time dateTime="09:41">09:41</time>
                  </span>
                </div>

                {isNotificationsOpen && (
                  <div
                    aria-label={copy.notifications.title}
                    className="os-preview-notifications"
                    role="dialog"
                  >
                    <div className="os-preview-notifications__header">
                      <span>{copy.notifications.title}</span>
                      <button
                        aria-label={copy.notifications.close}
                        className="os-preview-icon-button"
                        onClick={() => setIsNotificationsOpen(false)}
                        type="button"
                      >
                        <X aria-hidden="true" size={13} />
                      </button>
                    </div>
                    <ul className="os-preview-notifications__list">
                      {notifications.map((notification) => (
                        <li
                          className={`os-preview-notification os-preview-notification--${notification.severity}`}
                          key={notification.id}
                        >
                          <span className="os-preview-notification__dot" aria-hidden="true" />
                          <div>
                            <strong>{notification.title}</strong>
                            <p>{notification.body}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isQuickSettingsOpen && (
                  <div
                    aria-label={copy.quickSettings.title}
                    className="os-preview-quick-settings"
                    role="dialog"
                  >
                    <div className="os-preview-quick-settings__header">
                      <span>{copy.quickSettings.title}</span>
                      <button
                        aria-label={copy.quickSettings.close}
                        className="os-preview-icon-button"
                        onClick={() => setIsQuickSettingsOpen(false)}
                        type="button"
                      >
                        <X aria-hidden="true" size={13} />
                      </button>
                    </div>
                    <div className="os-preview-quick-settings__grid">
                      {[
                        { icon: Wifi, key: "network", value: t.os.options.networkStack[previewConfiguration.networkStack] },
                        { icon: ShieldCheck, key: "security", value: t.os.options.permissions[previewConfiguration.permissions] },
                        { icon: RefreshCw, key: "updates", value: t.os.options.updateModel[previewConfiguration.updateModel] },
                        { icon: HardDrive, key: "storage", value: t.os.options.filesystem[previewConfiguration.filesystem] },
                        { icon: Store, key: "store", value: t.os.options.appStore[previewConfiguration.appStore] },
                        { icon: Wrench, key: "drivers", value: t.os.options.driverFramework[previewConfiguration.driverFramework] },
                      ].map(({ icon: Icon, key, value }) => (
                        <div className="os-preview-quick-settings__tile" key={key}>
                          <Icon aria-hidden="true" size={13} />
                          <span>{copy.quickSettings[key as keyof typeof copy.quickSettings]}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isMissionControlOpen && (
                  <div
                    aria-label={copy.missionControl.title}
                    className="os-preview-mission"
                    role="dialog"
                  >
                    <div className="os-preview-mission__header">
                      <div>
                        <strong>{copy.missionControl.title}</strong>
                        <span>{copy.missionControl.hint}</span>
                      </div>
                      <button
                        aria-label={copy.missionControl.close}
                        className="os-preview-icon-button"
                        onClick={() => setIsMissionControlOpen(false)}
                        type="button"
                      >
                        <X aria-hidden="true" size={13} />
                      </button>
                    </div>
                    <div className="os-preview-mission__summary">
                      <span>
                        {copy.missionControl.windows}: {openWindows.length}
                      </span>
                      <button
                        className="os-preview-mission__minimize"
                        disabled={openWindows.length === 0}
                        onClick={() => setDesktopWindows([...INITIAL_DESKTOP_WINDOWS])}
                        type="button"
                      >
                        {copy.missionControl.minimizeAll}
                      </button>
                    </div>
                    <div
                      aria-label={copy.missionControl.desktops}
                      className="os-preview-mission__desktops"
                      role="group"
                    >
                      {desktopWindows.map((window, index) => (
                        <button
                          aria-label={`${copy.missionControl.desktop.replace("{number}", String(index + 1))} · ${window ? copy.missionControl.opened : copy.missionControl.empty}`}
                          aria-pressed={activeDesktop === index}
                          className={`os-preview-mission__desktop os-preview-mission__desktop--wallpaper-${desktopWallpapers[index]}${activeDesktop === index ? " is-active" : ""}${window ? " has-window" : ""}`}
                          key={index}
                          onClick={() => switchDesktop(index)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const from = Number(event.dataTransfer.getData("text/plain"));
                            if (Number.isInteger(from) && from >= 0 && from < desktopWindows.length) {
                              moveWindow(from, index);
                            }
                          }}
                          type="button"
                        >
                          <PanelsTopLeft aria-hidden="true" size={13} />
                          <strong>{index + 1}</strong>
                          <small>{window ? copy.missionControl.opened : copy.missionControl.empty}</small>
                        </button>
                      ))}
                    </div>
                    <div className="os-preview-mission__wallpapers">
                      <span className="os-preview-mission__wallpaper-label">
                        <Palette aria-hidden="true" size={11} />
                        {copy.missionControl.wallpaper}
                      </span>
                      <div
                        aria-label={copy.missionControl.wallpaper}
                        className="os-preview-mission__wallpaper-options"
                        role="group"
                      >
                        {PREVIEW_WALLPAPERS.map((wallpaper) => (
                          <button
                            aria-pressed={activeWallpaper === wallpaper}
                            className={`os-preview-mission__wallpaper os-preview-mission__wallpaper--${wallpaper}${activeWallpaper === wallpaper ? " is-active" : ""}`}
                            key={wallpaper}
                            onClick={() => setDesktopWallpaper(activeDesktop, wallpaper)}
                            type="button"
                          >
                            <span aria-hidden="true" className="os-preview-mission__wallpaper-swatch" />
                            {copy.missionControl.wallpapers[wallpaper]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="os-preview-mission__move-hint">
                      <ArrowRightLeft aria-hidden="true" size={11} />
                      {copy.missionControl.moveHint}
                    </p>
                    <div className="os-preview-mission__windows">
                      {openWindows.length > 0 ? (
                        openWindows.map(({ desktop, window }) => {
                          const Icon = window.kind === "catalog"
                            ? APP_ICONS[window.id] ?? AppWindow
                            : SYSTEM_APP_ICONS[window.id];
                          const catalogApp = window.kind === "catalog"
                            ? model.apps.find((candidate) => candidate.id === window.id) ?? null
                            : null;
                          const name = window.kind === "catalog"
                            ? appCopy.names[window.id as keyof typeof appCopy.names] ?? window.id
                            : systemAppCopy[window.id].title;
                          const meta = window.kind === "catalog"
                            ? catalogApp
                              ? appCopy.categories[catalogApp.category as keyof typeof appCopy.categories]
                              : copy.missionControl.system
                            : copy.missionControl.system;
                          return (
                            <article
                              className={`os-preview-mission__window${desktop === activeDesktop ? " is-active" : ""}`}
                              draggable
                              key={`${desktop}-${window.kind}-${window.id}`}
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", String(desktop));
                              }}
                            >
                              <span className="os-preview-mission__window-icon"><Icon aria-hidden="true" size={20} /></span>
                              <span className="os-preview-mission__window-copy">
                                <strong>{name}</strong>
                                <small>
                                  {copy.missionControl.desktop.replace("{number}", String(desktop + 1))}
                                  {" · "}
                                  {meta}
                                </small>
                              </span>
                              <div className="os-preview-mission__window-actions">
                                <button
                                  className="os-preview-mission__window-open"
                                  onClick={() => {
                                    setActiveDesktop(desktop);
                                    setIsMissionControlOpen(false);
                                  }}
                                  type="button"
                                >
                                  {copy.missionControl.opened}
                                </button>
                                <span className="os-preview-mission__window-moves">
                                  {desktopWindows.map((_, target) =>
                                    target === desktop ? null : (
                                      <button
                                        aria-label={`${copy.missionControl.moveTo} ${copy.missionControl.desktop.replace("{number}", String(target + 1))}`}
                                        className="os-preview-mission__window-move"
                                        key={target}
                                        onClick={() => moveWindow(desktop, target)}
                                        type="button"
                                      >
                                        {target + 1}
                                      </button>
                                    ),
                                  )}
                                </span>
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <div className="os-preview-mission__empty">
                          <PanelsTopLeft aria-hidden="true" size={24} />
                          <strong>{copy.missionControl.empty}</strong>
                          <span>{copy.missionControl.emptyHint}</span>
                        </div>
                      )}
                    </div>
                    <strong className="os-preview-mission__launch-title">{copy.missionControl.quickLaunch}</strong>
                    <div className="os-preview-mission__launch">
                      {model.apps.map((app) => {
                        const Icon = APP_ICONS[app.id] ?? AppWindow;
                        return (
                          <button
                            className={`os-preview-mission__launch-app${app.compatible ? "" : " is-locked"}`}
                            key={app.id}
                            onClick={() => {
                              setActiveSystemAppId(null);
                              setActiveAppId(app.id);
                              setIsMissionControlOpen(false);
                            }}
                            type="button"
                          >
                            <Icon aria-hidden="true" size={14} />
                            <span>{appCopy.names[app.id as keyof typeof appCopy.names] ?? app.id}</span>
                          </button>
                        );
                      })}
                      {SYSTEM_APP_IDS.map((appId) => {
                        const Icon = SYSTEM_APP_ICONS[appId];
                        return (
                          <button
                            className="os-preview-mission__launch-app os-preview-mission__launch-app--system"
                            key={appId}
                            onClick={() => {
                              setActiveAppId(null);
                              setActiveSystemAppId(appId);
                              setIsMissionControlOpen(false);
                            }}
                            type="button"
                          >
                            <Icon aria-hidden="true" size={14} />
                            <span>{systemAppCopy[appId].name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className={`os-preview-desktop-area os-preview-desktop-area--wallpaper-${activeWallpaper}`}>
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
                    {SYSTEM_APP_GRID_IDS.map((appId) => {
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
                      appearance={appearance}
                      configuration={previewConfiguration}
                      key={`${activeDesktop}-system-${activeSystemAppId}`}
                      locale={locale}
                      model={model}
                      onAppearanceChange={updateAppearance}
                      onClose={() => setActiveSystemAppId(null)}
                      onCrash={() => {
                        setActiveAppId(null);
                        setActiveSystemAppId(null);
                        setIsStartOpen(false);
                        setPreviewScreen("crash");
                      }}
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
                      key={`${activeDesktop}-catalog-${activeApp.id}`}
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

type PreviewNotificationsCopy = TranslationMessages["os"]["preview"]["notifications"];

interface PreviewNotification {
  id: string;
  severity: "info" | "warning";
  title: string;
  body: string;
}

function buildPreviewNotifications({
  compatibleApps,
  configuration,
  copy,
  securityScore,
  totalApps,
  updateReadinessScore,
}: {
  compatibleApps: number;
  configuration: OsConfiguration;
  copy: PreviewNotificationsCopy;
  securityScore: number;
  totalApps: number;
  updateReadinessScore: number;
}): PreviewNotification[] {
  const notifications: PreviewNotification[] = [];

  if (configuration.permissions === "none" || securityScore < 45) {
    notifications.push({
      id: "security",
      severity: "warning",
      title: copy.securityTitle,
      body: copy.securityBody,
    });
  }
  if (updateReadinessScore < 60) {
    notifications.push({
      id: "updates",
      severity: "warning",
      title: copy.updatesTitle,
      body: copy.updatesBody,
    });
  }
  if (compatibleApps < totalApps) {
    notifications.push({
      id: "apps",
      severity: "info",
      title: copy.appsTitle,
      body: copy.appsBody
        .replace("{compatible}", String(compatibleApps))
        .replace("{total}", String(totalApps)),
    });
  }
  if (configuration.driverFramework === "legacy" || configuration.driverFramework === "acpi") {
    notifications.push({
      id: "drivers",
      severity: "info",
      title: copy.driversTitle,
      body: copy.driversBody,
    });
  }
  if (configuration.appStore === "none") {
    notifications.push({
      id: "store",
      severity: "info",
      title: copy.storeTitle,
      body: copy.storeBody,
    });
  }
  if (notifications.length === 0) {
    notifications.push({
      id: "healthy",
      severity: "info",
      title: copy.allGoodTitle,
      body: copy.allGoodBody,
    });
  }

  return notifications.slice(0, 4);
}

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

function CrashScreen({
  configuration,
  copy,
  locale,
  onRestart,
}: {
  configuration: OsConfiguration;
  copy: PreviewScreensCopy;
  locale: GameState["settings"]["locale"];
  onRestart: () => void;
}) {
  const t = translations[locale];
  const stopCode = `KERNEL_PANIC_${configuration.kernelType.toUpperCase()}`;

  return (
    <div className="os-preview-crash">
      <span className="os-preview-crash__face" aria-hidden="true">:(</span>
      <span className="os-preview-crash__badge">{copy.crashBadge}</span>
      <strong>{copy.crashTitle}</strong>
      <p>{copy.crashSubtitle}</p>
      <dl className="os-preview-crash__rows">
        <div><dt>{copy.crashStopCode}</dt><dd>{stopCode}</dd></div>
        <div><dt>{copy.kernel}</dt><dd>{t.os.options.kernelType[configuration.kernelType]}</dd></div>
        <div><dt>{copy.crashFilesystem}</dt><dd>{t.os.options.filesystem[configuration.filesystem]}</dd></div>
      </dl>
      <span className="os-preview-crash__dump">{copy.crashDump}</span>
      <span className="os-preview-crash__hint">{copy.crashHint}</span>
      <button className="os-preview-crash__restart" onClick={onRestart} type="button">
        {copy.crashRestart}
      </button>
    </div>
  );
}

function SystemWindowView({
  appId,
  appearance,
  configuration,
  locale,
  model,
  onAppearanceChange,
  onClose,
  onCrash,
}: {
  appId: SystemAppId;
  appearance: PreviewAppearance;
  configuration: OsConfiguration;
  locale: GameState["settings"]["locale"];
  model: OsPreviewModel;
  onAppearanceChange: (patch: Partial<PreviewAppearance>) => void;
  onClose: () => void;
  onCrash: () => void;
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
      <>
        <div className="os-preview-appearance" aria-label={settingsCopy.appearance}>
          <strong className="os-preview-appearance__title">{settingsCopy.appearance}</strong>
          <div className="os-preview-appearance__row">
            <span>{settingsCopy.theme}</span>
            <div className="os-preview-appearance__options" role="group" aria-label={settingsCopy.theme}>
              {PREVIEW_THEMES.map((theme) => (
                <button
                  aria-pressed={appearance.theme === theme}
                  className={`os-preview-appearance__option${appearance.theme === theme ? " is-active" : ""}`}
                  key={theme}
                  onClick={() => onAppearanceChange({ theme })}
                  type="button"
                >
                  {settingsCopy.themes[theme]}
                </button>
              ))}
            </div>
          </div>
          <div className="os-preview-appearance__row">
            <span>{settingsCopy.density}</span>
            <div className="os-preview-appearance__options" role="group" aria-label={settingsCopy.density}>
              {PREVIEW_DENSITIES.map((density) => (
                <button
                  aria-pressed={appearance.density === density}
                  className={`os-preview-appearance__option${appearance.density === density ? " is-active" : ""}`}
                  key={density}
                  onClick={() => onAppearanceChange({ density })}
                  type="button"
                >
                  {settingsCopy.densities[density]}
                </button>
              ))}
            </div>
          </div>
          <div className="os-preview-appearance__row">
            <span>{settingsCopy.accent}</span>
            <div className="os-preview-appearance__options" role="group" aria-label={settingsCopy.accent}>
              {PREVIEW_ACCENTS.map((accent) => (
                <button
                  aria-label={settingsCopy.accents[accent]}
                  aria-pressed={appearance.accent === accent}
                  className={`os-preview-appearance__accent os-preview-appearance__accent--${accent}${appearance.accent === accent ? " is-active" : ""}`}
                  key={accent}
                  onClick={() => onAppearanceChange({ accent })}
                  title={settingsCopy.accents[accent]}
                  type="button"
                >
                  <span aria-hidden="true" className="os-preview-appearance__swatch" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <dl className="os-preview-system__rows">
          {rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </>
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
  } else if (appId === "updates") {
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
  } else if (appId === "security-center") {
    const securityCopy = copy["security-center"];
    const checks = [
      [securityCopy.permissions, configuration.permissions !== "none"],
      [securityCopy.encryption, configuration.encryption !== "none"],
      [securityCopy.updates, configuration.updateModel !== "manual"],
      [securityCopy.packages, configuration.packageManager !== "none"],
      [securityCopy.drivers, configuration.driverFramework === "unified" || configuration.driverFramework === "certified"],
    ] as const;
    const protectedCount = checks.filter(([, enabled]) => enabled).length;
    content = (
      <div className="os-preview-security">
        <div className="os-preview-security__score">
          <span>{securityCopy.score}</span>
          <strong>{formatDecimal(metrics.securityScore, locale, 0)}</strong>
          <em>{protectedCount}/{checks.length}</em>
        </div>
        <div className="os-preview-security__checks">
          {checks.map(([label, enabled]) => (
            <span className={enabled ? "is-ok" : "is-warn"} key={label}>
              <ShieldCheck aria-hidden="true" size={12} />
              {label}
              <em>{enabled ? securityCopy.active : securityCopy.missing}</em>
            </span>
          ))}
        </div>
        <dl className="os-preview-system__rows">
          <div><dt>{securityCopy.permissions}</dt><dd>{t.os.options.permissions[configuration.permissions]}</dd></div>
          <div><dt>{securityCopy.encryption}</dt><dd>{t.os.options.encryption[configuration.encryption]}</dd></div>
          <div><dt>{securityCopy.updates}</dt><dd>{t.os.options.updateModel[configuration.updateModel]}</dd></div>
        </dl>
      </div>
    );
  } else if (appId === "driver-manager") {
    const driverCopy = copy["driver-manager"];
    const driverLevel = { legacy: 0, acpi: 1, unified: 2, certified: 3 }[configuration.driverFramework];
    const hardware = [
      [driverCopy.sata, driverLevel >= 1],
      [driverCopy.nvme, driverLevel >= 2],
      [driverCopy.pcie4, driverLevel >= 2],
      [driverCopy.pcie5, driverLevel >= 3],
      [driverCopy.aiLink, driverLevel >= 3],
      [driverCopy.fiber, configuration.networkStack !== "basic"],
      [driverCopy.infiniband, configuration.networkStack === "advanced" || configuration.networkStack === "cloud"],
    ] as const;
    content = (
      <div className="os-preview-drivers">
        <dl className="os-preview-system__rows">
          <div><dt>{driverCopy.framework}</dt><dd>{t.os.options.driverFramework[configuration.driverFramework]}</dd></div>
          <div><dt>{driverCopy.driverModel}</dt><dd>{t.os.options.driverModel[configuration.driverModel]}</dd></div>
          <div><dt>{driverCopy.modules}</dt><dd>{t.os.options.moduleSupport[configuration.moduleSupport]}</dd></div>
          <div><dt>{driverCopy.architecture}</dt><dd>{configuration.supportedArchitectures.join(" · ")}</dd></div>
        </dl>
        <strong className="os-preview-task__title">{driverCopy.hardwareTitle}</strong>
        <ul className="os-preview-drivers__list">
          {hardware.map(([label, available]) => (
            <li className={available ? "is-ok" : "is-warn"} key={label}>
              <Wrench aria-hidden="true" size={11} />
              <span>{label}</span>
              <em>{available ? driverCopy.available : driverCopy.required}</em>
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (appId === "app-store") {
    const storeCopy = copy["app-store"];
    const appNames = t.os.applications.names;
    const appCategories = t.os.applications.categories;
    content = (
      <div className="os-preview-store">
        <div className={`os-preview-store__banner${configuration.appStore === "none" ? " is-warn" : ""}`}>
          <Store aria-hidden="true" size={13} />
          <span>{configuration.appStore === "none" ? storeCopy.noStore : storeCopy.connected}</span>
          <strong>{t.os.options.appStore[configuration.appStore]}</strong>
        </div>
        <dl className="os-preview-system__rows">
          <div><dt>{storeCopy.storeType}</dt><dd>{t.os.options.appStore[configuration.appStore]}</dd></div>
          <div><dt>{storeCopy.sdk}</dt><dd>{t.os.options.sdk[configuration.sdk]}</dd></div>
          <div><dt>{storeCopy.api}</dt><dd>{t.os.options.api[configuration.api]}</dd></div>
          <div><dt>{storeCopy.compatible}</dt><dd>{model.compatibleApps}/{model.totalApps}</dd></div>
        </dl>
        <div className="os-preview-store__grid">
          {model.apps.map((app) => (
            <div className={`os-preview-store__card${app.compatible ? "" : " is-locked"}`} key={app.id}>
              <span>{appNames[app.id as keyof typeof appNames] ?? app.id}</span>
              <em>{appCategories[app.category as keyof typeof appCategories] ?? app.category}</em>
              <strong>{app.compatible ? storeCopy.available : storeCopy.requires}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    const recoveryCopy = copy.recovery;
    content = (
      <div className="os-preview-recovery">
        <strong className="os-preview-updates__status is-ready">{recoveryCopy.status}</strong>
        <dl className="os-preview-system__rows">
          <div><dt>{recoveryCopy.bootloader}</dt><dd>{t.os.options.bootloader[configuration.bootloader]}</dd></div>
          <div><dt>{recoveryCopy.filesystem}</dt><dd>{t.os.options.filesystem[configuration.filesystem]}</dd></div>
          <div><dt>{recoveryCopy.encryption}</dt><dd>{t.os.options.encryption[configuration.encryption]}</dd></div>
          <div><dt>{recoveryCopy.updates}</dt><dd>{t.os.options.updateModel[configuration.updateModel]}</dd></div>
          <div><dt>{recoveryCopy.packages}</dt><dd>{t.os.options.packageManager[configuration.packageManager]}</dd></div>
        </dl>
        <strong className="os-preview-task__title">{recoveryCopy.points}</strong>
        <ul className="os-preview-recovery__points">
          <li><RotateCcw aria-hidden="true" size={11} /><span>{recoveryCopy.current}</span><em>v{model.versionLabel}</em></li>
          <li><ShieldCheck aria-hidden="true" size={11} /><span>{recoveryCopy.safeMode}</span><em>{recoveryCopy.available}</em></li>
          <li><FolderOpen aria-hidden="true" size={11} /><span>{recoveryCopy.recoveryMedia}</span><em>{recoveryCopy.available}</em></li>
        </ul>
        <div className="os-preview-recovery__integrity">
          <span>{recoveryCopy.integrity}</span>
          <strong>{formatDecimal(metrics.dataIntegrityScore, locale, 0)}</strong>
        </div>
        <button className="os-preview-recovery__crash" onClick={onCrash} type="button">
          {recoveryCopy.simulateCrash}
        </button>
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
