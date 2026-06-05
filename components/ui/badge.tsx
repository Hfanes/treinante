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
  default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  z2: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  z3: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  z4: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  gpx: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  strava:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  manual:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  fresh: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  optimal:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  fatigued:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  overreach: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
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
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
