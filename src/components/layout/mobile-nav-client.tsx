"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  FileText,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  Settings,
  Trophy,
  TrendingUp,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

const primaryItems = [
  ["Home", "/dashboard", LayoutDashboard],
  ["Runs", "/runs", Activity],
  ["Fitness", "/fitness", HeartPulse],
  ["Settings", "/settings", Settings],
] as const;

const moreItems = [
  ["Records", "/records", Trophy],
  ["Segments", "/segments", MapPin],
  ["Predictor", "/predictor", TrendingUp],
  ["Reports", "/reports", FileText],
  ["Tools", "/tools", Wrench],
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileNavLink({
  active,
  href,
  icon: Icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 font-mono text-[0.52rem] leading-none uppercase tracking-[0.12em] no-underline transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] ${
        active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
      }`}
      href={href}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.6} />
      <span className="text-[0.52rem] leading-none">{label}</span>
    </Link>
  );
}

export function MobileNavClient() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close more navigation"
            className="absolute inset-0 cursor-default"
            onClick={() => setMoreOpen(false)}
            type="button"
          />
          <div className="absolute inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] mx-2 rounded-t-[2px] border border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_94%,black)] p-5 shadow-2xl">
            <div className="mx-auto mb-8 h-1 w-10 rounded-[2px] bg-[var(--border)]" />
            <div className="mb-5 flex items-center justify-between">
              <p className="ui-label">More</p>
              <button
                aria-label="Close more navigation"
                className="rounded-[2px] p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--primary)]"
                onClick={() => setMoreOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map(([label, href, Icon]) => (
                <Link
                  aria-current={
                    isActivePath(pathname, href) ? "page" : undefined
                  }
                  className={`flex items-center gap-2 rounded-[2px] border border-[var(--border)] px-4 py-4 font-mono text-[0.68rem] uppercase tracking-[0.18em] no-underline transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--primary)] ${
                    isActivePath(pathname, href)
                      ? "text-[var(--primary)]"
                      : "text-[var(--muted-foreground)]"
                  }`}
                  href={href}
                  key={href}
                  onClick={() => setMoreOpen(false)}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.6}
                  />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(4.25rem+env(safe-area-inset-bottom))] grid-cols-5 border-t border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_94%,black)] pb-[env(safe-area-inset-bottom)] text-[var(--muted-foreground)] md:hidden">
        {primaryItems.slice(0, 3).map(([label, href, Icon]) => (
          <MobileNavLink
            active={isActivePath(pathname, href)}
            href={href}
            icon={Icon}
            key={href}
            label={label}
          />
        ))}
        <MobileNavLink
          active={isActivePath(pathname, "/settings")}
          href="/settings"
          icon={Settings}
          label="Settings"
        />
        <button
          aria-expanded={moreOpen}
          aria-label="Open more navigation"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 font-mono text-[0.52rem] leading-none uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] ${
            moreOpen
              ? "text-[var(--primary)]"
              : "text-[var(--muted-foreground)]"
          }`}
          onClick={() => setMoreOpen((value) => !value)}
          type="button"
        >
          <MoreHorizontal
            aria-hidden="true"
            className="size-5"
            strokeWidth={1.6}
          />
          <span className="text-[0.52rem] leading-none">More</span>
        </button>
      </nav>
    </>
  );
}
