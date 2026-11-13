import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Cpu,
  Layers3,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ConfirmationBottomSheet } from "../../components/ConfirmationBottomSheet";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { GameState } from "../../game/models/game-state";
import { formatCurrency, formatGameDate, formatYear } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface MainMenuProps {
  state: GameState;
  isSaving: boolean;
  error: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onSettings: () => void;
}

export function MainMenu({
  state,
  isSaving,
  error,
  onContinue,
  onNewGame,
  onSettings,
}: MainMenuProps) {
  const t = translations[state.settings.locale];
  const copy = t.mainMenu;
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const [isConfirmingNewGame, setIsConfirmingNewGame] = useState(false);
  const year = formatYear(Number(state.gameDate.slice(0, 4)), state.settings.locale);

  useEffect(() => {
    continueButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isConfirmingNewGame) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onContinue();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConfirmingNewGame, onContinue]);

  return (
    <div className="app-root main-menu-root" data-theme={state.settings.theme}>
      <div
        aria-labelledby="main-menu-title"
        aria-modal="true"
        className="main-menu"
        role="dialog"
      >
        <div className="main-menu__shell">
          <header className="main-menu__brand">
            <span className="brand-mark brand-mark--menu" aria-hidden="true">SD</span>
            <div className="main-menu__brand-copy">
              <p className="main-menu__eyebrow">{copy.eyebrow}</p>
              <p className="main-menu__wordmark" id="main-menu-title">
                SILICON <span>DYNASTY</span>
              </p>
            </div>
            <span className="main-menu__autosave">
              <span aria-hidden="true" />
              {copy.autosave}
            </span>
          </header>

          <div className="main-menu__content">
            <section className="main-menu__hero">
              <span className="main-menu__kicker">
                <Sparkles aria-hidden="true" size={15} />
                {copy.featuresTitle}
              </span>
              <h2>{copy.headline}</h2>
              <p>{copy.description}</p>
              <ul className="main-menu__features">
                <li>
                  <span className="main-menu__feature-icon" aria-hidden="true"><Cpu size={18} /></span>
                  <span>{copy.featureStack}</span>
                </li>
                <li>
                  <span className="main-menu__feature-icon" aria-hidden="true"><TrendingUp size={18} /></span>
                  <span>{copy.featureMarket}</span>
                </li>
                <li>
                  <span className="main-menu__feature-icon" aria-hidden="true"><Layers3 size={18} /></span>
                  <span>{copy.featureLegacy}</span>
                </li>
              </ul>
            </section>

            <Card className="main-menu__savecard" aria-label={copy.continueTitle}>
              <div className="main-menu__savecard-heading">
                <span className="main-menu__savecard-icon" aria-hidden="true">
                  <Building2 size={20} />
                </span>
                <div>
                  <p>{copy.continueTitle}</p>
                  <h3>{state.company.name}</h3>
                </div>
              </div>

              <dl className="main-menu__summary">
                <div>
                  <dt><CalendarDays aria-hidden="true" size={14} /> {copy.summaryDate}</dt>
                  <dd>{formatGameDate(state.gameDate, state.settings.locale)}</dd>
                </div>
                <div>
                  <dt><CircleDollarSign aria-hidden="true" size={14} /> {copy.summaryBalance}</dt>
                  <dd className="tabular-nums">{formatCurrency(state.company.balance, state.settings.locale)}</dd>
                </div>
                <div>
                  <dt><Layers3 aria-hidden="true" size={14} /> {copy.summaryEra}</dt>
                  <dd className="tabular-nums">{year} · {t.app.era}</dd>
                </div>
              </dl>

              <div className="main-menu__actions">
                <Button
                  className="main-menu__continue"
                  disabled={isSaving}
                  leadingIcon={<Play aria-hidden="true" size={17} />}
                  onClick={onContinue}
                  ref={continueButtonRef}
                  trailingIcon={<ArrowRight aria-hidden="true" className="main-menu__continue-arrow" size={17} />}
                  variant="primary"
                >
                  {copy.continue}
                </Button>
                <Button
                  className="main-menu__secondary"
                  disabled={isSaving}
                  leadingIcon={<RotateCcw aria-hidden="true" size={17} />}
                  onClick={() => setIsConfirmingNewGame(true)}
                >
                  {copy.newGame}
                </Button>
                <Button
                  className="main-menu__ghost"
                  disabled={isSaving}
                  leadingIcon={<Settings2 aria-hidden="true" size={17} />}
                  onClick={onSettings}
                  variant="ghost"
                >
                  {copy.settings}
                </Button>
              </div>

              {error && (
                <p className="main-menu__error" role="alert">{copy.error}</p>
              )}
              <p className="main-menu__local-note">{copy.localSave}</p>
            </Card>
          </div>

          <footer className="main-menu__footer">
            <span>{copy.footer}</span>
            <span>{copy.continueHint}</span>
          </footer>
        </div>
      </div>

      {isConfirmingNewGame && (
        <ConfirmationBottomSheet
          cancelLabel={copy.newGameCancel}
          confirmLabel={copy.newGameConfirm}
          message={copy.newGameConfirmMessage}
          onCancel={() => setIsConfirmingNewGame(false)}
          onConfirm={() => {
            setIsConfirmingNewGame(false);
            onNewGame();
          }}
          title={copy.newGameConfirmTitle}
        />
      )}
    </div>
  );
}
