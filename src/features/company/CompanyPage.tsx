import { useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, Building2, CircleDollarSign, Crown, Lock, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { ConfirmationBottomSheet } from "../../components/ConfirmationBottomSheet";
import { MetricCard } from "../../components/MetricCard";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { validateCompany, type Company } from "../../game/models/company";
import type { GameState } from "../../game/models/game-state";
import {
  COMPANY_DOCTRINE_OPTIONS,
  REPUTATION_TIERS,
  getDoctrineEffects,
  getReputationTier,
  type CompanyDoctrineId,
} from "../../game/models/legacy";
import { calculateCompanyLegacyScore } from "../../game/formulas/legacy";
import { formatCurrency, formatDecimal, formatNumber, formatYear } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface CompanyPageProps {
  state: GameState;
  isSaving: boolean;
  onRename: (name: string) => void;
  onChooseDoctrine?: (doctrine: CompanyDoctrineId) => Promise<boolean>;
}

const DOCTRINE_ICONS = {
  innovator: Sparkles,
  "cost-leader": ShieldCheck,
  ecosystem: Building2,
  prestige: Crown,
} as const;

export function CompanyPage({ state, isSaving, onRename, onChooseDoctrine }: CompanyPageProps) {
  const t = translations[state.settings.locale];
  const [draftName, setDraftName] = useState(state.company.name);
  const [showValidation, setShowValidation] = useState(false);
  const [pendingDoctrine, setPendingDoctrine] = useState<CompanyDoctrineId | null>(null);
  const [doctrineError, setDoctrineError] = useState(false);

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
  const legacyCopy = t.company.legacy;
  const reputationTier = getReputationTier(state.company.reputation);
  const nextTier = reputationTier.nextTierAt === null
    ? null
    : REPUTATION_TIERS.find((tier) => tier.minReputation === reputationTier.nextTierAt) ?? null;
  const legacyScore = calculateCompanyLegacyScore(state);
  const activeDoctrine = state.legacy.doctrine;
  const reputationProgress = reputationTier.nextTierAt === null
    ? 100
    : Math.min(100, (state.company.reputation / reputationTier.nextTierAt) * 100);

  async function confirmDoctrine() {
    if (!pendingDoctrine) {
      return;
    }
    const doctrine = pendingDoctrine;
    setPendingDoctrine(null);
    setDoctrineError(false);
    const chosen = onChooseDoctrine ? await onChooseDoctrine(doctrine) : true;
    if (!chosen) {
      setDoctrineError(true);
    }
  }

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

      <section className="company-legacy" aria-labelledby="company-legacy-title">
        <div className="section-heading section-heading--form">
          <div>
            <p className="eyebrow">{legacyCopy.eyebrow}</p>
            <h2 id="company-legacy-title">{legacyCopy.title}</h2>
            <p className="section-description">{legacyCopy.hint}</p>
          </div>
          <span className="status-pill">{legacyCopy.score}: {formatNumber(legacyScore, state.settings.locale)} / 1000</span>
        </div>

        <div className="company-legacy__summary">
          <article className="company-legacy__tier">
            <span className="company-legacy__tier-icon" aria-hidden="true"><Crown size={20} /></span>
            <div>
              <span>{legacyCopy.tier}</span>
              <strong>{legacyCopy.tiers[reputationTier.id]}</strong>
              <small>
                {reputationTier.nextTierAt === null
                  ? legacyCopy.maxTier
                  : legacyCopy.nextTier
                    .replace("{tier}", nextTier ? legacyCopy.tiers[nextTier.id] : "")
                    .replace("{value}", formatNumber(reputationTier.nextTierAt, state.settings.locale))}
              </small>
            </div>
            <div className="company-legacy__progress" aria-hidden="true">
              <span style={{ width: `${reputationProgress}%` }} />
            </div>
          </article>
          <article className="company-legacy__tier">
            <span className="company-legacy__tier-icon" aria-hidden="true"><BadgeCheck size={20} /></span>
            <div>
              <span>{legacyCopy.contractMultiplier}</span>
              <strong>×{formatDecimal(reputationTier.contractRevenueMultiplier, state.settings.locale, 2)}</strong>
              <small>{legacyCopy.contractMultiplierHint}</small>
            </div>
          </article>
        </div>

        <div className="company-legacy__doctrine-heading">
          <div>
            <h3>{legacyCopy.doctrineTitle}</h3>
            <p>{legacyCopy.doctrineHint}</p>
          </div>
          {activeDoctrine ? (
            <span className="status-pill company-legacy__active-pill">
              <Lock aria-hidden="true" size={13} /> {legacyCopy.active}
            </span>
          ) : null}
        </div>

        <div className="company-doctrine-grid">
          {COMPANY_DOCTRINE_OPTIONS.map((doctrine) => {
            const Icon = DOCTRINE_ICONS[doctrine];
            const effects = getDoctrineEffects(doctrine);
            const copy = legacyCopy.doctrines[doctrine];
            const isActive = activeDoctrine === doctrine;
            const isLocked = activeDoctrine !== null && !isActive;
            return (
              <article className={`company-doctrine${isActive ? " company-doctrine--active" : ""}`} key={doctrine}>
                <header>
                  <span className="company-doctrine__icon" aria-hidden="true"><Icon size={19} /></span>
                  <div>
                    <h4>{copy.name}</h4>
                    <p>{copy.description}</p>
                  </div>
                </header>
                <dl className="company-doctrine__effects">
                  <div><dt>{legacyCopy.effects.manufacturing}</dt><dd>{formatEffect(effects.manufacturingCostMultiplier)}</dd></div>
                  <div><dt>{legacyCopy.effects.commercial}</dt><dd>{formatEffect(effects.commercialRevenueMultiplier)}</dd></div>
                  <div><dt>{legacyCopy.effects.reputation}</dt><dd>{formatEffect(effects.reputationGainMultiplier)}</dd></div>
                  <div><dt>{legacyCopy.effects.appeal}</dt><dd>{formatEffect(effects.marketAppealMultiplier)}</dd></div>
                </dl>
                <Button
                  disabled={isSaving || activeDoctrine !== null}
                  onClick={() => {
                    setDoctrineError(false);
                    setPendingDoctrine(doctrine);
                  }}
                  variant={isActive ? "secondary" : "primary"}
                >
                  {isActive ? legacyCopy.active : isLocked ? legacyCopy.locked : legacyCopy.choose}
                </Button>
              </article>
            );
          })}
        </div>

        {doctrineError ? <p className="field-error" role="alert">{legacyCopy.error}</p> : null}
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

      {pendingDoctrine ? (
        <ConfirmationBottomSheet
          cancelLabel={legacyCopy.confirmCancel}
          confirmLabel={legacyCopy.confirm}
          message={legacyCopy.confirmMessage.replace(
            "{doctrine}",
            legacyCopy.doctrines[pendingDoctrine].name,
          )}
          onCancel={() => setPendingDoctrine(null)}
          onConfirm={() => void confirmDoctrine()}
          title={legacyCopy.confirmTitle}
        />
      ) : null}
    </div>
  );
}

function formatEffect(multiplier: number): string {
  const delta = Math.round((multiplier - 1) * 100);
  return `${delta > 0 ? "+" : ""}${delta}%`;
}
