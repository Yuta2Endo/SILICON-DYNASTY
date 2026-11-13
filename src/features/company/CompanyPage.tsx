import { useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, Building2, CircleDollarSign, UsersRound } from "lucide-react";
import { MetricCard } from "../../components/MetricCard";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { validateCompany, type Company } from "../../game/models/company";
import type { GameState } from "../../game/models/game-state";
import { formatCurrency, formatNumber, formatYear } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface CompanyPageProps {
  state: GameState;
  isSaving: boolean;
  onRename: (name: string) => void;
}

export function CompanyPage({ state, isSaving, onRename }: CompanyPageProps) {
  const t = translations[state.settings.locale];
  const [draftName, setDraftName] = useState(state.company.name);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    setDraftName(state.company.name);
  }, [state.company.name]);

  const candidate: Company = { ...state.company, name: draftName };
  const validation = validateCompany(candidate);
  const nameError = showValidation && validation.errors.name
    ? draftName.trim().length < 2
      ? t.company.nameRequired
      : t.company.nameTooLong
    : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowValidation(true);

    if (!validation.valid) {
      return;
    }

    onRename(draftName.trim());
  }

  return (
    <div className="page-stack">
      <section className="company-profile-card">
        <div className="profile-avatar" aria-hidden="true"><Building2 size={25} strokeWidth={1.7} /></div>
        <div className="company-profile-card__identity">
          <p className="eyebrow">{t.app.tagline}</p>
          <h2>{state.company.name}</h2>
          <span className="profile-meta">
            <span className="profile-meta__dot" aria-hidden="true" />
            {t.company.foundingYear} · {formatYear(state.company.foundedYear, state.settings.locale)}
          </span>
        </div>
        <span className="profile-status"><BadgeCheck aria-hidden="true" size={16} /> {t.dashboard.foundationTag}</span>
      </section>

      <section className="metrics-grid company-metrics" aria-label={t.screens.company.title}>
        <MetricCard
          accent="blue"
          detail={t.dashboard.balanceHint}
          icon={CircleDollarSign}
          label={t.company.balance}
          value={formatCurrency(state.company.balance, state.settings.locale)}
        />
        <MetricCard
          accent="violet"
          detail={t.dashboard.reputationHint}
          icon={BadgeCheck}
          label={t.company.reputation}
          value={`${formatNumber(state.company.reputation, state.settings.locale)} / 100`}
        />
        <MetricCard
          accent="green"
          detail={t.dashboard.teamHint}
          icon={UsersRound}
          label={t.company.employees}
          value={formatNumber(state.company.employeeCount, state.settings.locale)}
        />
      </section>

      <section className="form-card">
        <div className="section-heading section-heading--form">
          <div>
            <p className="eyebrow">{t.screens.company.eyebrow}</p>
            <h2>{t.company.name}</h2>
          </div>
        </div>
        <form className="company-form" onSubmit={handleSubmit}>
          <Field
            error={nameError}
            hint={t.company.nameHint}
            htmlFor="company-name"
            label={t.company.name}
          >
            <input
              autoComplete="organization"
              id="company-name"
              maxLength={40}
              onChange={(event) => {
                setDraftName(event.currentTarget.value);
                setShowValidation(false);
              }}
              value={draftName}
            />
          </Field>
          <div className="company-form__footer">
            <span className="form-footnote">{t.settings.localDataBody}</span>
            <Button disabled={isSaving} type="submit" variant="primary">
              {isSaving ? t.common.saving : t.company.save}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
