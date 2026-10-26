"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Can from "./Can";
import ProductModal from "./ProductModal";
import { changeCartQuantity } from "@/lib/shop-actions";
import { families, formatPrice, isSoldOut, LOW_STOCK, type Family, type Flavor } from "@/lib/flavors";
import { flavorTone } from "@/lib/color";
import { heroFor } from "@/lib/flavor-hero";

// Repères de la barre de sucre : canette de 33 cl, soda classique à environ 10 g pour 100 ml
const CAN_CL = 33;
const CLASSIC_SUGAR = 10;

type Props = {
  flavors: Flavor[];
  cart: Record<string, number>; // slug -> quantité, lu en base
  isLoggedIn: boolean;
};

export default function Shop({ flavors, cart, isLoggedIn }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Flavor | null>(null);
  const [filter, setFilter] = useState<Family | "toutes">("toutes");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; text: string; error?: boolean } | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [, startTransition] = useTransition();
  const shown = filter === "toutes" ? flavors : flavors.filter((f) => f.family === filter);

  // Le panier est enregistré en base : sans compte, on renvoie vers la connexion
  const add = (flavor: Flavor) => {
    setPendingId(flavor.id);
    startTransition(async () => {
      const result = await changeCartQuantity(flavor.productId, 1);
      setPendingId(null);
      if (result.needsLogin) {
        router.push(`/connexion?next=/saveurs`);
        return;
      }
      if (result.ok) {
        // Confirmation dans le bouton pendant 2 s ; le compteur du menu suit grâce au rafraîchissement
        setNotice({ id: flavor.id, text: "Ajoutée au panier." });
        setAddedId(flavor.id);
        clearTimeout(addedTimer.current);
        addedTimer.current = setTimeout(() => setAddedId(null), 2000);
      } else {
        setNotice({ id: flavor.id, text: result.error ?? "Erreur", error: true });
      }
      router.refresh();
    });
  };

  return (
    <>
      <section id="saveurs" className="mx-auto max-w-6xl px-4 pt-16 pb-24 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">La gamme</p>
        <h1 className="font-display mt-2 text-4xl font-extrabold sm:text-6xl">
          {flavors.length} saveurs, zéro compromis.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink/70">
          Toutes nos canettes font 33 cl, sont bio et contiennent entre 3 et 7 g de sucre pour 100 ml. Ouvre une fiche
          pour voir les ingrédients, nos idées d&apos;accords et les avis.
        </p>

        <div className="mt-10 flex flex-wrap gap-2" role="group" aria-label="Filtrer les saveurs">
          {[{ id: "toutes" as const, label: "Toutes" }, ...families].map((fam) => {
            const active = filter === fam.id;
            const n = fam.id === "toutes" ? flavors.length : flavors.filter((f) => f.family === fam.id).length;
            return (
              <button
                key={fam.id}
                onClick={() => setFilter(fam.id)}
                aria-pressed={active}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-electric text-cream ring-2 ring-ink" : "bg-white text-ink ring-1 ring-ink/10 hover:ring-ink/40"
                }`}
              >
                {fam.label} <span className={active ? "text-cream/70" : "text-ink/40"}>{n}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {shown.map((f) => {
            const inCart = cart[f.id] ?? 0;
            const soldOut = isSoldOut(f);
            const tone = flavorTone(f.color);
            const pending = pendingId === f.id;
            const added = addedId === f.id;
            const perCan = Math.round(f.sugar * CAN_CL * 10) / 100;
            return (
              <article
                id={f.id}
                key={f.id}
                className="group flex scroll-mt-24 flex-col rounded-[1.75rem] p-5 ring-1 ring-ink/5 transition duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_24px_40px_-24px_rgb(12_12_20/0.35)] sm:p-6"
                style={{ backgroundColor: tone.soft }}
              >
                <button
                  onClick={() => setSelected(f)}
                  className="shop-stage relative flex h-72 cursor-pointer items-end justify-center pb-4 sm:h-[19rem]"
                  aria-label={`Voir la fiche ${f.name}`}
                >
                  <span className="shop-shadow absolute bottom-3 h-4 w-28 rounded-[50%] bg-ink/30 blur-md" aria-hidden />
                  <Can
                    name={f.name}
                    color={f.color}
                    accent={f.accent}
                    secondary={f.secondary}
                    pattern={f.pattern}
                    className="can-hover relative h-[94%] drop-shadow-[0_14px_14px_rgb(12_12_20/0.18)]"
                  />
                  {soldOut ? (
                    <span className="absolute top-0 left-0 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-cream">Épuisée</span>
                  ) : f.stock <= LOW_STOCK ? (
                    <span className="absolute top-0 left-0 rounded-full bg-white px-3 py-1 text-xs font-semibold">Plus que {f.stock}</span>
                  ) : null}
                </button>

                <div className="mt-5 flex items-baseline justify-between gap-3">
                  <h2 className="font-display truncate text-[1.6rem] leading-tight font-extrabold tracking-tight" title={f.name}>{f.name}</h2>
                  <span className="font-display shrink-0 text-xl font-bold tabular-nums">
                    {f.compareAtPriceCents && (
                      <s className="mr-1.5 text-sm font-semibold text-ink/45" aria-label={`au lieu de ${formatPrice(f.compareAtPriceCents / 100)}`}>
                        {formatPrice(f.compareAtPriceCents / 100)}
                      </s>
                    )}
                    {formatPrice(f.price)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: heroFor(f).ink }}>
                  {f.tagline}
                  {f.reviewCount > 0 && <span className="text-ink/55"> · ★ {f.avgRating} ({f.reviewCount} avis)</span>}
                </p>
                <p className="mt-3 line-clamp-3 min-h-[4.5em] flex-1 leading-normal text-ink/75">{f.description}</p>

                <div className="mt-5">
                  <div className="flex items-baseline justify-between gap-3 text-xs font-semibold">
                    <span className="text-ink/70">
                      Sucre : <span className="text-ink">{perCan.toLocaleString("fr-FR")} g</span> par canette
                    </span>
                    <span className="text-ink/50 tabular-nums">{f.sugar} g / 100 ml · {f.kcal} kcal</span>
                  </div>
                  <div
                    className="relative mt-2 h-1 rounded-full bg-ink/10"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={CLASSIC_SUGAR}
                    aria-valuenow={f.sugar}
                    aria-label={`${f.sugar} g de sucre pour 100 ml, contre ${CLASSIC_SUGAR} g pour un soda classique`}
                  >
                    <div className="h-full rounded-full" style={{ width: `${Math.min(f.sugar / CLASSIC_SUGAR, 1) * 100}%`, backgroundColor: tone.muted }} />
                    <span className="absolute -top-1 right-0 h-3 w-0.5 rounded-full bg-ink/40" aria-hidden />
                  </div>
                  <p className="mt-1.5 text-right text-[0.7rem] text-ink/50">Soda classique ≈ {(CLASSIC_SUGAR * CAN_CL) / 10} g</p>
                </div>

                <div className="mt-5 flex gap-2.5">
                  <button
                    onClick={() => setSelected(f)}
                    className="rounded-full border-2 border-ink/15 bg-white/70 px-5 py-3 font-semibold transition hover:border-ink/40 hover:bg-white active:scale-95"
                  >
                    Fiche
                  </button>
                  <button
                    onClick={() => add(f)}
                    disabled={soldOut || pending}
                    aria-busy={pending}
                    className={`btn btn-primary flex-1 py-3 ${added ? "!bg-navy" : ""}`}
                  >
                    {soldOut ? (
                      "Épuisée"
                    ) : pending ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream" aria-hidden /> Ajout…
                      </>
                    ) : added ? (
                      <>
                        <svg viewBox="0 0 20 20" className="added-pop h-5 w-5" aria-hidden>
                          <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Ajoutée !
                      </>
                    ) : inCart ? (
                      `Ajouter (${inCart} au panier)`
                    ) : (
                      "Ajouter au panier"
                    )}
                  </button>
                </div>
                <p aria-live="polite" className={`mt-2 min-h-5 text-sm ${notice?.error ? "text-red-700" : "text-ink/70"}`}>
                  {notice?.id === f.id ? notice.text : ""}
                </p>
              </article>
            );
          })}
        </div>
        <p className="mt-8 text-sm text-ink/50">
          La barre compare le sucre de chaque saveur à celui d&apos;un soda classique (environ 10 g pour 100 ml, soit 33 g
          par canette de 33 cl), repéré par le trait à droite.
          {!isLoggedIn && " Connecte-toi pour remplir ton panier : il est sauvegardé sur ton compte."}
        </p>
      </section>

      {selected && (
        <ProductModal
          flavor={selected}
          isLoggedIn={isLoggedIn}
          onClose={() => setSelected(null)}
          onAdd={() => add(selected)}
        />
      )}
    </>
  );
}
