import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent?: "blue" | "violet" | "green" | "amber";
}

export function MetricCard({ icon: Icon, label, value, detail, accent = "blue" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <div className="metric-card__top">
        <span className="metric-card__icon" aria-hidden="true">
          <Icon size={19} strokeWidth={1.8} />
        </span>
        <span className="metric-card__label">{label}</span>
      </div>
      <p className="metric-card__value tabular-nums">{value}</p>
      <p className="metric-card__detail">{detail}</p>
    </article>
  );
}
