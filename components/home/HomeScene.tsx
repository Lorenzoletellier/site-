"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type PointerEvent } from "react";
import Can from "@/components/Can";
import type { SceneControls } from "./HomeSceneCanvas";
import { sceneFor } from "@/lib/flavor-scene";
import { formatPrice, type Flavor } from "@/lib/flavors";
import { changeCartQuantity } from "@/lib/shop-actions";

// three.js n'est chargé que dans le navigateur
const HomeSceneCanvas = dynamic(() => import("./HomeSceneCanvas"), { ssr: false });

function useMedia(query: string) {
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

const mod = (n: number, m: number) => ((n % m) + m) % m;
const pad = (n: number) => String(n).padStart(2, "0");

function DottedChevron({ direction }: { direction: "left" | "right" }) {
  const dots = [[10, 2], [7, 6], [4, 10], [7, 14], [10, 18]];
  return (
    <svg viewBox="0 0 14 20" className={`h-6 w-4 ${direction === "right" ? "rotate-180" : ""}`} aria-hidden>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 2 ? 1.6 : 1.2} fill="currentColor" opacity={i === 2 ? 1 : 0.55} />
      ))}
    </svg>
  );
}

export default function HomeScene({ flavors }: { flavors: Flavor[] }) {
  const router = useRouter();
  const count = flavors.length;
  const section = useRef<HTMLElement>(null);
  const nameAnchor = useRef<HTMLDivElement>(null);
  const controls = useRef<SceneControls>({ target: 0, drag: 0, moved: false, pointer: { x: 0, y: 0 } });
  const press = useRef<{ x: number; dragging: boolean } | null>(null);

  const [target, setTarget] = useState(0);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const mobile = useMedia("(max-width: 767px)");
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");

  const activeIndex = mod(target, count);
  const active = flavors[activeIndex];
  const scene = sceneFor(active);
  const onReady = useCallback(() => setReady(true), []);

  const go = useCallback((delta: number) => {
    const next = controls.current.target + delta;
    controls.current.target = next;
    setTarget(next);
    setNotice(null);
  }, []);

  // Clic sur une canette latérale : on prend le chemin le plus court dans la boucle
  const select = useCallback(
    (index: number) => {
      let delta = mod(index - mod(controls.current.target, count), count);
      if (delta > count / 2) delta -= count;
      go(delta);
    },
    [count, go],
  );

  // Pause du rendu 3D quand la scène sort de l'écran
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Clavier : flèches pour changer de saveur, Échap pour fermer la fiche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!inView || (e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "Escape") setOpen(false);
      if (open) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, inView, open]);

  // Glisser à la souris ou au doigt (le défilement vertical reste à la page)
  const onPointerDown = (e: PointerEvent) => {
    controls.current.moved = false;
    if (open || (e.target as HTMLElement).closest("button, a, [data-panel]")) return;
    press.current = { x: e.clientX, dragging: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    const rect = section.current?.getBoundingClientRect();
    if (rect) {
      controls.current.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      controls.current.pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }
    const p = press.current;
    if (!p || !rect) return;
    const dx = e.clientX - p.x;
    if (!p.dragging && Math.abs(dx) > 8) {
      p.dragging = true;
      controls.current.moved = true;
    }
    if (p.dragging) controls.current.drag = -dx / (rect.width * (mobile ? 0.45 : 0.2));
  };
  const onPointerEnd = () => {
    const p = press.current;
    press.current = null;
    if (!p?.dragging) return;
    const next = Math.round(controls.current.target + controls.current.drag);
    controls.current.drag = 0;
    go(next - controls.current.target);
  };

  // Même comportement que le bouton « Ajouter au panier » de la boutique
  const add = () => {
    startTransition(async () => {
      const result = await changeCartQuantity(active.productId, 1);
      if (result.needsLogin) {
        router.push("/connexion?next=/");
        return;
      }
      setNotice(result.ok ? { text: "Ajoutée au panier !" } : { text: result.error ?? "Erreur", error: true });
      router.refresh();
    });
  };

  const gradient = `linear-gradient(90deg, ${flavors.map((f) => sceneFor(f).light).join(", ")})`;
  const progress = count > 1 ? activeIndex / (count - 1) : 0;

  return (
    <section
      ref={section}
      aria-label="Nos saveurs en 3D"
      className="relative h-[100svh] min-h-[620px] touch-pan-y overflow-hidden bg-[#070708] text-white select-none"
      style={{ background: "radial-gradient(120% 85% at 50% 100%, #26262b 0%, #121214 45%, #060607 100%)" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {/* Lueurs : la couleur de la saveur reste dans la lumière, jamais en aplat */}
      <div
        className="pointer-events-none absolute -bottom-[25%] left-1/2 h-[55vh] w-[80vw] -translate-x-1/2 rounded-full opacity-25 blur-[110px] transition-colors duration-700 motion-reduce:transition-none"
        style={{ backgroundColor: scene.light }}
      />
      <div
        className="pointer-events-none absolute -bottom-[30%] left-[30%] h-[40vh] w-[40vw] rounded-full opacity-15 blur-[120px] transition-colors duration-700 motion-reduce:transition-none"
        style={{ backgroundColor: scene.glow }}
      />
      <div
        className="pointer-events-none absolute -top-[12%] left-1/2 h-[30vh] w-[36vw] -translate-x-1/2 rounded-full opacity-20 blur-[90px] transition-colors duration-700 motion-reduce:transition-none"
        style={{ backgroundColor: scene.light }}
      />

      {/* Canette de secours le temps que la scène 3D charge */}
      <div className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        <Can {...active} className="h-[42%] -rotate-6 drop-shadow-2xl" />
      </div>

      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
        <HomeSceneCanvas
          flavors={flavors}
          activeIndex={activeIndex}
          open={open}
          mobile={mobile}
          reducedMotion={reducedMotion}
          running={inView}
          controls={controls}
          nameAnchor={nameAnchor}
          onSelect={select}
          onOpen={() => setOpen(true)}
          onReady={onReady}
        />
      </div>

      {/* Repères HUD */}
      <div aria-hidden className="pointer-events-none absolute inset-4 font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase sm:inset-6">
        <span className="absolute top-20 left-0 h-3 w-3 border-t border-l border-white/30" />
        <span className="absolute top-20 right-0 h-3 w-3 border-t border-r border-white/30" />
        <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-white/30" />
        <span className="absolute right-0 bottom-0 h-3 w-3 border-r border-b border-white/30" />
        <span className="absolute top-1/2 left-0 hidden -translate-y-1/2 [writing-mode:vertical-rl] sm:block">Gamme 2026</span>
        <span className="absolute top-1/2 right-0 hidden -translate-y-1/2 sm:block">
          {pad(activeIndex + 1)} / {pad(count)}
        </span>
        <span className="absolute bottom-1 left-6 hidden sm:block">33 cl · bio · France</span>
        <span className="absolute right-6 bottom-1 hidden sm:block">Glisser · ← →</span>
      </div>

      {!open && (
        <>
          {/* Flèches */}
          <button
            onClick={() => go(-1)}
            aria-label="Saveur précédente"
            className="absolute top-1/2 left-3 grid h-12 w-12 -translate-y-1/2 place-items-center text-white/80 transition hover:scale-110 hover:text-white sm:left-[calc(50%-15rem)]"
          >
            <DottedChevron direction="left" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Saveur suivante"
            className="absolute top-1/2 right-3 grid h-12 w-12 -translate-y-1/2 place-items-center text-white/80 transition hover:scale-110 hover:text-white sm:right-[calc(50%-15rem)]"
          >
            <DottedChevron direction="right" />
          </button>

          {/* Nom de la saveur, posé sur le socle (position suivie par la scène 3D) */}
          <div ref={nameAnchor} className="pointer-events-none absolute top-[74%] left-1/2 w-full -translate-x-1/2 -translate-y-[40%] px-4 text-center">
            <h1
              key={active.id}
              className="name-in font-hero text-[clamp(2.5rem,7.5vw,6.25rem)] leading-[0.84] font-black text-white uppercase italic"
              style={{ textShadow: `0 0 60px ${scene.light}55` }}
            >
              {active.name.split(" ").map((word) => (
                <span key={word} className="block">{word}</span>
              ))}
            </h1>
            <span className="sr-only">Pétille, {active.tagline}</span>
          </div>

          {/* Barre de progression dans la gamme */}
          <div className="absolute bottom-16 left-1/2 w-[min(30rem,72vw)] -translate-x-1/2 sm:bottom-8">
            <div className="relative h-[3px] rounded-full opacity-80" style={{ background: gradient }}>
              <span
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-[left,box-shadow] duration-700 ease-out motion-reduce:transition-none"
                style={{ left: `${progress * 100}%`, boxShadow: `0 0 18px 4px ${scene.light}` }}
              />
            </div>
            <p className="mt-4 text-center text-[11px] font-light tracking-[0.25em] text-white/50 uppercase">
              <span className="sm:hidden">Touche la canette</span>
              <span className="hidden sm:inline">Clique sur la canette pour la découvrir</span>
            </p>
          </div>
        </>
      )}

      {/* Fiche produit, dans la même scène */}
      {open && (
        <div
          data-panel
          role="dialog"
          aria-label={active.name}
          className="panel-in absolute inset-x-3 bottom-3 max-h-[52%] overflow-y-auto rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur-xl md:inset-x-auto md:top-1/2 md:right-[7%] md:bottom-auto md:max-h-[80%] md:w-[24rem] md:-translate-y-1/2 md:p-8"
        >
          <button onClick={() => setOpen(false)} aria-label="Fermer la fiche" className="absolute top-4 right-5 text-2xl leading-none text-white/70 hover:text-white">
            ×
          </button>
          <p className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: scene.light }}>{active.tagline}</p>
          <h2 className="font-hero mt-2 text-4xl leading-[0.9] font-black uppercase italic">{active.name}</h2>
          <p className="mt-4 font-light text-white/80">{active.description}</p>
          <p className="mt-4 text-sm font-light text-white/50">{active.ingredients.join(" · ")}</p>
          <p className="mt-3 text-sm font-light text-white/50">
            {active.sugar} g de sucre / 100 ml · {active.kcal} kcal · 33 cl
          </p>
          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="text-2xl font-semibold">{formatPrice(active.price)}</span>
            <button
              onClick={add}
              disabled={active.stock === 0 || pending}
              className="rounded-full bg-white px-6 py-3 font-semibold text-ink transition hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {active.stock === 0 ? "Épuisée" : pending ? "Ajout…" : "Ajouter au panier"}
            </button>
          </div>
          <p aria-live="polite" className={`mt-2 min-h-5 text-sm ${notice?.error ? "text-red-300" : "text-white/70"}`}>
            {notice?.text ?? ""}
          </p>
          <Link href={`/saveurs#${active.id}`} className="text-sm font-light text-white/60 underline-offset-4 hover:text-white hover:underline">
            Avis et accords sur la fiche complète →
          </Link>
        </div>
      )}
    </section>
  );
}
