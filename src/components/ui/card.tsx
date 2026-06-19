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
      className={`instrument-card metric-card min-w-0 max-w-full p-4 sm:p-5 md:p-6 ${className}`}
    >
      {label ? <div className="metric-label">{label}</div> : null}
      {value !== undefined ? (
        <div className="metric-value mt-2">{value}</div>
      ) : null}
      {subtitle ? (
        <div className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          {subtitle}
        </div>
      ) : null}
      {children}
    </div>
  );
}
