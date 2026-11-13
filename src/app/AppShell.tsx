import { ArrowRight, CalendarDays, Layers3, Menu, MoreHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GameState } from "../game/models/game-state";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { formatGameDate, formatYear } from "../localization/formatters";
import { translations } from "../localization/messages";
import { APP_ICON_SRC, SCREEN_EMBLEMS } from "./art";
import { mobileMoreNavigationItems, mobilePrimaryNavigationItems, navigationItems, type ScreenId } from "./navigation";

interface AppShellProps {
  state: GameState;
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenMenu: () => void;
  announcement: string | null;
  alert: string | null;
  children: ReactNode;
}

export function AppShell({
  state,
  activeScreen,
  onNavigate,
  onOpenMenu,
  announcement,
  alert,
  children,
}: AppShellProps) {
  const t = translations[state.settings.locale];
  const screenCopy = t.screens[activeScreen];
  const year = formatYear(Number(state.gameDate.slice(0, 4)), state.settings.locale);
  const mainRef = useRef<HTMLElement>(null);
  const previousScreen = useRef(activeScreen);
  const isMobileLayout = useMediaQuery("(max-width: 899px)");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreSheetRef = useRef<HTMLDivElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const visibleNavigationItems = isMobileLayout ? mobilePrimaryNavigationItems : navigationItems;
  const isMoreActive = activeScreen === "company" || activeScreen === "settings";

  useFocusTrap(moreSheetRef, {
    enabled: isMoreOpen,
    initialFocusRef: moreCloseRef,
    onEscape: () => setIsMoreOpen(false),
  });

  useEffect(() => {
    if (!isMobileLayout) {
      setIsMoreOpen(false);
    }
  }, [isMobileLayout]);

  useEffect(() => {
    if (previousScreen.current === activeScreen) {
      return;
    }
    previousScreen.current = activeScreen;
    mainRef.current?.focus({ preventScroll: true });
  }, [activeScreen]);

  return (
    <div className="app-root" data-theme={state.settings.theme}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        {t.navigation.skipToContent}
      </a>
      <div className="app-shell">
        <aside className="app-sidebar" aria-label={t.app.name}>
          <div className="sidebar-brand">
            <div className="brand-lockup">
              <img
                alt=""
                aria-hidden="true"
                className="brand-mark brand-mark--logo"
                decoding="async"
                src={APP_ICON_SRC}
              />
              <span className="brand-name">{t.app.name}</span>
            </div>
            <p className="sidebar-tagline">{t.app.tagline}</p>
          </div>

          <nav className="primary-navigation" aria-label={t.navigation.label}>
            {visibleNavigationItems.map(({ id, icon: Icon }) => {
              const isActive = activeScreen === id
                || (id === "cpu" && (activeScreen === "components" || activeScreen === "os" || activeScreen === "ai" || activeScreen === "devices"))
                || (id === "market" && (activeScreen === "finance" || activeScreen === "analytics"));

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
            {isMobileLayout && (
              <button
                aria-controls="mobile-more-sheet"
                aria-expanded={isMoreOpen}
                aria-haspopup="dialog"
                aria-label={t.navigation.more}
                className={`navigation-item${isMoreActive || isMoreOpen ? " is-active" : ""}`}
                onClick={() => setIsMoreOpen(true)}
                type="button"
              >
                <MoreHorizontal aria-hidden="true" size={20} strokeWidth={1.8} />
                <span>{t.navigation.more}</span>
              </button>
            )}
          </nav>

          <button
            aria-label={t.mainMenu.open}
            className="sidebar-menu-button"
            onClick={onOpenMenu}
            type="button"
          >
            <Menu aria-hidden="true" size={18} />
            <span>{t.mainMenu.open}</span>
          </button>

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
              <img
                alt=""
                aria-hidden="true"
                className="brand-mark brand-mark--logo"
                decoding="async"
                src={APP_ICON_SRC}
              />
              <div className="mobile-header__copy">
                <span className="brand-name">{t.app.name}</span>
                <span className="mobile-header__era">{year} · {t.app.era}</span>
              </div>
            </div>
            <div className="mobile-header__actions">
              <time className="mobile-header__year" dateTime={state.gameDate}>
                <CalendarDays aria-hidden="true" size={16} />
                <span className="sr-only">{t.dashboard.gameDate}: </span>
                {year}
              </time>
              <button
                aria-label={t.mainMenu.open}
                className="mobile-menu-button"
                onClick={onOpenMenu}
                type="button"
              >
                <Menu aria-hidden="true" size={20} />
              </button>
            </div>
          </header>

          <main className="main-scroll" id="main-content" ref={mainRef} tabIndex={-1}>
            <div className="page-content mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-10">
              <header className="page-heading">
                <div className="page-heading__main">
                  <img
                    alt=""
                    aria-hidden="true"
                    className="page-heading__emblem"
                    decoding="async"
                    src={SCREEN_EMBLEMS[activeScreen]}
                  />
                  <div>
                    <p className="eyebrow">{screenCopy.eyebrow}</p>
                    <h1>{screenCopy.title}</h1>
                    <p className="page-heading__description">{screenCopy.description}</p>
                  </div>
                </div>
                <div className="page-heading__date">
                  <CalendarDays aria-hidden="true" size={17} />
                  <span>{t.dashboard.gameDate}</span>
                  <strong>{formatGameDate(state.gameDate, state.settings.locale)}</strong>
                </div>
              </header>

              {announcement && (
                <p aria-atomic="true" aria-live="polite" className="inline-feedback" role="status">
                  {announcement}
                </p>
              )}
              {alert && (
                <p aria-atomic="true" aria-live="assertive" className="inline-feedback inline-feedback--error" role="alert">
                  {alert}
                </p>
              )}

              {children}
            </div>
          </main>
        </div>
      </div>

      {isMobileLayout && isMoreOpen && (
        <div
          className="mobile-more-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsMoreOpen(false);
            }
          }}
          role="presentation"
        >
          <section
            aria-labelledby="mobile-more-title"
            aria-modal="true"
            className="mobile-more-sheet"
            id="mobile-more-sheet"
            ref={moreSheetRef}
            role="dialog"
          >
            <header className="mobile-more-sheet__header">
              <div>
                <p className="eyebrow">{t.app.name}</p>
                <h2 id="mobile-more-title">{t.navigation.more}</h2>
              </div>
              <button
                aria-label={t.navigation.close}
                className="mobile-more-sheet__close"
                onClick={() => setIsMoreOpen(false)}
                ref={moreCloseRef}
                type="button"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </header>
            <div className="mobile-more-sheet__list">
              {mobileMoreNavigationItems.map(({ id, icon: Icon }) => (
                <button
                  aria-current={activeScreen === id ? "page" : undefined}
                  className="mobile-more-sheet__item"
                  key={id}
                  onClick={() => {
                    setIsMoreOpen(false);
                    onNavigate(id);
                  }}
                  type="button"
                >
                  <span className="mobile-more-sheet__icon" aria-hidden="true">
                    <Icon size={19} strokeWidth={1.8} />
                  </span>
                  <span>{t.navigation[id]}</span>
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
