"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * Estado guardado en localStorage y compartido entre componentes y pestañas.
 *
 * - En el servidor (y durante la hidratación) devuelve `inicial`, así que
 *   no hay desajustes de HTML; justo después React pinta el valor guardado.
 * - Si localStorage no está disponible (modo privado, bloqueado...) sigue
 *   funcionando en memoria durante la sesión.
 *
 * `inicial` debe ser estable (un primitivo o una constante de módulo).
 */

const oyentes = new Map<string, Set<() => void>>();
const memoria = new Map<string, string | null>();
const cacheLecturas = new Map<string, { raw: string | null; valor: unknown }>();

function leer(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return memoria.get(clave) ?? null;
  }
}

function escribir(clave: string, raw: string | null) {
  memoria.set(clave, raw);
  try {
    if (raw === null) window.localStorage.removeItem(clave);
    else window.localStorage.setItem(clave, raw);
  } catch {
    // Sin localStorage: nos quedamos con la copia en memoria
  }
  oyentes.get(clave)?.forEach((avisar) => avisar());
}

function suscribir(clave: string, avisar: () => void) {
  let set = oyentes.get(clave);
  if (!set) {
    set = new Set();
    oyentes.set(clave, set);
  }
  set.add(avisar);

  const alCambiarEnOtraPestana = (e: StorageEvent) => {
    if (e.key === clave) avisar();
  };
  window.addEventListener("storage", alCambiarEnOtraPestana);

  return () => {
    set.delete(avisar);
    window.removeEventListener("storage", alCambiarEnOtraPestana);
  };
}

function snapshot<T>(clave: string, inicial: T): T {
  const raw = leer(clave);
  const cacheado = cacheLecturas.get(clave);
  if (cacheado && cacheado.raw === raw) return cacheado.valor as T;

  let valor: T = inicial;
  if (raw !== null) {
    try {
      valor = JSON.parse(raw) as T;
    } catch {
      valor = inicial;
    }
  }
  cacheLecturas.set(clave, { raw, valor });
  return valor;
}

export function usePersistentState<T>(
  clave: string,
  inicial: T
): [T, (siguiente: T | ((anterior: T) => T)) => void, () => void] {
  const valor = useSyncExternalStore(
    useCallback((avisar: () => void) => suscribir(clave, avisar), [clave]),
    () => snapshot(clave, inicial),
    () => inicial
  );

  const set = useCallback(
    (siguiente: T | ((anterior: T) => T)) => {
      const anterior = snapshot(clave, inicial);
      const nuevo =
        typeof siguiente === "function"
          ? (siguiente as (a: T) => T)(anterior)
          : siguiente;
      escribir(clave, JSON.stringify(nuevo));
    },
    [clave, inicial]
  );

  const borrar = useCallback(() => escribir(clave, null), [clave]);

  return [valor, set, borrar];
}
