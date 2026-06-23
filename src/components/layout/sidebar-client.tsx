"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/layout/logout-button";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Activity,
  ChevronLeft,
  FileText,
  HeartPulse,
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
  ["Home", "/dashboard", LayoutDashboard],
  ["Runs", "/runs", Activity],
  ["Records", "/records", Trophy],
  ["Fitness", "/fitness", HeartPulse],
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

const collapsedWidth = 80;
const openWidth = 240;
const snapMidpoint = (collapsedWidth + openWidth) / 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLabel({
  collapsed,
  dragStyle,
  label,
}: {
  collapsed: boolean;
  dragStyle?: CSSProperties;
  label: string;
}) {
  return (
    <span
      className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-in-out motion-reduce:transition-none ${
        collapsed ? "ml-0 max-w-0 opacity-0" : "ml-3 max-w-32 opacity-100"
      }`}
      style={dragStyle}
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
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 max-w-[12rem] -translate-y-1/2 whitespace-nowrap border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--bone)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
      {label}
    </span>
  );
}

function NavLink({
  active,
  collapsed,
  disabled = false,
  dragLabelStyle,
  href,
  icon: Icon,
  label,
  badge = false,
}: {
  active: boolean;
  collapsed: boolean;
  disabled?: boolean;
  dragLabelStyle?: CSSProperties;
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: boolean;
}) {
  const content = (
    <>
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
      <SidebarLabel
        collapsed={collapsed}
        dragStyle={dragLabelStyle}
        label={label}
      />
      {badge ? (
        <span className="ml-auto h-2 w-2 rounded-full bg-[var(--primary)]" />
      ) : null}
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
  dragLabelStyle,
  href,
  icon: Icon,
  label,
  primary = false,
}: {
  collapsed: boolean;
  dragLabelStyle?: CSSProperties;
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
      <SidebarLabel
        collapsed={collapsed}
        dragStyle={dragLabelStyle}
        label={label}
      />
      <SidebarTooltip collapsed={collapsed} label={label} />
    </Link>
  );
}

export function SidebarClient({
  hasFitnessBadge,
  hasRecordsBadge,
  isLoggedIn,
}: {
  hasFitnessBadge: boolean;
  hasRecordsBadge: boolean;
  isLoggedIn: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(openWidth);
  const latestWidthRef = useRef(openWidth);

  useEffect(() => {
    const saved = localStorage.getItem("treinante-sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
      return;
    }

    setCollapsed(
      window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches
    );
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    localStorage.setItem("treinante-sidebar-collapsed", String(next));
    setCollapsed(next);
  }

  function startResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const currentWidth = collapsed ? collapsedWidth : openWidth;
    startXRef.current = event.clientX;
    startWidthRef.current = currentWidth;
    latestWidthRef.current = currentWidth;
    setDragWidth(currentWidth);
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handleMouseMove(event: MouseEvent) {
      const nextWidth = clamp(
        startWidthRef.current + event.clientX - startXRef.current,
        collapsedWidth,
        openWidth
      );
      latestWidthRef.current = nextWidth;
      setDragWidth(nextWidth);
    }

    function handleMouseUp() {
      const nextCollapsed = latestWidthRef.current < snapMidpoint;
      if (nextCollapsed !== collapsed) {
        localStorage.setItem(
          "treinante-sidebar-collapsed",
          String(nextCollapsed)
        );
        setCollapsed(nextCollapsed);
      }
      setIsDragging(false);
      setDragWidth(null);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [collapsed, isDragging]);

  const openness =
    dragWidth === null
      ? Number(!collapsed)
      : (dragWidth - collapsedWidth) / (openWidth - collapsedWidth);
  const layoutCollapsed = isDragging
    ? (dragWidth ?? collapsedWidth) < snapMidpoint
    : collapsed;
  const labelRatio = clamp((openness - 0.25) / 0.75, 0, 1);
  const dragLabelStyle = isDragging
    ? {
        marginLeft: `${labelRatio * 0.75}rem`,
        maxWidth: `${labelRatio * 8}rem`,
        opacity: labelRatio,
      }
    : undefined;
  const dragWordmarkStyle = isDragging
    ? {
        maxHeight: `${labelRatio * 5}rem`,
        maxWidth: `${labelRatio * 10}rem`,
        opacity: labelRatio,
      }
    : undefined;
  const sidebarStyle = isDragging
    ? { transition: "none", width: `${dragWidth ?? openWidth}px` }
    : undefined;
  const collapseButton = (
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
          layoutCollapsed ? "rotate-180" : "rotate-0"
        }`}
        strokeWidth={1.8}
      />
    </button>
  );

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 border-r border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_92%,black)] transition-[width,padding] duration-300 ease-in-out motion-reduce:transition-none md:block ${
        layoutCollapsed ? "w-20 px-3 py-4" : "w-60 p-5"
      }`}
      style={sidebarStyle}
    >
      <div
        className={`flex gap-3 ${
          layoutCollapsed
            ? "flex-col items-center"
            : "items-center justify-between" // items-center (not start) aligns icon + button vertically
        }`}
      >
        <Link
          aria-label="Treinante home"
          className={`flex min-w-0 items-center no-underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
            layoutCollapsed ? "" : "gap-3" // ← no gap when collapsed = icon truly centered
          }`}
          href={isLoggedIn ? "/dashboard" : "/tools"}
        >
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[2px]">
            <Image
              src="/images/bg-removed-logo.png"
              alt=""
              width={88}
              height={88}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[2.15]"
              priority
            />
          </span>

          <span
            className={`min-w-0 overflow-hidden transition-[max-width,max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
              layoutCollapsed
                ? "max-h-0 max-w-0 opacity-0"
                : "max-h-20 max-w-52 opacity-100" // ← 208px instead of 160px
            }`}
            style={dragWordmarkStyle}
          >
            <span className="instrument-heading block text-3xl leading-none whitespace-nowrap">
              Treinante
            </span>
          </span>
        </Link>
      </div>

      <nav className="mt-10 flex flex-col gap-1">
        {primaryNavItems.map(([label, href, Icon]) => (
          <NavLink
            active={isActivePath(pathname, href)}
            badge={
              (label === "Fitness" && hasFitnessBadge) ||
              (label === "Records" && hasRecordsBadge)
            }
            collapsed={layoutCollapsed}
            disabled={!isLoggedIn}
            dragLabelStyle={dragLabelStyle}
            href={href}
            icon={Icon}
            key={href}
            label={label}
          />
        ))}
        <div className="my-4 h-px bg-[var(--border)]" />
        {secondaryNavItems.map(([label, href, Icon]) => (
          <NavLink
            active={isActivePath(pathname, href)}
            collapsed={layoutCollapsed}
            disabled={!isLoggedIn && href !== "/tools"}
            dragLabelStyle={dragLabelStyle}
            href={href}
            icon={Icon}
            key={href}
            label={label}
          />
        ))}
      </nav>

      <div
        className={`absolute bottom-5 border-t border-[var(--border)] pt-4 ${
          layoutCollapsed ? "inset-x-3" : "inset-x-5"
        }`}
      >
        {isLoggedIn ? (
          <div>
            <div className={layoutCollapsed ? "flex justify-center" : ""}>
              <LogoutButton collapsed={layoutCollapsed} />
            </div>
            <div
              className={`mt-4 ${
                layoutCollapsed
                  ? "flex justify-center"
                  : "flex items-end justify-between gap-3"
              }`}
            >
              {!layoutCollapsed && (
                <div className="min-w-0">
                  <p className="ui-label">Powered by</p>
                  <Image
                    src="/images/strava.svg"
                    alt="Strava"
                    width={45}
                    height={10}
                    className="mt-2 h-4 w-[60px]"
                  />
                </div>
              )}
              {collapseButton}
            </div>
          </div>
        ) : (
          <div>
            <div className="grid gap-2">
              <AuthLink
                collapsed={layoutCollapsed}
                dragLabelStyle={dragLabelStyle}
                href="/login"
                icon={LogIn}
                label="Login"
                primary
              />
              <AuthLink
                collapsed={layoutCollapsed}
                dragLabelStyle={dragLabelStyle}
                href="/signup"
                icon={UserPlus}
                label="Register"
              />
            </div>
            <div
              className={`mt-4 flex ${
                layoutCollapsed ? "justify-center" : "justify-end"
              }`}
            >
              {collapseButton}
            </div>
          </div>
        )}
      </div>
      <div
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        className="group absolute top-0 right-[-4px] z-50 h-full w-2 cursor-col-resize"
        onMouseDown={startResize}
        role="separator"
      >
        <span
          className={`absolute top-0 left-1/2 h-full w-[2px] -translate-x-1/2 bg-[var(--primary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none ${
            isDragging ? "opacity-100" : ""
          }`}
        />
      </div>
    </aside>
  );
}
