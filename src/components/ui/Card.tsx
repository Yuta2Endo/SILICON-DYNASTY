import type { HTMLAttributes } from "react";

export type CardTone = "default" | "accent" | "quiet";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
}

export function Card({ tone = "default", className = "", ...props }: CardProps) {
  return (
    <div
      className={`ui-card ui-card--${tone}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
