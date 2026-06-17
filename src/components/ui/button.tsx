import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
  secondary:
    "border border-[var(--border)] bg-[var(--muted)] text-[var(--bone)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
  ghost:
    "text-[var(--secondary)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-[2px] px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
