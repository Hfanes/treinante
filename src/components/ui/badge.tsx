import type { HTMLAttributes } from "react";

type BadgeVariant =
  | "default"
  | "z2"
  | "z3"
  | "z4"
  | "gpx"
  | "strava"
  | "manual"
  | "fresh"
  | "optimal"
  | "neutral"
  | "fatigued"
  | "overreach";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--muted)] text-[var(--secondary)]",
  z2: "border border-[#22c55e44] bg-[#15803d22] text-[#22c55e]",
  z3: "border border-[#f59e0b44] bg-[#b4530922] text-[#f59e0b]",
  z4: "border border-[#ef444444] bg-[#dc262622] text-[#ef4444]",
  gpx: "bg-[var(--muted)] text-[var(--primary)]",
  strava: "bg-[var(--muted)] text-[#fc4c02]",
  manual: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  fresh: "bg-[#1d4ed822] text-[#60a5fa]",
  optimal:
    "border border-[#4ade8044] bg-[#15803d22] text-[var(--tsb-positive)]",
  neutral: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  fatigued: "border border-[#f59e0b44] bg-[#b4530922] text-[#f59e0b]",
  overreach: "border border-[#ef444444] bg-[#dc262622] text-[#ef4444]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className = "",
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-[2px] px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.1em] ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
