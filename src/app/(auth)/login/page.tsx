import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar — BIR Prep",
  description: "Accede a tu plataforma personal de preparación BIR.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Fondo con gradientes */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg glow-primary">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            BIR Prep
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tu espacio personal de preparación
          </p>
        </div>

        {/* Card con formulario */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Plataforma privada · BIR Prep
        </p>
      </div>
    </div>
  );
}