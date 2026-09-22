export default function OficialLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Cargando el simulacro oficial...
      </p>
    </div>
  );
}
