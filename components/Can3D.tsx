"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Can from "./Can";
import type { Flavor } from "@/lib/flavors";
import { hasWebGL } from "@/lib/webgl";

// three.js n'est chargé que dans le navigateur, et seulement quand une canette 3D est affichée
const Can3DScene = dynamic(() => import("./Can3DScene"), { ssr: false });

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
const noop = () => () => {};

type Props = {
  flavor: Flavor;
  className?: string;
  autoRotateSpeed?: number;
};

// Canette 3D d'une saveur. Tant que la scène charge, on affiche la canette en SVG à la place.
export default function Can3D({ flavor, className = "", autoRotateSpeed = 1.6 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const onReady = useCallback(() => setReady(true), []);

  // On ne charge la scène qu'à l'approche de l'écran, et on met le rendu en pause quand elle en sort
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setMounted(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`} role="img" aria-label={`Canette ${flavor.name} en 3D`}>
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        <Can {...flavor} className="h-[88%] drop-shadow-2xl" />
      </div>
      {mounted && webgl && (
        <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}>
          <Can3DScene
            flavor={flavor}
            active={visible}
            reducedMotion={reducedMotion}
            autoRotateSpeed={autoRotateSpeed}
            onReady={onReady}
          />
        </div>
      )}
    </div>
  );
}
