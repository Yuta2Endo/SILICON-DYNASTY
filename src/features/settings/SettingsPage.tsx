import { Check, Globe2, Moon, ShieldCheck, Sun } from "lucide-react";
import type { GameSettings, GameState, Locale, Theme } from "../../game/models/game-state";
import { translations } from "../../localization/messages";

interface SettingsPageProps {
  state: GameState;
  onUpdate: (settings: Partial<GameSettings>) => void;
}

export function SettingsPage({ state, onUpdate }: SettingsPageProps) {
  const locale = state.settings.locale;
  const t = translations[locale];
  const languages: Array<{ id: Locale; label: string }> = [
    { id: "ru", label: t.settings.russian },
    { id: "en", label: t.settings.english },
  ];
  const themes: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
    { id: "light", label: t.settings.light, icon: Sun },
    { id: "dark", label: t.settings.dark, icon: Moon },
  ];

  return (
    <div className="page-stack settings-stack">
      <section className="preference-card">
        <div className="preference-card__heading">
          <span className="preference-icon preference-icon--blue" aria-hidden="true"><Globe2 size={19} /></span>
          <div>
            <h2>{t.settings.language}</h2>
            <p>{t.settings.languageHint}</p>
          </div>
        </div>
        <div className="segmented-control" role="group" aria-label={t.settings.language}>
          {languages.map(({ id, label }) => (
            <button
              aria-pressed={locale === id}
              className={`segment-button${locale === id ? " is-selected" : ""}`}
              key={id}
              onClick={() => onUpdate({ locale: id })}
              type="button"
            >
              <span>{label}</span>
              {locale === id && <Check aria-hidden="true" size={16} />}
            </button>
          ))}
        </div>
      </section>

      <section className="preference-card">
        <div className="preference-card__heading">
          <span className="preference-icon preference-icon--violet" aria-hidden="true"><Sun size={19} /></span>
          <div>
            <h2>{t.settings.appearance}</h2>
            <p>{t.settings.appearanceHint}</p>
          </div>
        </div>
        <div className="segmented-control" role="group" aria-label={t.settings.appearance}>
          {themes.map(({ id, label, icon: Icon }) => (
            <button
              aria-pressed={state.settings.theme === id}
              className={`segment-button${state.settings.theme === id ? " is-selected" : ""}`}
              key={id}
              onClick={() => onUpdate({ theme: id })}
              type="button"
            >
              <Icon aria-hidden="true" size={16} />
              <span>{label}</span>
              {state.settings.theme === id && <Check aria-hidden="true" className="segment-button__check" size={16} />}
            </button>
          ))}
        </div>
      </section>

      <aside className="local-save-card">
        <span className="preference-icon preference-icon--green" aria-hidden="true"><ShieldCheck size={19} /></span>
        <div>
          <h2>{t.settings.localDataTitle}</h2>
          <p>{t.settings.localDataBody}</p>
        </div>
      </aside>
    </div>
  );
}
