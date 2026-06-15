export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-[2px] bg-[linear-gradient(90deg,var(--muted)_25%,oklch(0.32_0.012_80)_50%,var(--muted)_75%)] bg-[length:200%_100%] animate-[shimmer_1.5s_ease_infinite] ${className}`}
    />
  );
}
