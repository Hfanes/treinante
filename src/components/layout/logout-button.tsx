"use client";

import { LogOut } from "lucide-react";

import { createBrowserClient } from "@/lib/supabase";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <button
      aria-label={collapsed ? "Log out" : undefined}
      className={`group relative flex items-center rounded-[2px] border border-[var(--border)] text-xs font-medium text-[var(--bone)] transition-[background-color,border-color,color] duration-200 ease-in-out hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] motion-reduce:transition-none ${
        collapsed ? "h-8 w-8 justify-center" : "h-10 w-full justify-start px-3"
      }`}
      onClick={handleLogout}
      type="button"
    >
      <LogOut aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
      <span
        className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-in-out motion-reduce:transition-none ${
          collapsed ? "ml-0 max-w-0 opacity-0" : "ml-3 max-w-32 opacity-100"
        }`}
      >
        Logout
      </span>
      {collapsed ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 max-w-[12rem] -translate-y-1/2 whitespace-nowrap border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--bone)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
          Logout
        </span>
      ) : null}
    </button>
  );
}
