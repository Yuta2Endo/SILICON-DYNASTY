import { useState } from "react";
import { Check, Clock3, LockKeyhole, Play } from "lucide-react";
import { RESEARCH_CATEGORY_EMBLEMS } from "../../app/art";
import { getResearchAvailability } from "../../game/engine/research";
import {
  getTechnology,
  RESEARCH_ERAS,
  type ResearchCategory,
  type ResearchTechnologyId,
} from "../../game/models/research";
import {
  buildResearchTreeLayout,
  formatResearchEraRange,
} from "../../game/models/research-tree";
import type { GameState } from "../../game/models/game-state";
import { formatCurrency, formatNumber, formatYear } from "../../localization/formatters";
import type { TranslationMessages } from "../../localization/messages";

const RESEARCH_TREE_LAYOUT = buildResearchTreeLayout();

interface ResearchTechTreeProps {
  state: GameState;
  copy: TranslationMessages["research"];
  locale: GameState["settings"]["locale"];
  selectedCategory: ResearchCategory | "all";
  isSaving: boolean;
  onStartResearch: (technologyId: ResearchTechnologyId) => Promise<boolean>;
}

export function ResearchTechTree({
  state,
  copy,
  locale,
  selectedCategory,
  isSaving,
  onStartResearch,
}: ResearchTechTreeProps) {
  const fallbackTechnology = RESEARCH_TREE_LAYOUT.nodes[0];
  const [selectedId, setSelectedId] = useState<ResearchTechnologyId>(
    () => fallbackTechnology?.id ?? "out-of-order",
  );
  const selectedTechnology = getTechnology(selectedId) ?? getTechnology("out-of-order");
  const currentYear = Number(state.gameDate.slice(0, 4));
  const currentEra = RESEARCH_ERAS.find(
    (era) => currentYear >= era.startYear && (era.endYear === null || currentYear <= era.endYear),
  ) ?? RESEARCH_ERAS[0];

  function availabilityFor(technologyId: ResearchTechnologyId) {
    return getResearchAvailability(
      technologyId,
      state.research,
      state.gameDate,
      state.company.balance,
    );
  }

  function getReasonText(technologyId: ResearchTechnologyId): string {
    const availability = availabilityFor(technologyId);

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
        const activeTechnology = state.research.activeProject
          ? getTechnology(state.research.activeProject.technologyId)
          : undefined;
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

  if (!selectedTechnology) {
    return <p className="research-empty-filter">{copy.emptyFilter}</p>;
  }

  const selectedAvailability = availabilityFor(selectedTechnology.id);
  const selectedCopy = copy.technologies[selectedTechnology.id];
  const selectedEra = RESEARCH_ERAS.find((era) => era.id === selectedTechnology.eraId);
  const prerequisiteNames = selectedTechnology.prerequisiteIds
    .map((id) => getTechnology(id))
    .filter((technology) => technology !== undefined)
    .map((technology) => copy.technologies[technology.id].name);
  const isAvailable = selectedAvailability.status === "available";

  return (
    <div className="research-tree">
      <div
        aria-label={copy.treeLabel}
        className="research-tree__scroll"
        role="region"
        tabIndex={0}
      >
        <div
          className="research-tree__canvas"
          style={{ width: RESEARCH_TREE_LAYOUT.width, height: RESEARCH_TREE_LAYOUT.height }}
        >
          {RESEARCH_TREE_LAYOUT.columns.map((column) => {
            const era = RESEARCH_ERAS.find((item) => item.id === column.id);
            if (!era) {
              return null;
            }

            return (
              <div
                className={`research-tree__column-heading${column.id === currentEra.id ? " is-current" : ""}`}
                key={column.id}
                style={{ left: column.x, top: 10, width: column.width }}
              >
                <strong>{copy.eras[column.id]}</strong>
                <span>{formatResearchEraRange(era)}</span>
              </div>
            );
          })}

          <svg
            aria-hidden="true"
            className="research-tree__edges"
            height={RESEARCH_TREE_LAYOUT.height}
            viewBox={`0 0 ${RESEARCH_TREE_LAYOUT.width} ${RESEARCH_TREE_LAYOUT.height}`}
            width={RESEARCH_TREE_LAYOUT.width}
          >
            {RESEARCH_TREE_LAYOUT.edges.map((edge) => {
              const target = getTechnology(edge.toId);
              const status = target ? availabilityFor(edge.toId).status : "unknown";
              const dimmed = target !== undefined &&
                selectedCategory !== "all" &&
                target.category !== selectedCategory;

              return (
                <path
                  className={`research-tree__edge research-tree__edge--${status}${dimmed ? " is-dimmed" : ""}`}
                  d={edge.path}
                  key={`${edge.fromId}-${edge.toId}`}
                />
              );
            })}
          </svg>

          {RESEARCH_TREE_LAYOUT.nodes.map((node) => {
            const technology = getTechnology(node.id);
            if (!technology) {
              return null;
            }

            const availability = availabilityFor(node.id);
            const dimmed = selectedCategory !== "all" && technology.category !== selectedCategory;

            return (
              <button
                aria-label={`${copy.technologies[technology.id].name}: ${copy.statuses[availability.status]}`}
                aria-pressed={selectedId === node.id}
                className={`research-tree-node research-tree-node--${availability.status}${dimmed ? " is-dimmed" : ""}${selectedId === node.id ? " is-selected" : ""}`}
                key={node.id}
                onClick={() => setSelectedId(node.id)}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                }}
                type="button"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="research-tree-node__emblem"
                  decoding="async"
                  loading="lazy"
                  src={RESEARCH_CATEGORY_EMBLEMS[technology.category]}
                />
                <span className="research-tree-node__copy">
                  <strong>{copy.technologies[technology.id].name}</strong>
                  <span>{copy.categories[technology.category]}</span>
                </span>
                <span className="research-tree-node__status" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <aside className="research-tree__detail" aria-live="polite">
        <p className="eyebrow">{copy.treeSelected}</p>
        <header className="research-tree__detail-header">
          <img
            alt=""
            aria-hidden="true"
            className="research-tree__detail-emblem"
            src={RESEARCH_CATEGORY_EMBLEMS[selectedTechnology.category]}
          />
          <div>
            <div className="research-tree__detail-meta">
              <span>{copy.categories[selectedTechnology.category]}</span>
              <span className={`research-status research-status--${selectedAvailability.status}`}>
                {copy.statuses[selectedAvailability.status]}
              </span>
            </div>
            <h3>{selectedCopy.name}</h3>
            {selectedEra && <p>{copy.eras[selectedEra.id]}</p>}
          </div>
        </header>

        <p className="research-tree__description">{selectedCopy.description}</p>

        <dl className="research-technology-facts">
          <div>
            <dt>{copy.cost}</dt>
            <dd>{formatCurrency(selectedTechnology.costUsd, locale)}</dd>
          </div>
          <div>
            <dt>{copy.duration}</dt>
            <dd>{formatNumber(selectedTechnology.durationDays, locale)} {copy.days}</dd>
          </div>
        </dl>

        <div className="research-technology-list">
          <h4>{copy.prerequisites}</h4>
          {prerequisiteNames.length > 0 ? (
            <ul>{prerequisiteNames.map((name) => <li key={name}>{name}</li>)}</ul>
          ) : <p>{copy.noPrerequisites}</p>}
        </div>

        <div className="research-technology-list research-technology-list--unlocks">
          <h4>{copy.unlockEffects}</h4>
          <ul>
            {selectedTechnology.unlockIds.map((unlockId) => (
              <li key={unlockId}>{copy.unlocks[unlockId]}</li>
            ))}
          </ul>
        </div>

        <p className={`research-availability research-availability--${selectedAvailability.status}`}>
          {getReasonText(selectedTechnology.id)}
        </p>
        <button
          className="button button--secondary research-start-button"
          disabled={!isAvailable || isSaving}
          onClick={() => void onStartResearch(selectedTechnology.id)}
          type="button"
        >
          {isAvailable ? <Play aria-hidden="true" size={15} /> : selectedAvailability.status === "completed"
            ? <Check aria-hidden="true" size={15} />
            : <LockKeyhole aria-hidden="true" size={15} />}
          {isSaving && isAvailable ? copy.starting : copy.startResearch}
        </button>
        <p className="research-tree__hint">
          <Clock3 aria-hidden="true" size={13} />
          {copy.treeHint}
        </p>
      </aside>
    </div>
  );
}
