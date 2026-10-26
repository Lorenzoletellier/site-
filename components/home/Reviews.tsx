import Link from "next/link";
import Can from "@/components/Can";
import { ArrowIcon } from "@/components/Icons";
import { flavorTone } from "@/lib/color";
import type { Flavor } from "@/lib/flavors";
import type { PublicReview } from "@/lib/queries";

type Props = { flavors: Flavor[]; average: number; count: number; latest: PublicReview[] };

function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} role="img" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-[1em] w-[1em]" aria-hidden>
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
            fill={i <= Math.round(value) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

// Avis vérifiés : la base n'accepte que les notes de clients ayant acheté la saveur
export default function Reviews({ flavors, average, count, latest }: Props) {
  const byProduct = new Map(flavors.map((f) => [f.productId, f]));

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-labelledby="avis-titre">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Avis clients</p>
          <h2 id="avis-titre" className="font-display mt-2 text-4xl font-extrabold sm:text-5xl">Ils l&apos;ont goûtée.</h2>
        </div>
        {count > 0 && (
          <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-3 ring-1 ring-ink/10">
            <span className="font-display text-4xl font-extrabold">{average.toLocaleString("fr-FR")}</span>
            <span>
              <Stars value={average} className="text-lg text-electric" />
              <span className="block text-sm text-ink/60">{count} avis vérifié{count > 1 ? "s" : ""}</span>
            </span>
          </div>
        )}
      </div>

      {latest.length > 0 ? (
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((r, i) => {
            const f = byProduct.get(r.productId);
            const tone = flavorTone(f?.color ?? "#1c2fe8");
            return (
              <li
                key={r.id}
                className={`relative flex flex-col overflow-hidden rounded-3xl p-6 pr-20 ${i % 3 === 1 ? "lg:translate-y-6" : ""}`}
                style={{ backgroundColor: tone.soft }}
              >
                <Stars value={r.rating} className="text-base" />
                <blockquote className="mt-3 flex-1 text-lg leading-snug">« {r.comment} »</blockquote>
                <p className="mt-5 text-sm text-ink/60">
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">
                    <svg viewBox="0 0 20 20" className="h-4 w-4 text-electric" aria-hidden>
                      <path d="M10 1l2.4 2 3.1-.3.7 3 2.6 1.8-1.3 2.8 1.3 2.8-2.6 1.8-.7 3-3.1-.3L10 19l-2.4-2-3.1.3-.7-3-2.6-1.8L2.5 10 1.2 7.3l2.6-1.8.7-3 3.1.3z" fill="currentColor" />
                      <path d="M6.5 10.2l2.3 2.3 4.7-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Achat vérifié
                  </span>
                  {f && <> · {f.name}</>} · {dateFormat.format(new Date(r.createdAt))}
                </p>
                {f && <Can {...f} className="absolute -right-3 -bottom-4 h-32 rotate-12 opacity-90" />}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-12 grid items-center gap-8 rounded-[2rem] border-2 border-dashed border-ink/15 bg-white/60 p-8 sm:p-12 md:grid-cols-[1fr_auto]">
          <div>
            <Stars value={0} className="text-2xl text-electric" />
            <h3 className="font-display mt-4 text-2xl font-bold sm:text-3xl">
              {count > 0 ? "Des notes, pas encore de mots." : "Les premiers avis arrivent bientôt."}
            </h3>
            <p className="mt-3 max-w-xl text-ink/70">
              Ici, pas d&apos;avis inventés : seuls les clients qui ont acheté une saveur peuvent la noter, depuis sa fiche.
              Goûte, puis dis-nous tout.
            </p>
          </div>
          <Link href="/saveurs" className="btn btn-primary justify-self-start px-7 py-3.5">
            Choisir ma première canette <ArrowIcon className="h-5 w-5" />
          </Link>
        </div>
      )}
    </section>
  );
}
