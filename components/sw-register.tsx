"use client";

import { useEffect } from "react";

// Registers /sw.js in production (the dev server rebuilds too often to cache).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("service worker registration failed", error);
    });
  }, []);
  return null;
}
