"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import Can from "@/components/Can";
import HeroFruits from "./HeroFruits";
import { HERO_SLUGS, heroFor, heroTitle } from "@/lib/flavor-hero";
import type { Flavor } from "@/lib/flavors";
import { useHydrated, useMedia, useReducedMotion, useWebGL } from "@/lib/hooks";

// La 3D n'est chargée que dans le navigateur
const HeroCan = dynamic(() => import("./HeroCan"), { ssr: false });

const TRANSITION_MS = 800;

export default function Hero({ flavors }: { flavors: Flavor[] }) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<{ index: number; key: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [openKey, setOpenKey] = useState(0);
  const [opening, setOpening] = useState(false);
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState(false);
  const mobile = useMedia("(max-width: 767px)");
  const reducedMotion = useReducedMotion();
  const hydrated = useHydrated();
  const webgl = useWebGL();
  const section = useRef<HTMLElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });

  const flavor = flavors[index];
  const hero = heroFor(flavor);
  const [line1, line2] = heroTitle(flavor, hero);
  const preload = useMemo(() => flavors.map((f) => f.id).filter((id) => HERO_SLUGS.includes(id)), [flavors]);

  // Couleurs de la saveur, animées par @property
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--hero-a", hero.background[0]);
    root.setProperty("--hero-b", hero.background[1]);
    root.setProperty("--hero-ink", hero.ink);
    root.setProperty("--hero-button", hero.button);
  }, [hero]);
  useEffect(
    () => () => ["--hero-a", "--hero-b", "--hero-ink", "--hero-button"].forEach((name) => document.documentElement.style.removeProperty(name)),
    [],
  );

  // Les fruits de l'ancienne saveur restent le temps de s'envoler
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLeaving(null), TRANSITION_MS);
    return () => clearTimeout(id);
  }, [leaving]);

  // La 3D ne se charge qu'à l'approche de la section, puis se met en pause quand elle sort de l'écran
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Parallaxe à la souris, lissée, transmise aux fruits par les variables --mx / --my
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

  function select(next: number) {
    if (next === index) return;
    setOpening(false);
    setLeaving((previous) => ({ index, key: (previous?.key ?? 0) + 1 }));
    setIndex(next);
  }

  // Sélecteur au clavier : flèches gauche / droite comme un groupe de boutons radio
  function onSelectorKey(event: KeyboardEvent<HTMLDivElement>) {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + flavors.length) % flavors.length;
    select(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[next]?.focus();
  }

  const old = leaving ? flavors[leaving.index] : null;

  return (
    <section
      ref={section}
      onPointerMove={onPointerMove}
      id="nos-saveurs"
      className="hero-bg relative h-[calc(100svh-4rem)] min-h-[600px] sm:h-[calc(100svh-5rem)] scroll-mt-16 overflow-clip"
      style={{ "--mx": 0, "--my": 0, color: "var(--hero-ink)" } as CSSProperties}
      aria-roledescription="carrousel"
      aria-label="Nos saveurs"
    >
      {/* Scène de la canette : fruits du fond, canette 3D, fruits du premier plan */}
      <div className="absolute inset-x-0 top-[7%] bottom-[40%] md:inset-y-0 md:left-[34%] md:w-[54%]">
        <div className="absolute top-1/2 left-1/2 aspect-square h-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-3xl" aria-hidden />

        {hydrated && old && <HeroFruits key={`back-${leaving!.key}`} hero={heroFor(old)} seed={leaving!.index} layer="back" mobile={mobile} leaving />}
        {hydrated && <HeroFruits key={`back-${flavor.id}`} hero={hero} seed={index} layer="back" mobile={mobile} />}

        <div className="absolute inset-0">
          <div className={`absolute inset-0 grid place-items-center transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`} aria-hidden>
            <Can {...flavor} className="h-[62%] rotate-[20deg] drop-shadow-2xl" />
          </div>
          {webgl && seen && (
            <HeroCan
              flavor={flavor}
              preload={preload}
              pointer={pointer}
              reducedMotion={reducedMotion}
              mobile={mobile}
              running={inView}
              onReady={() => setReady(true)}
              openKey={openKey}
            />
          )}
        </div>

        {hydrated && old && <HeroFruits key={`front-${leaving!.key}`} hero={heroFor(old)} seed={leaving!.index} layer="front" mobile={mobile} leaving />}
        {hydrated && <HeroFruits key={`front-${flavor.id}`} hero={hero} seed={index} layer="front" mobile={mobile} />}

      </div>

      {/* Nom, slogan et bouton */}
      <div className="absolute inset-x-0 bottom-[112px] px-6 font-serif md:inset-x-auto md:top-1/2 md:bottom-auto md:left-[5vw] md:max-w-[44vw] md:-translate-y-[58%] md:px-0">
        <h2 key={flavor.id} className="hero-title-in text-[clamp(2.6rem,12vw,3.75rem)] leading-[0.92] font-semibold tracking-[-0.025em] md:text-[clamp(3.5rem,8.4vw,9.5rem)]">
          {line1}
          {line2 && <span className="block">{line2}</span>}
        </h2>
        <p key={`slogan-${flavor.id}`} className="hero-title-in mt-3 text-[clamp(1.15rem,4.6vw,1.4rem)] font-light [animation-delay:80ms] md:mt-5 md:text-[clamp(1.25rem,2vw,2rem)]">
          {hero.slogan}
        </p>
        <Link
          href={`/saveurs#${flavor.id}`}
          className="mt-5 inline-flex items-center gap-4 rounded-full px-7 py-3.5 text-[1.05rem] shadow-[0_10px_30px_-12px_rgb(0_0_0/0.25)] transition hover:-translate-y-0.5 hover:brightness-95 md:mt-9 md:px-9 md:py-4 md:text-lg"
          style={{ backgroundColor: "var(--hero-button)" }}
        >
          Découvrir la saveur
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
            <path d="M3 12h18M15 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      {/* Sélecteur de saveurs et bouton d'ouverture, alignés sur une même ligne */}
      <div className="absolute inset-x-0 bottom-4 flex items-center gap-2 pr-4 font-serif md:right-[5vw] md:bottom-8 md:left-[5vw] md:gap-6 md:pr-0">
      <div
        role="radiogroup"
        aria-label="Choisir une saveur"
        onKeyDown={onSelectorKey}
        className="flex min-w-0 flex-1 snap-x gap-1 overflow-x-auto px-4 pt-2 pb-2 [scrollbar-width:none] md:max-w-[60vw] md:flex-none md:px-0"
      >
        {flavors.map((f, i) => {
          const active = i === index;
          const h = heroFor(f);
          return (
            <button
              key={f.id}
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => select(i)}
              className="group flex w-[74px] shrink-0 snap-start flex-col items-center gap-2 rounded-xl py-1 text-center"
            >
              <span
                className={`block h-8 w-8 rounded-full transition duration-300 group-hover:scale-110 md:h-9 md:w-9 ${active ? "outline-[1.5px] outline-offset-[5px] outline-solid" : ""}`}
                style={{ backgroundColor: h.button, outlineColor: h.ink, boxShadow: "inset 0 -3px 6px rgb(0 0 0 / 0.08)" }}
              />
              <span className={`text-[0.78rem] leading-tight transition ${active ? "font-medium" : "font-light opacity-75 group-hover:opacity-100"}`}>
                {f.name}
              </span>
            </button>
          );
        })}
      </div>

        {/* Ouvrir la canette : anneau, pschitt et gerbe de liquide */}
        {webgl && ready && (
          <button
            type="button"
            disabled={opening}
            aria-live="polite"
            aria-label={opening ? "Pschitt !" : "Ouvrir la canette"}
            onClick={() => {
              setOpenKey((k) => k + 1);
              setOpening(true);
              setTimeout(() => setOpening(false), 2800);
            }}
            className="group/open relative ml-auto flex shrink-0 items-center gap-2.5 rounded-full py-2 pr-5 pl-2 text-[0.95rem] font-medium shadow-[0_12px_30px_-14px_rgb(0_0_0/0.45)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-14px_rgb(0_0_0/0.5)] active:translate-y-0 active:scale-[0.97] disabled:cursor-default md:py-2.5 md:pr-6 md:text-base"
            style={{ backgroundColor: "var(--hero-button)", color: "var(--hero-ink)" }}
          >
            {/* Pastille blanche avec l'anneau d'ouverture, qui se soulève au survol */}
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/85 md:h-10 md:w-10" aria-hidden>
              <svg viewBox="0 0 24 24" className={`h-5 w-5 transition-transform duration-300 group-hover/open:-rotate-[25deg] ${opening ? "-rotate-[35deg]" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="15" rx="8" ry="3.2" />
                <path d="M8.5 13.2c0-2.6 1.6-4.2 3.5-4.2s3.5 1.6 3.5 4.2" />
                <circle cx="12" cy="11.6" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span>{opening ? "Pschitt !" : <>Ouvrir<span className="hidden sm:inline"> la canette</span></>}</span>
          </button>
        )}
      </div>
    </section>
  );
}
