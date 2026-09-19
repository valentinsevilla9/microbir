"use client";

import { useEffect } from 'react';

export default function PwaRegistry() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado correctamente');
        })
        .catch((err) => {
          console.log('Error registrando Service Worker: ', err);
        });
    }
  }, []);

  return null;
}
