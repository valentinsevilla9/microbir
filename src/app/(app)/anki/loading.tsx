import { Skeleton } from "@/components/ui/Skeleton";

export default function AnkiLoading() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </header>

      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="flex justify-center gap-4">
            <Skeleton className="h-16 w-24" />
            <Skeleton className="h-16 w-24" />
            <Skeleton className="h-16 w-24" />
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row justify-center">
            <Skeleton className="h-12 w-full sm:w-48" />
            <Skeleton className="h-12 w-full sm:w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}
