import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";

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

async function getProfileName() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  return data?.name ?? null;
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-[2px] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)] no-underline transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
    >
      {label}
    </Link>
  );
}

export async function Sidebar() {
  const profileName = await getProfileName();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-[var(--border)] bg-[color-mix(in_oklch,var(--background)_92%,black)] p-5 md:block">
      <Link
        href="/dashboard"
        className="instrument-heading block text-3xl no-underline"
      >
        RunMetrics
      </Link>
      <p className="ui-label mt-2">Training Instrument</p>
      <nav className="mt-10 flex flex-col gap-1">
        {primaryNavItems.map(([label, href]) => (
          <NavLink href={href} key={href} label={label} />
        ))}
        <div className="my-4 h-px bg-[var(--border)]" />
        {secondaryNavItems.map(([label, href]) => (
          <NavLink href={href} key={href} label={label} />
        ))}
      </nav>
      <div className="absolute inset-x-5 bottom-5 border-t border-[var(--border)] pt-4">
        <p className="ui-label">Runner</p>
        <p className="mt-2 truncate text-sm text-[var(--bone)]">
          {profileName ?? "Profile"}
        </p>
      </div>
    </aside>
  );
}
