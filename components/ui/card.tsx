import type { ReactNode } from "react";

export interface CardProps {
  label?: string;
  value?: string | number;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function Card({
  label,
  value,
  subtitle,
  children,
  className = "",
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {label ? (
        <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </div>
      ) : null}
      {value !== undefined ? (
        <div className="mt-1 font-mono text-2xl font-semibold text-gray-950 dark:text-white">
          {value}
        </div>
      ) : null}
      {subtitle ? (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </div>
      ) : null}
      {children}
    </div>
  );
}
