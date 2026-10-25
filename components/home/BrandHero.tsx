"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Can from "@/components/Can";
import { heroFor } from "@/lib/flavor-hero";
import type { Flavor } from "@/lib/flavors";
import { useHydrated, useMedia, useReducedMotion, useWebGL } from "@/lib/hooks";

// three.js n'est téléchargé qu'après l'affichage : la composition SVG sert d'image de secours
const BrandCans = dynamic(() => import("./BrandCans"), { ssr: false });

// Canettes mises en avant (gauche, centre, droite), remplacées par les premières saveurs si absentes
const FEATURED = ["framboise-basilic", "citron-yuzu", "peche-gingembre"];

// Fruits autour des canettes, en % de la scène ; depth règle flou et parallaxe
const FRUIT_SLOTS = [
  { x: 7, y: 22, size: 19, depth: 1, rotate: -20 },
  { x: 93, y: 12, size: 17, depth: 1, rotate: 25 },
  { x: 95, y: 68, size: 22, depth: 2, rotate: -10 },
  { x: 6, y: 76, size: 21, depth: 2, rotate: 15 },
  { x: 52, y: 3, size: 13, depth: 0, rotate: 40 },
  { x: 72, y: 95, size: 15, depth: 0, rotate: -35 },
  { x: 30, y: 97, size: 13, depth: 0, rotate: 10 },
];

// Bulles qui montent : position horizontale (%), taille (px), durée et décalage (s)
const BUBBLES = [
  [8, 10, 9, 0], [18, 6, 7, 2.5], [30, 14, 11, 1], [41, 8, 8, 4], [55, 12, 10, 0.5], [63, 5, 6.5, 3],
  [72, 16, 12, 1.8], [81, 7, 7.5, 5], [90, 11, 9.5, 2.2], [96, 6, 8, 0.8], [47, 18, 13, 6], [24, 9, 9, 7],
] as const;

// Étoile à 12 branches. Coordonnées arrondies : Math.cos/sin ne donnent pas les mêmes
// dernières décimales côté serveur et navigateur, ce qui casserait l'hydratation.
const BURST_POINTS = Array.from({ length: 24 }, (_, i) => {
  const r = i % 2 ? 26 : 50;
  const a = (i / 24) * Math.PI * 2;
  return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

// Formes graphiques : elles dérivent avec le défilement (k = vitesse, spin = rotation par px)
function Burst({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon points={BURST_POINTS} fill="currentColor" />
    </svg>
  );
}

const SHAPES: { k: number; spin: number; className: string; node: React.ReactNode }[] = [
  { k: -0.25, spin: 0.08, className: "top-[14%] left-[46%] w-16 text-sky md:w-24", node: <Burst className="h-full w-full" /> },
  { k: 0.18, spin: -0.05, className: "bottom-[5%] left-[2%] hidden w-36 text-cream/70 md:block", node: (
    <svg viewBox="0 0 120 40" className="h-full w-full" aria-hidden>
      <path d="M4 20c12-18 22-18 34 0s22 18 34 0 22-18 34 0" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
    </svg>
  ) },
  { k: -0.4, spin: 0, className: "top-[22%] right-[4%] w-20 text-corail md:w-28", node: (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="12" />
    </svg>
  ) },
  { k: 0.3, spin: 0.12, className: "bottom-[8%] right-[30%] w-10 text-cream/80 md:w-14", node: <Burst className="h-full w-full" /> },
  { k: -0.15, spin: 0, className: "bottom-[4%] left-[40%] hidden w-28 text-electric-deep md:block", node: (
    <svg viewBox="0 0 100 50" className="h-full w-full" aria-hidden>
      <path d="M0 50a50 50 0 0 1 100 0Z" fill="currentColor" />
    </svg>
  ) },
];

export default function BrandHero({ flavors }: { flavors: Flavor[] }) {
  const byId = new Map(flavors.map((f) => [f.id, f]));
  const featured = FEATURED.map((id, i) => byId.get(id) ?? flavors[i % flavors.length]).filter(Boolean);
  const fruits = [...new Set(featured.flatMap((f) => heroFor(f).fruits))];

  const section = useRef<HTMLElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const mobile = useMedia("(max-width: 767px)");
  const reducedMotion = useReducedMotion();
  const hydrated = useHydrated();
  const webgl = useWebGL();
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Parallaxe souris (--mx / --my) et défilement (--sy), lissés, seulement quand le hero est visible
  useEffect(() => {
    const el = section.current;
    if (!el || reducedMotion || !inView) return;
    let raf = 0;
    const tick = () => {
      const p = pointer.current;
      p.x += (target.current.x - p.x) * 0.06;
      p.y += (target.current.y - p.y) * 0.06;
      el.style.setProperty("--mx", p.x.toFixed(3));
      el.style.setProperty("--my", p.y.toFixed(3));
      el.style.setProperty("--sy", String(Math.round(window.scrollY)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, inView]);

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    target.current = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
    };
  }

  return (
    <section
      ref={section}
      onPointerMove={onPointerMove}
      className="relative isolate overflow-hidden bg-electric text-cream"
      style={{ "--mx": 0, "--my": 0, "--sy": 0 } as CSSProperties}
    >
      {/* Halo et grain de profondeur derrière la composition */}
      <div className="pointer-events-none absolute top-[38%] left-1/2 -z-10 aspect-square w-[min(110vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(120_140_255/0.45),transparent_65%)] md:top-1/2 md:left-[72%]" aria-hidden />

      {/* Formes graphiques qui dérivent au défilement */}
      {SHAPES.map((shape, i) => (
        <div
          key={i}
          className={`pointer-events-none absolute -z-10 aspect-square ${shape.className}`}
          style={{ transform: `translateY(calc(var(--sy) * ${shape.k}px)) rotate(calc(var(--sy) * ${shape.spin}deg))` }}
          aria-hidden
        >
          {shape.node}
        </div>
      ))}

      {/* Bulles qui montent */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {BUBBLES.slice(0, mobile ? 7 : BUBBLES.length).map(([x, size, duration, delay], i) => (
          <span
            key={i}
            className="bubble-rise absolute bottom-0 rounded-full border-2 border-cream/50 bg-cream/10"
            style={{ left: `${x}%`, width: size, height: size, "--duration": `${duration}s`, "--delay": `${-delay}s` } as CSSProperties}
          />
        ))}
      </div>

      <div className="mx-auto grid min-h-[100svh] max-w-[1500px] grid-rows-[minmax(0,42svh)_auto] items-center gap-2 px-4 pt-16 pb-10 sm:px-[5vw] md:min-h-[min(100svh,960px)] md:grid-cols-[1.05fr_1fr] md:grid-rows-1 md:gap-8 md:pt-20 md:pb-14">
        {/* Composition : canettes, fruits devant et derrière */}
        <div className="relative h-full min-h-[280px] md:order-2 md:h-[min(72svh,680px)]">
          {hydrated &&
            FRUIT_SLOTS.slice(0, mobile ? 5 : FRUIT_SLOTS.length).map((slot, i) => {
              const kind = fruits[i % fruits.length];
              if (!kind) return null;
              const blur = slot.depth === 0 ? 3 : slot.depth === 2 ? 1 : 0;
              const parallax = [8, 18, 34][slot.depth];
              return (
                <div
                  key={i}
                  className={`pointer-events-none absolute ${slot.depth === 2 ? "z-20" : "z-0"}`}
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    width: `${slot.size}%`,
                    aspectRatio: "1",
                    transform: `translate(calc(-50% + var(--mx) * ${parallax}px), calc(-50% + var(--my) * ${parallax}px))`,
                  }}
                  aria-hidden
                >
                  <div className="fruit-in h-full w-full" style={{ "--from-x": "0", "--from-y": "6vmin", "--spin": "0deg", "--delay": `${200 + i * 70}ms` } as CSSProperties}>
                    <div className="hero-float h-full w-full" style={{ "--duration": `${6 + (i % 3)}s`, "--float-delay": `${-i}s` } as CSSProperties}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/fruits/${kind}.png`}
                        alt=""
                        draggable={false}
                        className="h-full w-full object-contain"
                        style={{ transform: `rotate(${slot.rotate}deg)`, filter: `${blur ? `blur(${blur}px) ` : ""}drop-shadow(0 18px 18px rgb(0 0 40 / 0.35))` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

          <div className="absolute inset-0 z-10">
            {/* Image de secours, affichée tout de suite (et seule sans WebGL) */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`} aria-hidden>
              {featured[0] && <Can {...featured[0]} className="relative top-[4%] left-[6%] h-[62%] rotate-[-18deg] drop-shadow-2xl" />}
              {featured[1] && <Can {...featured[1]} className="relative z-10 h-[76%] rotate-[7deg] drop-shadow-2xl" />}
              {featured[2] && <Can {...featured[2]} className="relative top-[3%] right-[6%] h-[62%] rotate-[19deg] drop-shadow-2xl" />}
            </div>
            {webgl && (
              <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} role="img" aria-label={`Canettes ${featured.map((f) => f.name).join(", ")}`}>
                <BrandCans flavors={featured} pointer={pointer} reducedMotion={reducedMotion} mobile={mobile} running={inView} onReady={onReady} />
              </div>
            )}
          </div>
        </div>

        {/* Titre, promesse et appels à l'action */}
        <div className="relative z-30 md:order-1">
          <h1 className="hero-title-in font-display text-[clamp(2.5rem,11.5vw,4rem)] leading-[0.88] font-extrabold tracking-[-0.03em] uppercase md:text-[clamp(3.6rem,6.6vw,7.4rem)]">
            La vie a plus de goût quand ça{" "}
            <span className="relative inline-block text-sky">
              pétille.
              <svg viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-[0.12em] left-0 h-[0.18em] w-full text-corail" aria-hidden>
                <path d="M3 16C60 4 120 4 180 12s90 6 117-4" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="hero-title-in mt-5 max-w-xl text-[1.05rem] leading-relaxed text-cream/90 [animation-delay:120ms] md:mt-7 md:text-xl">
            Des sodas bio, moins sucrés, pleins de caractère. Le plaisir de faire pop les bonnes choses.
          </p>
          <div className="hero-title-in mt-6 flex flex-wrap gap-3 [animation-delay:220ms] md:mt-9 md:gap-4">
            <Link href="/saveurs" className="btn btn-corail px-6 py-3.5 text-base md:px-8 md:py-4 md:text-lg">
              Découvrir nos sodas
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
                <path d="M4 12h16M14 6l6 6-6 6" />
              </svg>
            </Link>
            <a href="#quiz" className="btn btn-ghost px-6 py-3.5 text-base md:px-8 md:py-4 md:text-lg">
              Trouver ma saveur
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
