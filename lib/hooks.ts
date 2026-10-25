"use client";

import { useSyncExternalStore } from "react";
import { hasWebGL } from "@/lib/webgl";

// Media query suivie en direct (faux côté serveur)
export function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const noop = () => () => {};
// Faux côté serveur, vrai une fois dans le navigateur
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
export const useWebGL = () => useSyncExternalStore(noop, hasWebGL, () => false);
export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
