import type { CSSProperties, ReactNode } from "react";
import Can from "./Can";
import { heroFor } from "@/lib/flavor-hero";
import type { Flavor } from "@/lib/flavors";

// Places des fruits autour de la canette et gouttes qui tombent (x %, y %, taille px, décalage s)
const FRUIT_PLACES = [
  "top-[2%] left-[4%] w-28 -rotate-12 sm:w-36",
  "right-[2%] bottom-[18%] w-32 rotate-12 sm:w-40",
  "top-[8%] right-[10%] w-16 blur-[1px] sm:w-20",
];
const DROPS: [number, number, number, number][] = [[24, 34, 10, 0], [72, 10, 8, 1.2], [80, 48, 12, 2.1], [18, 60, 7, 2.8]];

type Props = {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  flavor?: Flavor;
  // La canette dépasse du bandeau : la section suivante doit réserver de la place en haut (pt-40)
  overflow?: boolean;
};

// Bandeau d'ouverture bleu cobalt : le menu passe dessus (voir HeaderNav), canette entourée de ses fruits
export default function BlueHero({ eyebrow, title, children, flavor, overflow = true }: Props) {
  const fruits = flavor ? heroFor(flavor).fruits : [];

  return (
    <section className="relative z-10 text-cream">
      <div className="absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(110%_90%_at_78%_35%,#2b3fd9_0%,#1a2bc2_38%,#101c7a_75%,#0b1450_100%)]" aria-hidden>
        {/* Grain de bulles très léger pour casser l'aplat */}
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_center,#fff4e3_1.2px,transparent_1.6px)] [background-size:22px_22px]" />
        <div className="absolute top-1/2 right-[8%] h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(247_220_133/0.28),transparent_65%)]" />
      </div>

      <div className={`mx-auto grid max-w-6xl items-center gap-6 px-4 pt-28 sm:px-6 sm:pt-32 md:grid-cols-[1.1fr_1fr] ${overflow ? "pb-16 md:pb-20" : "pb-12 md:pb-14"}`}>
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-sky uppercase">{eyebrow}</p>
          <h1 className="font-display mt-3 text-5xl leading-[1.02] font-extrabold tracking-[-0.02em] sm:text-7xl">{title}</h1>
          {children && <div className="mt-7 max-w-lg text-lg leading-relaxed text-cream sm:text-xl">{children}</div>}
        </div>

        {flavor && (
          <div className={`relative ${overflow ? "h-80 sm:h-[26rem]" : "hidden h-72 md:block md:h-80"}`}>
            {fruits.map((fruit, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={fruit}
                src={`/fruits/${fruit}.png`}
                alt=""
                aria-hidden
                className={`hero-float pointer-events-none absolute object-contain drop-shadow-[0_16px_18px_rgb(0_0_40/0.35)] ${FRUIT_PLACES[i % FRUIT_PLACES.length]}`}
                style={{ "--duration": `${6 + i}s`, "--float-delay": `${-i * 1.5}s` } as CSSProperties}
              />
            ))}
            {DROPS.map(([left, top, size, delay], i) => (
              <svg
                key={i}
                viewBox="0 0 12 16"
                className="drop-fall pointer-events-none absolute text-cream/70"
                style={{ left: `${left}%`, top: `${top}%`, width: size, "--delay": `${delay}s`, "--duration": `${3.5 + i * 0.4}s` } as CSSProperties}
                aria-hidden
              >
                <path d="M6 0C6 0 0 7.5 0 10.5a6 6 0 0 0 12 0C12 7.5 6 0 6 0Z" fill="currentColor" />
              </svg>
            ))}

            {/* Avec overflow, la canette dépasse du bandeau et son ombre douce tombe sur la page */}
            <div className={`absolute inset-x-0 flex flex-col items-center ${overflow ? "-bottom-24 sm:-bottom-32" : "bottom-0"}`}>
              <Can
                {...flavor}
                className={`float relative z-10 rotate-[6deg] drop-shadow-[0_30px_30px_rgb(5_10_60/0.35)] ${overflow ? "h-[23rem] sm:h-[29rem]" : "h-64 md:h-72"}`}
              />
              <span className={`-mt-6 h-8 w-44 rounded-[50%] blur-xl sm:w-52 ${overflow ? "bg-ink/25" : "bg-black/30"}`} aria-hidden />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
