import type { ReactNode } from "react";

export function PageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen flex-1 p-4 pb-20 md:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header>
          <h1 className="text-xl font-semibold text-gray-950 dark:text-white">
            {title}
          </h1>
        </header>
        {children}
      </div>
    </main>
  );
}
