"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Can from "./Can";
import { changeCartQuantity, changePackQuantity, type CartResult } from "@/lib/shop-actions";
import { formatPrice } from "@/lib/flavors";
import type { Cart } from "@/lib/queries";

type Props = { cart: Cart; isLoggedIn: boolean; shippingNote: string | null; onClose: () => void };

const euros = (cents: number) => formatPrice(cents / 100);

export default function CartDrawer({ cart, isLoggedIn, shippingNote, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { lines, packs, subtotalCents, savingsCents } = cart;
  const empty = cart.itemCount === 0;
  const blocked = [...lines, ...packs].some((line) => line.issue);

  // Fermer avec la touche Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = (action: () => Promise<CartResult>) =>
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? null);
      router.refresh();
    });

  const stepper = (label: string, quantity: number, onMinus: () => void, onPlus: () => void, plusDisabled: boolean) => (
    <div className="flex items-center gap-2">
      <button onClick={onMinus} disabled={pending} className="h-8 w-8 rounded-full border border-ink/20 transition hover:border-ink/50" aria-label={`Retirer ${label}`}>−</button>
      <span className="w-5 text-center font-semibold tabular-nums">{quantity}</span>
      <button onClick={onPlus} disabled={pending || plusDisabled} className="h-8 w-8 rounded-full border border-ink/20 transition hover:border-ink/50 disabled:opacity-30" aria-label={`Ajouter ${label}`}>+</button>
    </div>
  );

  // Prix modifié depuis l'ajout ou problème de stock, sous la ligne concernée
  const notes = (previousPriceCents: number | null, currentCents: number, issue: string | null) => (
    <>
      {previousPriceCents !== null && (
        <p className="text-xs font-semibold text-navy">Prix mis à jour : {euros(currentCents)} au lieu de {euros(previousPriceCents)}</p>
      )}
      {issue && <p className="text-xs font-semibold text-red-700">{issue}</p>}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-label="Fermer le panier" />
      <aside role="dialog" aria-modal="true" aria-label="Ton panier" className="relative flex h-full w-full max-w-md flex-col bg-cream p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Ton panier</h2>
          <button onClick={onClose} className="text-2xl leading-none" aria-label="Fermer">×</button>
        </div>

        {!isLoggedIn ? (
          <div className="mt-10">
            <p className="text-ink/60">Connecte-toi pour remplir ton panier : il est sauvegardé sur ton compte.</p>
            <Link href="/connexion?next=/saveurs" onClick={onClose} className="mt-6 inline-block btn btn-primary px-6 py-3">
              Se connecter
            </Link>
          </div>
        ) : empty ? (
          <p className="mt-10 text-ink/60">Ton panier est vide. Choisis une saveur ou compose ton pack !</p>
        ) : (
          <ul className={`mt-6 flex-1 space-y-3 overflow-y-auto ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
            {lines.map(({ flavor, quantity, previousPriceCents, issue }) => (
              <li key={flavor.id} className="flex items-center gap-4 rounded-2xl bg-white/70 p-3">
                <Can {...flavor} className="h-16 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{flavor.name}</p>
                  <p className="text-sm text-ink/60 tabular-nums">{euros(flavor.priceCents)}</p>
                  {notes(previousPriceCents, flavor.priceCents, issue)}
                </div>
                {stepper(`une ${flavor.name}`, quantity,
                  () => run(() => changeCartQuantity(flavor.productId, -1)),
                  () => run(() => changeCartQuantity(flavor.productId, 1)),
                  quantity >= flavor.stock)}
              </li>
            ))}
            {packs.map((pack) => (
              <li key={pack.id} className="flex items-center gap-4 rounded-2xl bg-white/70 p-3">
                <span className="grid h-16 w-12 shrink-0 place-items-center rounded-xl bg-sky/60 font-display text-sm font-extrabold text-navy" aria-hidden>
                  ×{pack.size}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{pack.name}</p>
                  <p className="truncate text-xs text-ink/60" title={pack.contents.map((c) => `${c.count} ${c.flavor.name}`).join(", ")}>
                    {pack.contents.map((c) => `${c.count} ${c.flavor.name}`).join(", ")}
                  </p>
                  <p className="text-sm text-ink/60 tabular-nums">{euros(pack.unitCents)}</p>
                  {notes(pack.previousPriceCents, pack.unitCents, pack.issue)}
                </div>
                {stepper(`un ${pack.name}`, pack.quantity,
                  () => run(() => changePackQuantity(pack.id, -1)),
                  () => run(() => changePackQuantity(pack.id, 1)),
                  pack.quantity >= 10)}
              </li>
            ))}
          </ul>
        )}

        {isLoggedIn && (
          <div className="mt-6 border-t border-ink/10 pt-4">
            {error && <p className="mb-2 text-sm text-red-700" role="alert">{error}</p>}
            {!empty && shippingNote && <p className="mb-2 text-sm text-ink/60">{shippingNote}.</p>}
            {savingsCents > 0 && (
              <p className="mb-2 flex justify-between rounded-xl bg-sky/40 px-3 py-2 text-sm font-semibold text-navy">
                <span>Tu économises</span><span className="tabular-nums">{euros(savingsCents)}</span>
              </p>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{euros(subtotalCents)}</span>
            </div>
            {!empty && !blocked ? (
              <Link href="/commande" onClick={onClose}
                className="mt-4 block w-full rounded-full bg-ink py-3 text-center font-semibold text-cream transition hover:opacity-90">
                Commander
              </Link>
            ) : (
              <button disabled className="mt-4 w-full rounded-full bg-ink py-3 font-semibold text-cream opacity-40">
                {blocked ? "Ajuste ton panier pour commander" : "Commander"}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
