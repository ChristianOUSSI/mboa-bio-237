"use client";

import { useEffect } from "react";

/** Enregistre le service worker pour le mode PWA offline-first. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed:", err));
    }
  }, []);
  return null;
}
