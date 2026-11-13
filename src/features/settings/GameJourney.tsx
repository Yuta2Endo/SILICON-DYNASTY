import { CheckCircle2, Circle, Sparkles, Trophy } from "lucide-react";
import { getAchievements, getTutorialProgress, getTutorialSteps } from "../../game/models/game-experience";
import type { GameState } from "../../game/models/game-state";
import { translations } from "../../localization/messages";

interface GameJourneyProps {
  state: GameState;
}

export function GameJourney({ state }: GameJourneyProps) {
  const copy = translations[state.settings.locale].settings.journey;
  const steps = getTutorialSteps(state);
  const achievements = getAchievements(state);
  const progress = getTutorialProgress(state);
  const progressPercent = Math.round((progress.completed / progress.total) * 100);

  return (
    <section className="journey-card" aria-labelledby="journey-title">
      <div className="preference-card__heading">
        <span className="preference-icon preference-icon--amber" aria-hidden="true"><Sparkles size={19} /></span>
        <div>
          <h2 id="journey-title">{copy.title}</h2>
          <p>{copy.hint}</p>
        </div>
      </div>

      <div className="journey-progress">
        <div className="journey-progress__copy">
          <strong>{copy.tutorialTitle}</strong>
          <span>{copy.progress.replace("{completed}", String(progress.completed)).replace("{total}", String(progress.total))}</span>
        </div>
        <div
          aria-label={copy.progress.replace("{completed}", String(progress.completed)).replace("{total}", String(progress.total))}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressPercent}
          className="journey-progress__track"
          role="progressbar"
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <ul className="journey-checklist">
        {steps.map((step) => (
          <li className={`journey-step${step.completed ? " journey-step--done" : ""}`} key={step.id}>
            {step.completed
              ? <CheckCircle2 aria-hidden="true" size={17} />
              : <Circle aria-hidden="true" size={17} />}
            <span>{copy.steps[step.id]}</span>
          </li>
        ))}
      </ul>

      <div className="journey-achievements">
        <div className="journey-achievements__heading">
          <Trophy aria-hidden="true" size={17} />
          <strong>{copy.achievementsTitle}</strong>
        </div>
        <p>{copy.achievementsHint}</p>
        <ul className="journey-achievement-list">
          {achievements.map((achievement) => (
            <li
              className={`journey-achievement${achievement.unlocked ? " journey-achievement--unlocked" : ""}`}
              key={achievement.id}
            >
              <Trophy aria-hidden="true" size={15} />
              <span>{copy.achievements[achievement.id]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
