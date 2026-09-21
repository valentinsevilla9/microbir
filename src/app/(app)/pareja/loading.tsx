import { Skeleton } from "@/components/ui/Skeleton";

export default function ParejaLoading() {
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
