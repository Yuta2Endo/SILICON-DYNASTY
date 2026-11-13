import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "button--primary",
  secondary: "button--secondary",
  ghost: "button--ghost",
  danger: "button--danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    leadingIcon,
    trailingIcon,
    className = "",
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      className={`button ${variantClasses[variant]}${size === "sm" ? " button--sm" : ""}${className ? ` ${className}` : ""}`}
      ref={ref}
      type={type}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});
