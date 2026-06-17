"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  ChevronLeft,
  FileText,
  Flame,
  LayoutDashboard,
  LogIn,
  MapPin,
  Settings,
  Trophy,
  TrendingUp,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const primaryNavItems = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Runs", "/runs", Activity],
  ["Records", "/records", Trophy],
  ["Fitness", "/fitness", Flame],
  ["Predictor", "/predictor", TrendingUp],
  ["Segments", "/segments", MapPin],
  ["Reports", "/reports", FileText],
] as const;

const secondaryNavItems = [
  ["Tools", "/tools", Wrench],
  ["Settings", "/settings", Settings],
] as const;

const navBaseClass =
  "group relative flex h-10 items-center rounded-[2px] font-mono text-[0.68rem] uppercase tracking-[0.14em] no-underline transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] motion-reduce:transition-none";

function SidebarLabel({
  collapsed,
  label,
}: {
  collapsed: boolean;
  label: string;
}) {
  return (
    <span
      className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-in-out motion-reduce:transition-none ${
        collapsed ? "ml-0 max-w-0 opacity-0" : "ml-3 max-w-32 opacity-100"
      }`}
    >
      {label}
    </span>
  );
}

function SidebarTooltip({
  collapsed,
  label,
}: {
  collapsed: boolean;
  label: string;
}) {
  if (!collapsed) return null;

  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 w-max -translate-y-1/2 border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--bone)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
      {label}
    </span>
  );
}

function NavLink({
  active,
  collapsed,
  disabled = false,
  href,
  icon: Icon,
  label,
}: {
  active: boolean;
  collapsed: boolean;
  disabled?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  const content = (
    <>
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
      <SidebarLabel collapsed={collapsed} label={label} />
      <SidebarTooltip collapsed={collapsed} label={label} />
    </>
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${navBaseClass} cursor-not-allowed px-4 text-[color-mix(in_oklch,var(--muted-foreground)_78%,var(--bone))] ${
          collapsed ? "justify-center" : "justify-start"
        }`}
        tabIndex={0}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={`${navBaseClass} px-4 ${
        active
          ? "bg-[var(--muted)] text-[var(--foreground)]"
          : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
      } ${collapsed ? "justify-center" : "justify-start"}`}
      href={href}
    >
      {content}
    </Link>
  );
}

function AuthLink({
  collapsed,
  href,
  icon: Icon,
  label,
  primary = false,
}: {
  collapsed: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      aria-label={collapsed ? label : undefined}
      className={`group relative flex h-10 items-center rounded-[2px] border px-3 text-xs font-medium no-underline transition-[background-color,border-color,color] duration-200 ease-in-out focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] motion-reduce:transition-none ${
        collapsed ? "justify-center" : "justify-start"
      } ${
        primary
          ? "border-[var(--primary)] bg-[var(--primary)] !text-[var(--primary-foreground)]"
          : "border-[var(--border)] text-[var(--bone)]"
      }`}
      href={href}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
      <SidebarLabel collapsed={collapsed} label={label} />
      <SidebarTooltip collapsed={collapsed} label={label} />
    </Link>
  );
}

export function SidebarClient({
  isLoggedIn,
  profileName,
}: {
  isLoggedIn: boolean;
  profileName: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(
      localStorage.getItem("runmetrics-sidebar-collapsed") === "true"
    );
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
      className={`sticky top-0 hidden h-screen shrink-0 border-r border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_92%,black)] transition-[width,padding] duration-300 ease-in-out motion-reduce:transition-none md:block ${
        collapsed ? "w-20 px-3 py-4" : "w-60 p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          aria-label="RunMetrics home"
          className="flex min-w-0 items-start gap-3 no-underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          href={isLoggedIn ? "/dashboard" : "/tools"}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[2px]">
            <Image
              src="/images/bg-removed-logo.png"
              alt=""
              width={88}
              height={88}
              className="max-w-none scale-[2.15]"
              priority
            />
          </span>
          <span
            className={`min-w-0 overflow-hidden transition-[max-width,max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
              collapsed
                ? "max-h-0 max-w-0 opacity-0"
                : "max-h-20 max-w-40 opacity-100"
            }`}
          >
            <span className="instrument-heading block text-3xl leading-none">
              RunMetrics
            </span>
            <span className="ui-label mt-2 block">Training Instrument</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[var(--border)] text-[var(--muted-foreground)] transition-colors duration-200 ease-in-out hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] motion-reduce:transition-none"
        >
          <ChevronLeft
            aria-hidden="true"
            className={`size-4 transition-transform duration-300 ease-in-out motion-reduce:transition-none motion-reduce:transform-none ${
              collapsed ? "rotate-180" : "rotate-0"
            }`}
            strokeWidth={1.8}
          />
        </button>
      </div>

      <nav className="mt-10 flex flex-col gap-1">
        {primaryNavItems.map(([label, href, Icon]) => (
          <NavLink
            active={pathname === href}
            collapsed={collapsed}
            disabled={!isLoggedIn}
            href={href}
            icon={Icon}
            key={href}
            label={label}
          />
        ))}
        <div className="my-4 h-px bg-[var(--border)]" />
        {secondaryNavItems.map(([label, href, Icon]) => (
          <NavLink
            active={pathname === href}
            collapsed={collapsed}
            disabled={!isLoggedIn && href !== "/tools"}
            href={href}
            icon={Icon}
            key={href}
            label={label}
          />
        ))}
      </nav>

      <div
        className={`absolute bottom-5 border-t border-[var(--border)] pt-4 ${
          collapsed ? "inset-x-3" : "inset-x-5"
        }`}
      >
        {isLoggedIn ? (
          <div className={collapsed ? "text-center" : ""}>
            <p
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
                collapsed ? "max-h-0 opacity-0" : "max-h-6 opacity-100"
              } ui-label`}
            >
              Runner
            </p>
            <p className="mt-2 truncate text-sm text-[var(--bone)]">
              {collapsed
                ? (profileName ?? "Profile").at(0)
                : (profileName ?? "Profile")}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            <AuthLink
              collapsed={collapsed}
              href="/login"
              icon={LogIn}
              label="Login"
              primary
            />
            <AuthLink
              collapsed={collapsed}
              href="/signup"
              icon={UserPlus}
              label="Register"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
