import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl p-4 bg-muted/20 border border-transparent">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </section>

      {/* MÓDULOS */}
      <section>
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <Skeleton className="h-10 w-10 rounded-xl mb-3" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
