"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Can from "./Can";
import { addPackToCart } from "@/lib/shop-actions";
import { formatPrice, isSoldOut, type Flavor } from "@/lib/flavors";
import type { PackOffer } from "@/lib/queries";

const euros = (cents: number) => formatPrice(cents / 100);

type Props = { packs: PackOffer[]; flavors: Flavor[]; isLoggedIn: boolean };

// Pack à composer : le client choisit la taille puis répartit les canettes entre les saveurs.
// Prix et composition sont revérifiés en base à l'ajout (trigger cart_packs) et à la commande.
export default function PackBuilder({ packs, flavors, isLoggedIn }: Props) {
  const router = useRouter();
  const [packId, setPackId] = useState(packs[Math.min(1, packs.length - 1)]?.id ?? 0);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const pack = packs.find((p) => p.id === packId) ?? packs[0];
  const filled = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const full = filled === pack.size;
  const valueCents = flavors.reduce((sum, f) => sum + (counts[f.productId] ?? 0) * f.priceCents, 0);
  const savings = full ? valueCents - pack.priceCents : 0;

  const choosePack = (id: number) => {
    const next = packs.find((p) => p.id === id);
    if (!next) return;
    setPackId(id);
    setMessage(null);
    // On garde la sélection si elle tient dans le nouveau pack
    if (filled > next.size) setCounts({});
  };

  const step = (flavor: Flavor, delta: number) => {
    setMessage(null);
    setCounts((prev) => {
      const current = prev[flavor.productId] ?? 0;
      const next = Math.max(0, current + delta);
      const copy = { ...prev, [flavor.productId]: next };
      if (next === 0) delete copy[flavor.productId];
      return copy;
    });
  };

  const add = () => {
    if (!isLoggedIn) {
      router.push("/connexion?next=/saveurs%23packs");
      return;
    }
    startTransition(async () => {
      const result = await addPackToCart(pack.id, Object.fromEntries(Object.entries(counts).map(([id, n]) => [id, n])));
      if (result.needsLogin) {
        router.push("/connexion?next=/saveurs%23packs");
        return;
      }
      if (result.ok) {
        setMessage({ text: `${pack.name} ajouté au panier !` });
        setCounts({});
        router.refresh();
      } else {
        setMessage({ text: result.error ?? "Ajout impossible.", error: true });
      }
    });
  };

  return (
    <section id="packs" className="scroll-mt-24 bg-sky/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Packs</p>
        <h2 className="font-display mt-2 text-4xl font-extrabold sm:text-5xl">Compose ton pack.</h2>
        <p className="mt-4 max-w-xl text-lg text-ink/70">
          Choisis la taille, puis répartis tes canettes entre les saveurs. Plus le pack est grand, moins la canette coûte.
        </p>

        {/* Taille du pack */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Taille du pack">
          {packs.map((p) => {
            const active = p.id === pack.id;
            return (
              <button
                key={p.id}
                role="radio"
                aria-checked={active}
                onClick={() => choosePack(p.id)}
                className={`flex items-center justify-between gap-4 rounded-3xl border-2 p-5 text-left transition ${active ? "border-electric bg-white shadow-[0_16px_30px_-22px_rgb(28_47_232/0.6)]" : "border-ink/10 bg-white/60 hover:border-ink/30"}`}
              >
                <span>
                  <span className="block font-display text-2xl font-extrabold">{p.size} canettes</span>
                  <span className="text-sm text-ink/60">{euros(Math.round(p.priceCents / p.size))} la canette</span>
                </span>
                <span className="font-display text-2xl font-extrabold tabular-nums">{euros(p.priceCents)}</span>
              </button>
            );
          })}
        </div>

        {/* Répartition entre les saveurs */}
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {flavors.map((f) => {
            const n = counts[f.productId] ?? 0;
            const soldOut = isSoldOut(f);
            return (
              <li key={f.id} className={`flex flex-col items-center rounded-3xl bg-white/80 p-4 text-center ring-1 transition ${n > 0 ? "ring-electric" : "ring-ink/5"} ${soldOut ? "opacity-50" : ""}`}>
                <Can {...f} className={`h-24 transition duration-300 ${n > 0 ? "-translate-y-1 -rotate-6" : ""}`} />
                <p className="mt-2 text-sm leading-tight font-semibold">{f.name}</p>
                {soldOut ? (
                  <p className="mt-2 text-xs font-semibold text-ink/60">Épuisée</p>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => step(f, -1)} disabled={n === 0} className="h-8 w-8 rounded-full border border-ink/20 transition hover:border-ink/50 disabled:opacity-30" aria-label={`Retirer une ${f.name} du pack`}>−</button>
                    <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{n}</span>
                    <button onClick={() => step(f, 1)} disabled={full || n >= f.stock} className="h-8 w-8 rounded-full border border-ink/20 transition hover:border-ink/50 disabled:opacity-30" aria-label={`Ajouter une ${f.name} au pack`}>+</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Récapitulatif, collé en bas de l'écran pendant la composition */}
        <div className="sticky bottom-4 mt-8 rounded-3xl bg-navy p-5 text-cream shadow-[0_24px_40px_-24px_rgb(12_12_20/0.7)] sm:p-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="min-w-48 flex-1">
              <p className="font-semibold tabular-nums">
                {filled} / {pack.size} canettes {full ? "· pack complet" : `· encore ${pack.size - filled}`}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream/15" aria-hidden>
                <div className="h-full rounded-full bg-sky transition-[width] duration-300" style={{ width: `${(filled / pack.size) * 100}%` }} />
              </div>
            </div>
            <div className="text-right">
              {full && valueCents > pack.priceCents && (
                <p className="text-sm text-cream/70">
                  <s>{euros(valueCents)}</s> à l&apos;unité · tu économises <span className="font-semibold text-sky">{euros(savings)}</span>
                </p>
              )}
              <p className="font-display text-2xl font-extrabold tabular-nums">{euros(pack.priceCents)}</p>
            </div>
            <div className="flex gap-2">
              {filled > 0 && (
                <button onClick={() => { setCounts({}); setMessage(null); }} className="rounded-full px-4 py-3 text-sm font-semibold text-cream/80 transition hover:bg-cream/10">
                  Vider
                </button>
              )}
              <button onClick={add} disabled={!full || pending} className="btn btn-primary px-6 py-3" aria-busy={pending}>
                {pending ? "Ajout…" : "Ajouter le pack"}
              </button>
            </div>
          </div>
          <p aria-live="polite" className={`mt-2 min-h-5 text-sm font-semibold ${message?.error ? "text-corail" : "text-sky"}`}>{message?.text}</p>
        </div>
      </div>
    </section>
  );
}
