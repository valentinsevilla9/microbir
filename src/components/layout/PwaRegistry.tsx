"use client";

import { useEffect } from "react";

export default function PwaRegistry() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // En desarrollo un SW cacheando assets da problemas: fuera
      navigator.serviceWorker
        .getRegistrations()
        .then((registros) => registros.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Error registrando el Service Worker:", err);
    });
  }, []);

  return null;
}
