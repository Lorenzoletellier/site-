"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Can from "./Can";
import ProductModal from "./ProductModal";
import { changeCartQuantity } from "@/lib/shop-actions";
import { families, formatPrice, LOW_STOCK, type Family, type Flavor } from "@/lib/flavors";

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
      setNotice(result.ok ? { id: flavor.id, text: "Ajoutée au panier !" } : { id: flavor.id, text: result.error ?? "Erreur", error: true });
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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((f) => {
            const inCart = cart[f.id] ?? 0;
            const soldOut = f.stock === 0;
            return (
              <article
                id={f.id}
                key={f.id}
                className="group flex scroll-mt-24 flex-col rounded-3xl p-6 transition hover:-translate-y-1"
                style={{ backgroundColor: `${f.color}22` }}
              >
                <button
                  onClick={() => setSelected(f)}
                  className="relative flex h-56 cursor-pointer items-center justify-center"
                  aria-label={`Voir la fiche ${f.name}`}
                >
                  <Can
                    name={f.name}
                    color={f.color}
                    accent={f.accent}
                    secondary={f.secondary}
                    pattern={f.pattern}
                    className="can-hover h-full drop-shadow-xl"
                  />
                  {soldOut ? (
                    <span className="absolute top-0 left-0 rounded-full bg-electric px-3 py-1 text-xs font-semibold text-cream">Épuisée</span>
                  ) : f.stock <= LOW_STOCK ? (
                    <span className="absolute top-0 left-0 rounded-full bg-white px-3 py-1 text-xs font-semibold">Plus que {f.stock}</span>
                  ) : null}
                </button>
                <div className="mt-6 flex items-baseline justify-between gap-4">
                  <h2 className="font-display text-2xl font-bold">{f.name}</h2>
                  <span className="font-semibold">{formatPrice(f.price)}</span>
                </div>
                <p className="text-sm font-medium text-ink/60">
                  {f.tagline}
                  {f.reviewCount > 0 && <> · ★ {f.avgRating} ({f.reviewCount} avis)</>}
                </p>
                <p className="mt-3 flex-1 text-ink/80">{f.description}</p>

                <div className="mt-5" aria-label={`${f.sugar} g de sucre pour 100 ml`}>
                  <div className="flex justify-between text-xs font-semibold text-ink/60">
                    <span>Sucre</span>
                    <span>{f.sugar} g / 100 ml · {f.kcal} kcal</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full" style={{ width: `${(f.sugar / 10) * 100}%`, backgroundColor: f.color }} />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setSelected(f)}
                    className="btn btn-ghost px-5 py-3"
                  >
                    Fiche
                  </button>
                  <button
                    onClick={() => add(f)}
                    disabled={soldOut || pendingId === f.id}
                    className="btn flex-1 py-3"
                    style={{ backgroundColor: f.color, color: f.accent }}
                  >
                    {soldOut ? "Épuisée" : pendingId === f.id ? "Ajout…" : inCart ? `Ajouter (${inCart} au panier)` : "Ajouter au panier"}
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
          La barre de sucre est comparée à un soda classique (environ 10 g / 100 ml).
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
