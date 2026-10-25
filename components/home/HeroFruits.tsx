"use client";

import type { CSSProperties } from "react";
import { SPLASHES, type FlavorHero } from "@/lib/flavor-hero";

// Explosion de fruits autour de la canette, en images détourées sur trois plans de profondeur.
// Les positions sont en % de la « scène » (la boîte de la canette, centre = 50 % / 50 %).
// far : petits et flous, derrière ; mid : nets, autour de la canette ; near : grands et flous, devant.

type Depth = "far" | "mid" | "near";
type Slot = { x: number; y: number; size: number; depth: Depth; front?: boolean };

const DESKTOP: Slot[] = [
  { x: 4, y: 14, size: 11, depth: "far" },
  { x: 84, y: 8, size: 10, depth: "far" },
  { x: 106, y: 40, size: 12, depth: "far" },
  { x: 14, y: 84, size: 9, depth: "far" },
  { x: 76, y: 92, size: 11, depth: "far" },
  { x: 46, y: 2, size: 8, depth: "far" },
  { x: 12, y: 38, size: 22, depth: "mid" },
  { x: 82, y: 30, size: 24, depth: "mid" },
  { x: 86, y: 70, size: 20, depth: "mid" },
  { x: 24, y: 70, size: 20, depth: "mid", front: true },
  { x: 62, y: 76, size: 15, depth: "mid", front: true },
  { x: 112, y: 82, size: 44, depth: "near" },
  { x: 30, y: -4, size: 36, depth: "near" },
  { x: 104, y: 6, size: 26, depth: "near" },
];

const MOBILE: Slot[] = [
  { x: 10, y: 10, size: 12, depth: "far" },
  { x: 90, y: 16, size: 13, depth: "far" },
  { x: 80, y: 92, size: 11, depth: "far" },
  { x: 14, y: 52, size: 24, depth: "mid" },
  { x: 86, y: 56, size: 24, depth: "mid", front: true },
  { x: 100, y: 98, size: 34, depth: "near" },
];

const LOOK: Record<Depth, { blur: number; parallax: number; opacity: number }> = {
  far: { blur: 3, parallax: 10, opacity: 0.85 },
  mid: { blur: 0, parallax: 22, opacity: 1 },
  near: { blur: 9, parallax: 48, opacity: 0.95 },
};

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

// Gouttes : cercles brillants dessinés en CSS
const DROP_STYLE: CSSProperties = {
  background: "radial-gradient(circle at 32% 30%, #fff 0 16%, rgb(255 255 255 / 0.45) 34%, rgb(255 255 255 / 0.12) 68%, rgb(255 255 255 / 0.5) 100%)",
  boxShadow: "inset -1px -2px 3px rgb(0 0 0 / 0.08), 0 2px 4px rgb(0 0 0 / 0.06)",
};

type Props = {
  hero: FlavorHero;
  seed: number;
  layer: "back" | "front";
  mobile: boolean;
  leaving?: boolean;
};

export default function HeroFruits({ hero, seed, layer, mobile, leaving = false }: Props) {
  const rand = seeded(seed * 131 + 7);
  const slots = mobile ? MOBILE : DESKTOP;
  // Direction depuis la canette : les fruits jaillissent du centre et s'envolent vers l'extérieur
  const motion = (x: number, y: number) => {
    const dx = x - 50;
    const dy = y - 50;
    const length = Math.hypot(dx, dy) || 1;
    return {
      "--from-x": `${(-dx / length) * 18}vmin`,
      "--from-y": `${(-dy / length) * 18}vmin`,
      "--to-x": `${(dx / length) * 45}vmin`,
      "--to-y": `${(dy / length) * 45 - 10}vmin`,
      "--spin": `${(rand() - 0.5) * 180}deg`,
      "--delay": `${Math.round(rand() * 220)}ms`,
    } as CSSProperties;
  };
  const animation = leaving ? "fruit-out" : "fruit-in";

  const fruits =
    hero.fruits.length === 0
      ? []
      : slots
          .map((slot, i) => ({ slot, kind: hero.fruits[(i + seed) % hero.fruits.length], rotate: (rand() - 0.5) * 80 }))
          .filter(({ slot }) => (layer === "front" ? slot.front || slot.depth === "near" : !slot.front && slot.depth !== "near"));

  const splashes =
    layer === "back"
      ? (mobile ? SPLASHES.slice(0, 1) : SPLASHES.slice(0, 2)).map((name, i) => ({
          name,
          x: i === 0 ? 50 : 56,
          y: i === 0 ? 74 : 34,
          width: i === 0 ? 95 : 70,
          rotate: i === 0 ? -8 : 160,
        }))
      : [];

  const drops =
    layer === "front"
      ? Array.from({ length: mobile ? 7 : 16 }, () => ({ x: 15 + rand() * 75, y: 8 + rand() * 84, size: 5 + rand() * 13 }))
      : [];

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {splashes.map((s) => (
        <div
          key={s.name}
          className="absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.width}%`, aspectRatio: "4 / 3", transform: `translate(-50%, -50%) rotate(${s.rotate}deg)` }}
        >
          <div className={`h-full w-full ${animation}`} style={motion(s.x, s.y)}>
            {/* Éclaboussure blanche teintée à la couleur de la saveur */}
            <div
              className="relative h-full w-full opacity-90"
              style={{ maskImage: `url(/fx/${s.name}.png)`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/fx/${s.name}.png`} alt="" className="absolute inset-0 h-full w-full object-contain" />
              <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: hero.juice }} />
            </div>
          </div>
        </div>
      ))}

      {fruits.map(({ slot, kind, rotate }, i) => {
        const look = LOOK[slot.depth];
        return (
          <div
            key={`${kind}-${i}`}
            className="absolute"
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.size}%`,
              aspectRatio: "1",
              transform: `translate(calc(-50% + var(--mx) * ${look.parallax}px), calc(-50% + var(--my) * ${look.parallax}px))`,
            }}
          >
            <div className={`h-full w-full ${animation}`} style={motion(slot.x, slot.y)}>
              <div
                className="hero-float h-full w-full will-change-transform"
                style={{ "--duration": `${6 + rand() * 4}s`, "--float-delay": `${-rand() * 6}s` } as CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/fruits/${kind}.png`}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-contain"
                  style={{
                    transform: `rotate(${rotate}deg)`,
                    filter: `${look.blur ? `blur(${mobile ? look.blur * 0.6 : look.blur}px) ` : ""}drop-shadow(0 18px 18px rgb(0 0 0 / 0.12))`,
                    opacity: look.opacity,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {drops.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            transform: `translate(calc(-50% + var(--mx) * 30px), calc(-50% + var(--my) * 30px))`,
          }}
        >
          <span className={`block h-full w-full ${animation}`} style={motion(d.x, d.y)}>
            <span className="hero-float block h-full w-full rounded-full" style={{ ...DROP_STYLE, "--duration": `${4 + rand() * 3}s` } as CSSProperties} />
          </span>
        </span>
      ))}
    </div>
  );
}
