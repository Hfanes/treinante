import { Sidebar } from "@/components/layout/sidebar";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      {children}
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-gray-200 bg-white text-xs dark:border-gray-800 dark:bg-gray-950 md:hidden">
        <Link className="p-3 text-center no-underline" href="/dashboard">
          Dashboard
        </Link>
        <Link className="p-3 text-center no-underline" href="/runs">
          Runs
        </Link>
        <Link className="p-3 text-center no-underline" href="/tools">
          Tools
        </Link>
        <Link className="p-3 text-center no-underline" href="/fitness">
          Fitness
        </Link>
        <Link className="p-3 text-center no-underline" href="/settings">
          More
        </Link>
      </nav>
    </div>
  );
}
