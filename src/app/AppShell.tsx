import { ArrowRight, CalendarDays, Layers3 } from "lucide-react";
import type { ReactNode } from "react";
import type { GameState } from "../game/models/game-state";
import { formatGameDate, formatYear } from "../localization/formatters";
import { translations } from "../localization/messages";
import { navigationItems, type ScreenId } from "./navigation";

interface AppShellProps {
  state: GameState;
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  announcement: string | null;
  alert: string | null;
  children: ReactNode;
}

export function AppShell({
  state,
  activeScreen,
  onNavigate,
  announcement,
  alert,
  children,
}: AppShellProps) {
  const t = translations[state.settings.locale];
  const screenCopy = t.screens[activeScreen];
  const year = formatYear(Number(state.gameDate.slice(0, 4)), state.settings.locale);

  return (
    <div className="app-root" data-theme={state.settings.theme}>
      <div className="app-shell">
        <aside className="app-sidebar" aria-label={t.app.name}>
          <div className="sidebar-brand">
            <div className="brand-lockup">
              <span className="brand-mark" aria-hidden="true">SD</span>
              <span className="brand-name">{t.app.name}</span>
            </div>
            <p className="sidebar-tagline">{t.app.tagline}</p>
          </div>

          <nav className="primary-navigation" aria-label={t.navigation.label}>
            {navigationItems.map(({ id, icon: Icon }) => {
              const isActive = activeScreen === id
                || (id === "cpu" && (activeScreen === "components" || activeScreen === "os" || activeScreen === "ai"))
                || (id === "market" && activeScreen === "finance");

              return (
                <button
                  aria-current={isActive ? "page" : undefined}
                  aria-label={t.navigation[id]}
                  className={`navigation-item${isActive ? " is-active" : ""}`}
                  key={id}
                  onClick={() => onNavigate(id)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
                  <span>{t.navigation[id]}</span>
                  {isActive && <ArrowRight aria-hidden="true" className="navigation-item__arrow" size={15} />}
                </button>
              );
            })}
          </nav>

          <div className="sidebar-era">
            <span className="sidebar-era__icon" aria-hidden="true"><Layers3 size={16} /></span>
            <div>
              <span className="sidebar-era__label">{t.app.era}</span>
              <strong>{year}</strong>
            </div>
          </div>
        </aside>

        <div className="app-main-column">
          <header className="mobile-header">
            <div className="brand-lockup">
              <span className="brand-mark" aria-hidden="true">SD</span>
              <div className="mobile-header__copy">
                <span className="brand-name">{t.app.name}</span>
                <span className="mobile-header__era">{year} · {t.app.era}</span>
              </div>
            </div>
            <time className="mobile-header__year" dateTime={state.gameDate}>
              <CalendarDays aria-hidden="true" size={16} />
              <span className="sr-only">{t.dashboard.gameDate}: </span>
              {year}
            </time>
          </header>

          <main className="main-scroll">
            <div className="page-content mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-10">
              <header className="page-heading">
                <div>
                  <p className="eyebrow">{screenCopy.eyebrow}</p>
                  <h1>{screenCopy.title}</h1>
                  <p className="page-heading__description">{screenCopy.description}</p>
                </div>
                <div className="page-heading__date">
                  <CalendarDays aria-hidden="true" size={17} />
                  <span>{t.dashboard.gameDate}</span>
                  <strong>{formatGameDate(state.gameDate, state.settings.locale)}</strong>
                </div>
              </header>

              {announcement && (
                <p className="inline-feedback" role="status">
                  {announcement}
                </p>
              )}
              {alert && (
                <p className="inline-feedback inline-feedback--error" role="alert">
                  {alert}
                </p>
              )}

              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
