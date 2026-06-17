import type { ReactNode } from "react";

export function PageShell({
  title,
  children,
  eyebrow = "Treinante",
}: {
  title: string;
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <main className="min-h-screen flex-1 px-4 pb-24 pt-8 sm:pt-10 md:px-8 md:py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:gap-8">
        <header className="grid gap-5 border-b border-[var(--border)] pb-6 md:pb-8 lg:grid-cols-[7fr_5fr] lg:items-end">
          <div>
            <p className="ui-label">{eyebrow}</p>
            <h1 className="instrument-heading mt-3 text-4xl leading-none sm:text-5xl md:text-6xl">
              {title}
            </h1>
          </div>
          <div className="vbars hidden min-h-20 border-l border-[var(--border)] pl-4 sm:block" />
        </header>
        {children}
      </div>
    </main>
  );
}
