"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const CLAVE = "bir-theme";

/**
 * Script que aplica el tema guardado ANTES del primer pintado (va en el
 * <head> del layout raíz). Sin él, en modo claro se veía un destello oscuro.
 */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("${CLAVE}");document.documentElement.classList.toggle("dark",t!=="light")}catch(e){}`;

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/* La fuente de verdad es la clase `dark` del <html> (la pone el script). */
const oyentes = new Set<() => void>();

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  return () => oyentes.delete(avisar);
}

function leerTema(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useSyncExternalStore(suscribir, leerTema, () => "dark" as Theme);

  const toggleTheme = () => {
    const next: Theme = leerTema() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(CLAVE, next);
    } catch {
      // Sin localStorage el tema dura hasta recargar
    }
    oyentes.forEach((avisar) => avisar());
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
