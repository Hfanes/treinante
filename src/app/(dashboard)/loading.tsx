import { Skeleton } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <main className="min-w-0 flex-1 px-4 pb-24 pt-8 sm:pt-10 md:px-8 md:py-16">
      <div className="mx-auto grid max-w-7xl gap-6">
        <div className="grid gap-4 border-b border-[var(--border)] pb-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-14 w-64" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80" />
      </div>
    </main>
  );
}
