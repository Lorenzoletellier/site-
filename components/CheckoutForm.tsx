"use client";

import { useActionState, useState } from "react";
import Can from "./Can";
import { checkCoupon, placeOrder, type CouponState, type FormState } from "@/lib/shop-actions";
import { formatPrice, FREE_SHIPPING_CENTS, SHIPPING_FEE_CENTS } from "@/lib/flavors";
import type { CartLine } from "@/lib/queries";

const initialOrder: FormState = { error: null };
const initialCoupon: CouponState = { error: null, percent: null };
const euros = (cents: number) => formatPrice(cents / 100);

export default function CheckoutForm({ lines, subtotalCents, defaultName }: { lines: CartLine[]; subtotalCents: number; defaultName: string }) {
  const [orderState, orderAction, ordering] = useActionState(placeOrder, initialOrder);
  const [couponState, couponAction, checking] = useActionState(checkCoupon, initialCoupon);
  const [coupon, setCoupon] = useState("");

  // Aperçu côté client ; le montant réel est recalculé par place_order() en base
  const discount = Math.round((subtotalCents * (couponState.percent ?? 0)) / 100);
  const shipping = subtotalCents - discount >= FREE_SHIPPING_CENTS ? 0 : SHIPPING_FEE_CENTS;
  const total = subtotalCents - discount + shipping;

  return (
    <div className="grid gap-12 md:grid-cols-5">
      <form id="checkout" action={orderAction} className="flex flex-col gap-4 md:col-span-3">
        <h2 className="font-display text-3xl font-extrabold">Livraison</h2>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Prénom et nom
          <input name="shipping_name" required defaultValue={defaultName} autoComplete="name" className="field font-normal" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Adresse
          <input name="shipping_address" required autoComplete="street-address" className="field font-normal" />
        </label>
        <div className="grid grid-cols-[9rem_1fr] gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Code postal
            <input name="shipping_zip" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="postal-code" className="field font-normal" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Ville
            <input name="shipping_city" required autoComplete="address-level2" className="field font-normal" />
          </label>
        </div>
        <input type="hidden" name="coupon" value={couponState.percent ? coupon : ""} />
        <div className="rounded-3xl bg-sky/40 p-5 text-sm">
          <p className="font-semibold">Paiement simulé</p>
          <p className="text-ink/70">Projet étudiant : aucun paiement réel, la commande est enregistrée comme payée.</p>
        </div>
        <p aria-live="polite" className="min-h-5 text-sm font-semibold text-red-700">{orderState.error}</p>
      </form>

      <aside className="h-fit rounded-3xl bg-white p-6 ring-1 ring-ink/5 md:col-span-2 md:sticky md:top-24">
        <h2 className="font-display text-2xl font-bold">Ta commande</h2>
        <ul className="mt-4 space-y-3">
          {lines.map(({ flavor, quantity, lineCents }) => (
            <li key={flavor.id} className="flex items-center gap-3">
              <Can {...flavor} className="h-12 shrink-0" />
              <span className="flex-1 text-sm"><span className="font-semibold">{quantity} ×</span> {flavor.name}</span>
              <span className="text-sm font-semibold">{euros(lineCents)}</span>
            </li>
          ))}
        </ul>

        <form action={couponAction} className="mt-6 flex gap-2">
          <label htmlFor="coupon" className="sr-only">Code promo</label>
          <input id="coupon" name="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="Code promo" className="field py-2 uppercase" />
          <button disabled={checking || !coupon} className="btn btn-ghost px-4 text-sm">
            {checking ? "…" : "OK"}
          </button>
        </form>
        <p aria-live="polite" className={`mt-1 min-h-5 text-xs font-semibold ${couponState.error ? "text-red-700" : "text-ink/70"}`}>
          {couponState.error ?? couponState.success}
        </p>

        <dl className="mt-2 space-y-2 border-t border-ink/10 pt-4 text-sm">
          <div className="flex justify-between"><dt>Sous-total</dt><dd>{euros(subtotalCents)}</dd></div>
          {discount > 0 && <div className="flex justify-between"><dt>Réduction</dt><dd>−{euros(discount)}</dd></div>}
          <div className="flex justify-between"><dt>Livraison</dt><dd>{shipping === 0 ? "Offerte" : euros(shipping)}</dd></div>
          <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total</dt><dd>{euros(total)}</dd></div>
        </dl>
        <button form="checkout" disabled={ordering} className="btn btn-primary mt-4 w-full py-4">
          {ordering ? "Validation…" : `Payer ${euros(total)}`}
        </button>
      </aside>
    </div>
  );
}
