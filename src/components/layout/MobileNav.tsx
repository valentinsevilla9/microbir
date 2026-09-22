"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import BotonPomodoroNav from "@/components/pomodoro/BotonPomodoroNav";
import { enlaces, esEnlaceActivo } from "./nav-links";
import ThemeToggle from "./ThemeToggle";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const cerrar = () => setIsOpen(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-card px-4 h-14 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={cerrar}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-md glow-primary">
            B
          </div>
          <span className="text-sm font-bold tracking-tight">BIR Prep</span>
        </Link>

        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
          aria-label="Abrir menú"
          aria-expanded={isOpen}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </header>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={cerrar}
          />

          <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card border-r border-border p-5 flex flex-col md:hidden">
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/dashboard"
                className="group flex items-center gap-2.5"
                onClick={cerrar}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-md glow-primary">
                  B
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight leading-none">BIR Prep</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Tu espacio de estudio</p>
                </div>
              </Link>

              <button
                onClick={cerrar}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
                aria-label="Cerrar menú"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {enlaces.map((enlace) => {
                const activo = esEnlaceActivo(pathname, enlace.href);

                return (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    onClick={cerrar}
                    aria-current={activo ? "page" : undefined}
                    className={[
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      activo
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    ].join(" ")}
                  >
                    <span className={activo ? "text-primary" : "text-muted-foreground"}>
                      {enlace.icon}
                    </span>
                    {enlace.label}
                    {activo && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
              <BotonPomodoroNav onClick={cerrar} />
            </nav>

            <div className="mt-auto pt-5">
              <ThemeToggle />
            </div>
          </div>
        </>
      )}
    </>
  );
}
