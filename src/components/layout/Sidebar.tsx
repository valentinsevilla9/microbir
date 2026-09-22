"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import BotonPomodoroNav from "@/components/pomodoro/BotonPomodoroNav";
import { enlaces, esEnlaceActivo } from "./nav-links";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
      <div className="sticky top-0 flex h-screen flex-col p-5">
        {/* LOGO */}
        <Link
          href="/dashboard"
          className="group flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-md glow-primary">
            B
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight leading-none">
              BIR Prep
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Tu espacio de estudio
            </p>
          </div>
        </Link>

        {/* NAVEGACIÓN */}
        <nav className="mt-8 flex flex-1 flex-col gap-1.5">
          {enlaces.map((link) => {
            const isActive = esEnlaceActivo(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <div className={`${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {link.icon}
                </div>
                {link.label}

                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
          <BotonPomodoroNav />
        </nav>

        {/* BOTTOM */}
        <div className="space-y-3">
          <ThemeToggle />

          {/* Info versión */}
          <div className="rounded-xl bg-muted/50 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">BIR Prep · MVP</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Todos los módulos activos</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
