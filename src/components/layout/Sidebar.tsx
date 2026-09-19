"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

import { enlaces } from "./nav-links";

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

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

        {/* NAV */}
        <nav className="mt-8 flex-1 space-y-1">
          {enlaces.map((enlace) => {
            const activo =
              pathname === enlace.href ||
              (enlace.href !== "/dashboard" &&
                pathname.startsWith(enlace.href));

            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  activo
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                ].join(" ")}
              >
                <span
                  className={
                    activo ? "text-primary" : "text-muted-foreground"
                  }
                >
                  {enlace.icon}
                </span>
                {enlace.label}

                {activo && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM */}
        <div className="space-y-3">
          {/* Toggle tema */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            aria-label="Cambiar tema"
          >
            {theme === "dark" ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                Modo claro
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                Modo oscuro
              </>
            )}
          </button>

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