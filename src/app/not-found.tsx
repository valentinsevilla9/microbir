import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold">Esta página no existe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Puede que el enlace esté mal o que la página se haya movido.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
