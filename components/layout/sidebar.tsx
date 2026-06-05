import Link from "next/link";

const navItems = [
  ["Dashboard", "/dashboard"],
  ["Runs", "/runs"],
  ["Records", "/records"],
  ["Fitness", "/fitness"],
  ["Predictor", "/predictor"],
  ["Segments", "/segments"],
  ["Reports", "/reports"],
  ["Tools", "/tools"],
  ["Settings", "/settings"],
] as const;

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 md:block">
      <Link
        href="/dashboard"
        className="font-semibold text-gray-950 no-underline dark:text-white"
      >
        RunMetrics
      </Link>
      <nav className="mt-8 flex flex-col gap-1">
        {navItems.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg px-3 py-2 text-sm text-gray-700 no-underline hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
