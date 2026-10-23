"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Can from "./Can";
import { changeCartQuantity } from "@/lib/shop-actions";
import { formatPrice, FREE_SHIPPING_CENTS } from "@/lib/flavors";
import type { CartLine } from "@/lib/queries";

type Props = { lines: CartLine[]; subtotalCents: number; isLoggedIn: boolean; onClose: () => void };

export default function CartDrawer({ lines, subtotalCents, isLoggedIn, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const missing = Math.max(FREE_SHIPPING_CENTS - subtotalCents, 0);

  // Fermer avec la touche Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const change = (productId: number, delta: number) =>
    startTransition(async () => {
      const result = await changeCartQuantity(productId, delta);
      setError(result.error ?? null);
      router.refresh();
    });

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
            <Link href="/connexion?next=/saveurs" onClick={onClose} className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-semibold text-cream transition hover:scale-105">
              Se connecter
            </Link>
          </div>
        ) : lines.length === 0 ? (
          <p className="mt-10 text-ink/60">Ton panier est vide. Choisis une saveur !</p>
        ) : (
          <ul className={`mt-6 flex-1 space-y-4 overflow-y-auto ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
            {lines.map(({ flavor, quantity }) => (
              <li key={flavor.id} className="flex items-center gap-4 rounded-2xl bg-white/70 p-3">
                <Can {...flavor} className="h-16 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">{flavor.name}</p>
                  <p className="text-sm text-ink/60">{formatPrice(flavor.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => change(flavor.productId, -1)} disabled={pending} className="h-8 w-8 rounded-full border border-ink/20" aria-label={`Retirer une ${flavor.name}`}>−</button>
                  <span className="w-5 text-center font-semibold">{quantity}</span>
                  <button onClick={() => change(flavor.productId, 1)} disabled={pending || quantity >= flavor.stock} className="h-8 w-8 rounded-full border border-ink/20 disabled:opacity-30" aria-label={`Ajouter une ${flavor.name}`}>+</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {isLoggedIn && (
          <div className="mt-6 border-t border-ink/10 pt-4">
            {error && <p className="mb-2 text-sm text-red-700" role="alert">{error}</p>}
            {lines.length > 0 && missing > 0 && (
              <p className="mb-2 text-sm text-ink/60">Plus que {formatPrice(missing / 100)} pour la livraison offerte.</p>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(subtotalCents / 100)}</span>
            </div>
            {lines.length > 0 ? (
              <Link href="/commande" onClick={onClose}
                className="mt-4 block w-full rounded-full bg-ink py-3 text-center font-semibold text-cream transition hover:opacity-90">
                Commander
              </Link>
            ) : (
              <button disabled className="mt-4 w-full rounded-full bg-ink py-3 font-semibold text-cream opacity-40">Commander</button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
