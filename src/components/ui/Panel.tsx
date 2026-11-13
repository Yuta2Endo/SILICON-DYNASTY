import { useId, type HTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type PanelTone = "default" | "accent" | "quiet";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  tone?: PanelTone;
}

export function Panel({
  title,
  description,
  icon: Icon,
  action,
  tone = "default",
  className = "",
  children,
  ...props
}: PanelProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={`ui-panel ui-panel--${tone}${className ? ` ${className}` : ""}`}
      {...props}
    >
      <header className="ui-panel__header">
        <div className="ui-panel__heading">
          {Icon && (
            <span className="ui-panel__icon" aria-hidden="true">
              <Icon size={18} strokeWidth={1.8} />
            </span>
          )}
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
        </div>
        {action && <div className="ui-panel__action">{action}</div>}
      </header>
      {children}
    </section>
  );
}
