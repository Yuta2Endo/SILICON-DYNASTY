import { useState } from "react";
import { Check, Clock3, FlaskConical, LockKeyhole, Play, Wallet } from "lucide-react";
import { RESEARCH_CATEGORY_EMBLEMS } from "../../app/art";
import { getResearchAvailability } from "../../game/engine/research";
import {
  getTechnology,
  getUnlockedResearchIds,
  RESEARCH_CATALOG,
  RESEARCH_CATEGORIES,
  RESEARCH_ERAS,
  type ResearchCategory,
  type ResearchTechnologyId,
} from "../../game/models/research";
import type { GameState } from "../../game/models/game-state";
import { formatCurrency, formatNumber, formatYear } from "../../localization/formatters";
import { translations } from "../../localization/messages";

interface ResearchPageProps {
  state: GameState;
  isSaving: boolean;
  onStartResearch: (technologyId: ResearchTechnologyId) => Promise<boolean>;
}

type ResearchFilter = ResearchCategory | "all";

export function ResearchPage({ state, isSaving, onStartResearch }: ResearchPageProps) {
  const locale = state.settings.locale;
  const copy = translations[locale].research;
  const [selectedCategory, setSelectedCategory] = useState<ResearchFilter>("all");
  const currentYear = Number(state.gameDate.slice(0, 4));
  const currentEra = RESEARCH_ERAS.find(
    (era) => currentYear >= era.startYear && (era.endYear === null || currentYear <= era.endYear),
  ) ?? RESEARCH_ERAS[0];
  const activeProject = state.research.activeProject;
  const activeTechnology = activeProject ? getTechnology(activeProject.technologyId) : undefined;
  const unlockedResearchIds = new Set(getUnlockedResearchIds(state.research));
  const legacyUnlockIds = new Set(state.research.legacyUnlockIds);
  const activeProgress = activeTechnology && activeProject
    ? Math.min(activeProject.progressDays, activeTechnology.durationDays)
    : 0;
  const activeProgressPercent = activeTechnology
    ? Math.round((activeProgress / activeTechnology.durationDays) * 100)
    : 0;

  const eraGroups = RESEARCH_ERAS.map((era) => ({
    era,
    technologies: RESEARCH_CATALOG.definitions.filter(
      (technology) => technology.eraId === era.id &&
        (selectedCategory === "all" || technology.category === selectedCategory),
    ),
  })).filter((group) => group.technologies.length > 0);

  function getReasonText(technologyId: ResearchTechnologyId): string {
    const availability = getResearchAvailability(
      technologyId,
      state.research,
      state.gameDate,
      state.company.balance,
    );

    switch (availability.status) {
      case "available":
        return copy.reasons.available;
      case "completed":
        return copy.reasons.completed;
      case "researching":
        return copy.reasons.researching;
      case "future":
        return copy.reasons.future.replace(
          "{year}",
          formatYear(availability.availableFromYear ?? currentYear, locale),
        );
      case "locked": {
        const requirements = availability.missingPrerequisiteIds
          .map((id) => getTechnology(id))
          .filter((technology) => technology !== undefined)
          .map((technology) => copy.technologies[technology.id].name)
          .join(", ");
        return copy.reasons.locked.replace("{requirements}", requirements);
      }
      case "busy": {
        const activeName = activeTechnology
          ? copy.technologies[activeTechnology.id].name
          : copy.activeLabel;
        return copy.reasons.busy.replace("{technology}", activeName);
      }
      case "unaffordable": {
        const shortfall = Math.max(0, availability.requiredBalance - state.company.balance);
        return copy.reasons.unaffordable.replace("{amount}", formatCurrency(shortfall, locale));
      }
      case "unknown":
        return copy.reasons.unknown;
    }
  }

  return (
    <div className="page-stack research-page">
      <section className="research-overview" aria-label={copy.overview}>
        <div className="research-overview__intro">
          <span className="research-overview__icon" aria-hidden="true"><FlaskConical size={22} /></span>
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2>{copy.title}</h2>
            <p>{copy.description}</p>
          </div>
        </div>
        <div className="research-overview__metrics">
          <div className="research-overview__metric">
            <span><Wallet aria-hidden="true" size={15} />{copy.balance}</span>
            <strong>{formatCurrency(state.company.balance, locale)}</strong>
          </div>
          <div className="research-overview__metric">
            <span><FlaskConical aria-hidden="true" size={15} />{copy.totalInvested}</span>
            <strong>{formatCurrency(state.research.totalInvestedUsd, locale)}</strong>
          </div>
        </div>
      </section>

      <section className="research-era-banner" aria-label={copy.timeline}>
        <div>
          <p className="eyebrow">{copy.timeline}</p>
          <h2>{copy.eras[currentEra.id]}</h2>
          <p>
            {formatYear(currentEra.startYear, locale)}
            {currentEra.endYear === null ? "+" : `–${formatYear(currentEra.endYear, locale)}`}
          </p>
        </div>
        <span className="research-era-banner__year">{formatYear(currentYear, locale)}</span>
      </section>

      {activeProject && activeTechnology ? (
        <section className="research-active-card" aria-labelledby="research-active-title">
          <div className="research-active-card__header">
            <span className="research-active-card__icon" aria-hidden="true"><Clock3 size={19} /></span>
            <div>
              <p className="eyebrow">{copy.activeLabel}</p>
              <h2 id="research-active-title">{copy.technologies[activeTechnology.id].name}</h2>
            </div>
            <span className="research-status research-status--researching">{copy.statuses.researching}</span>
          </div>
          <div
            aria-label={copy.progressLabel.replace("{technology}", copy.technologies[activeTechnology.id].name)}
            aria-valuemax={activeTechnology.durationDays}
            aria-valuemin={0}
            aria-valuenow={activeProgress}
            aria-valuetext={copy.progressValue
              .replace("{current}", formatNumber(activeProgress, locale))
              .replace("{total}", formatNumber(activeTechnology.durationDays, locale))}
            className="research-progress"
            role="progressbar"
          >
            <span style={{ width: `${activeProgressPercent}%` }} />
          </div>
          <div className="research-active-card__footer">
            <span>{copy.progressValue
              .replace("{current}", formatNumber(activeProgress, locale))
              .replace("{total}", formatNumber(activeTechnology.durationDays, locale))}</span>
            <span>{copy.costPaid}: {formatCurrency(activeProject.costPaidUsd, locale)}</span>
          </div>
        </section>
      ) : (
        <section className="research-idle-card">
          <span className="research-idle-card__icon" aria-hidden="true"><Clock3 size={18} /></span>
          <div>
            <h2>{copy.noActiveProject}</h2>
            <p>{copy.noActiveHint}</p>
          </div>
        </section>
      )}

      {state.research.legacyUnlockIds.length > 0 && (
        <section className="research-legacy-card" aria-labelledby="research-legacy-title">
          <div>
            <p className="eyebrow">{copy.legacyEyebrow}</p>
            <h2 id="research-legacy-title">{copy.legacyTitle}</h2>
            <p>{copy.legacyHint}</p>
          </div>
          <ul className="research-unlock-list">
            {state.research.legacyUnlockIds.map((unlockId) => (
              <li key={unlockId}>{copy.unlocks[unlockId]}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="research-catalog" aria-labelledby="research-catalog-title">
        <header className="research-catalog__header">
          <div>
            <p className="eyebrow">{copy.catalogEyebrow}</p>
            <h2 id="research-catalog-title">{copy.catalogTitle}</h2>
            <p>{copy.catalogHint}</p>
          </div>
          <span className="research-investment-total">
            <Wallet aria-hidden="true" size={15} />
            {formatCurrency(state.company.balance, locale)}
          </span>
        </header>

        <div aria-label={copy.categoryFilter} className="research-category-filters" role="group">
          <button
            aria-pressed={selectedCategory === "all"}
            className={selectedCategory === "all" ? "is-selected" : ""}
            onClick={() => setSelectedCategory("all")}
            type="button"
          >
            {copy.categories.all}
          </button>
          {RESEARCH_CATEGORIES.map((category) => (
            <button
              aria-pressed={selectedCategory === category}
              className={selectedCategory === category ? "is-selected" : ""}
              key={category}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {copy.categories[category]}
            </button>
          ))}
        </div>

        {eraGroups.length === 0 ? (
          <p className="research-empty-filter">{copy.emptyFilter}</p>
        ) : eraGroups.map(({ era, technologies }) => (
          <section className="research-era-section" key={era.id} aria-labelledby={`research-era-${era.id}`}>
            <header className="research-era-section__heading">
              <div>
                <h3 id={`research-era-${era.id}`}>{copy.eras[era.id]}</h3>
                <p>{formatYear(era.startYear, locale)}{era.endYear === null ? "+" : `–${formatYear(era.endYear, locale)}`}</p>
              </div>
              <span>{formatNumber(technologies.length, locale)} {copy.technologyCount}</span>
            </header>
            <div className="research-technology-grid">
              {technologies.map((technology) => {
                const availability = getResearchAvailability(
                  technology.id,
                  state.research,
                  state.gameDate,
                  state.company.balance,
                );
                const technologyCopy = copy.technologies[technology.id];
                const reasonId = `research-reason-${technology.id}`;
                const prerequisiteNames = technology.prerequisiteIds
                  .map((id) => getTechnology(id))
                  .filter((required) => required !== undefined)
                  .map((required) => copy.technologies[required.id].name);
                const hasLegacyUnlock = technology.unlockIds.some((id) => legacyUnlockIds.has(id));
                const isAvailable = availability.status === "available";

                return (
                  <article className={`research-technology-card research-technology-card--${availability.status}`} key={technology.id}>
                    <header className="research-technology-card__header">
                      <img
                        alt=""
                        aria-hidden="true"
                        className="research-technology-card__emblem"
                        decoding="async"
                        loading="lazy"
                        src={RESEARCH_CATEGORY_EMBLEMS[technology.category]}
                      />
                      <div className="research-technology-card__content">
                        <div className="research-technology-card__meta">
                          <p className="research-technology-card__category">{copy.categories[technology.category]}</p>
                          <span className={`research-status research-status--${availability.status}`}>
                            {copy.statuses[availability.status]}
                          </span>
                        </div>
                        <h4>{technologyCopy.name}</h4>
                      </div>
                    </header>
                    <p className="research-technology-card__description">{technologyCopy.description}</p>

                    <dl className="research-technology-facts">
                      <div>
                        <dt>{copy.cost}</dt>
                        <dd>{formatCurrency(technology.costUsd, locale)}</dd>
                      </div>
                      <div>
                        <dt>{copy.duration}</dt>
                        <dd>{formatNumber(technology.durationDays, locale)} {copy.days}</dd>
                      </div>
                    </dl>

                    <div className="research-technology-list">
                      <h5>{copy.prerequisites}</h5>
                      {prerequisiteNames.length > 0 ? (
                        <ul>{prerequisiteNames.map((name) => <li key={name}>{name}</li>)}</ul>
                      ) : <p>{copy.noPrerequisites}</p>}
                    </div>
                    <div className="research-technology-list research-technology-list--unlocks">
                      <h5>{copy.unlockEffects}</h5>
                      <ul>
                        {technology.unlockIds.map((unlockId) => (
                          <li className={unlockedResearchIds.has(unlockId) ? "is-unlocked" : ""} key={unlockId}>
                            {unlockedResearchIds.has(unlockId) && <Check aria-hidden="true" size={13} />}
                            {copy.unlocks[unlockId]}
                          </li>
                        ))}
                      </ul>
                      {hasLegacyUnlock && <p className="research-legacy-note">{copy.legacyCapability}</p>}
                    </div>

                    <p className={`research-availability research-availability--${availability.status}`} id={reasonId}>
                      {getReasonText(technology.id)}
                    </p>
                    <button
                      aria-describedby={reasonId}
                      className="button button--secondary research-start-button"
                      disabled={!isAvailable || isSaving}
                      onClick={() => void onStartResearch(technology.id)}
                      type="button"
                    >
                      {isAvailable ? <Play aria-hidden="true" size={15} /> : availability.status === "completed"
                        ? <Check aria-hidden="true" size={15} />
                        : <LockKeyhole aria-hidden="true" size={15} />}
                      {isSaving && isAvailable ? copy.starting : copy.startResearch}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}
