"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const primaryNavItems = [
  ["Dashboard", "/dashboard"],
  ["Runs", "/runs"],
  ["Records", "/records"],
  ["Fitness", "/fitness"],
  ["Predictor", "/predictor"],
  ["Segments", "/segments"],
  ["Reports", "/reports"],
] as const;

const secondaryNavItems = [
  ["Tools", "/tools"],
  ["Settings", "/settings"],
] as const;

function NavLink({
  collapsed,
  href,
  label,
}: {
  collapsed: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={
        collapsed
          ? "flex h-10 items-center justify-center rounded-[2px] font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)] no-underline transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          : "rounded-[2px] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)] no-underline transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
      }
    >
      {collapsed ? <span aria-hidden="true">{label.at(0)}</span> : label}
      {collapsed ? <span className="sr-only">{label}</span> : null}
    </Link>
  );
}

export function SidebarClient({ profileName }: { profileName: string | null }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("runmetrics-sidebar-collapsed") === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("runmetrics-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 border-r border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_92%,black)] transition-[width] duration-200 md:block ${collapsed ? "w-16 px-2 py-4" : "w-60 p-5"}`}
    >
      <div
        className={
          collapsed
            ? "flex flex-col items-center gap-3"
            : "flex items-start justify-between gap-3"
        }
      >
        <div className={collapsed ? "sr-only" : "min-w-0"}>
          <Link
            href="/dashboard"
            className="instrument-heading block text-3xl no-underline"
          >
            RunMetrics
          </Link>
          <p className="ui-label mt-2">Training Instrument</p>
        </div>
        {collapsed ? (
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[2px] no-underline"
            title="RunMetrics"
          >
            <Image
              src="/images/bg-removed-logo.png"
              alt="RunMetrics"
              width={88}
              height={88}
              className="max-w-none scale-[2.15]"
              priority
            />
          </Link>
        ) : null}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[var(--border)] font-mono text-xs text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>
      <nav className={`${collapsed ? "mt-8" : "mt-10"} flex flex-col gap-1`}>
        {primaryNavItems.map(([label, href]) => (
          <NavLink collapsed={collapsed} href={href} key={href} label={label} />
        ))}
        <div className="my-4 h-px bg-[var(--border)]" />
        {secondaryNavItems.map(([label, href]) => (
          <NavLink collapsed={collapsed} href={href} key={href} label={label} />
        ))}
      </nav>
      <div
        className={`absolute bottom-5 border-t border-[var(--border)] pt-4 ${collapsed ? "inset-x-2 text-center" : "inset-x-5"}`}
      >
        <p className={collapsed ? "sr-only" : "ui-label"}>Runner</p>
        <p className={`${collapsed ? "mt-0" : "mt-2"} truncate text-sm text-[var(--bone)]`}>
          {collapsed ? (profileName ?? "Profile").at(0) : (profileName ?? "Profile")}
        </p>
      </div>
    </aside>
  );
}
