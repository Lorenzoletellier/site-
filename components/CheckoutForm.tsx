"use client";

import { useActionState, useState } from "react";
import Can from "./Can";
import { checkCoupon, placeOrder, type CouponState, type FormState } from "@/lib/shop-actions";
import { formatPrice } from "@/lib/flavors";
import type { Cart } from "@/lib/queries";
import { deliveryDelay, shippingFor, type ShippingMethod } from "@/lib/shipping";

const initialOrder: FormState = { error: null };
const initialCoupon: CouponState = { error: null, code: null, discountCents: null };
const euros = (cents: number) => formatPrice(cents / 100);

type Props = { cart: Cart; defaultName: string; methods: ShippingMethod[] };

export default function CheckoutForm({ cart, defaultName, methods }: Props) {
  const { lines, packs, subtotalCents } = cart;
  const [orderState, orderAction, ordering] = useActionState(placeOrder, initialOrder);
  const [couponState, couponAction, checking] = useActionState(checkCoupon, initialCoupon);
  const [coupon, setCoupon] = useState("");
  const [methodCode, setMethodCode] = useState(methods[0]?.code ?? "");
  const method = methods.find((m) => m.code === methodCode);
  const relay = method?.kind === "relay";

  // Aperçu : la remise vient de cart_quote() en base ; le montant payé est recalculé par place_order()
  const discount = couponState.discountCents ?? 0;
  const issues = [...lines.map((l) => l.issue), ...packs.map((p) => p.issue)].filter(Boolean) as string[];
  const savings = cart.savingsCents + discount;
  const shipping = method ? shippingFor(method, subtotalCents - discount) : 0;
  const total = subtotalCents - discount + shipping;

  return (
    <div className="grid gap-10 md:grid-cols-5 md:gap-12">
      <form id="checkout" action={orderAction} className="flex flex-col gap-4 md:col-span-3">
        <h2 className="font-display text-3xl font-extrabold">Livraison</h2>

        {/* Mode de livraison : tarifs et délais lus en base */}
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Mode de livraison</legend>
          {methods.map((m) => {
            const active = m.code === methodCode;
            const price = shippingFor(m, subtotalCents - discount);
            return (
              <label
                key={m.code}
                className={`relative flex cursor-pointer flex-col gap-1 rounded-3xl border-2 p-5 transition has-focus-visible:ring-4 has-focus-visible:ring-electric/30 ${active ? "border-electric bg-white shadow-[0_16px_30px_-22px_rgb(28_47_232/0.6)]" : "border-ink/10 bg-white/60 hover:border-ink/30"}`}
              >
                <input type="radio" name="shipping_method" value={m.code} checked={active} onChange={() => setMethodCode(m.code)} className="sr-only" />
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-lg font-bold">{m.name}</span>
                  <span className={`font-display text-lg font-extrabold tabular-nums ${price === 0 ? "text-electric" : ""}`}>
                    {price === 0 ? "Offerte" : euros(price)}
                  </span>
                </span>
                <span className="text-sm text-ink/65">{m.description}</span>
                <span className="text-xs font-semibold text-ink/50">Livré en {deliveryDelay(m)}</span>
                {active && (
                  <span className="absolute -top-2.5 -right-2.5 grid h-7 w-7 place-items-center rounded-full bg-electric text-cream" aria-hidden>
                    <svg viewBox="0 0 20 20" className="h-4 w-4"><path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                )}
              </label>
            );
          })}
        </fieldset>
        {methods.length === 0 && (
          <p className="rounded-2xl bg-white p-4 text-sm text-red-700">Aucun mode de livraison n&apos;est disponible pour le moment.</p>
        )}

        <label className="mt-2 flex flex-col gap-2 text-sm font-semibold">
          Prénom et nom
          <input name="shipping_name" required defaultValue={defaultName} autoComplete="name" className="field font-normal" />
        </label>

        {relay && (
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Point relais choisi
            <input
              name="relay_point_label"
              required
              maxLength={200}
              placeholder="Nom du commerce, ex. Tabac de la Gare"
              className="field font-normal"
            />
            <span className="text-xs font-normal text-ink/55">
              La carte des points relais Mondial Relay s&apos;affichera ici une fois le compte transporteur configuré.
            </span>
          </label>
        )}

        <label className="flex flex-col gap-2 text-sm font-semibold">
          {relay ? "Adresse du point relais" : "Adresse"}
          <input name="shipping_address" required autoComplete={relay ? "off" : "street-address"} className="field font-normal" />
        </label>
        <div className="grid grid-cols-[9rem_1fr] gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Code postal
            <input name="shipping_zip" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete={relay ? "off" : "postal-code"} className="field font-normal" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Ville
            <input name="shipping_city" required autoComplete={relay ? "off" : "address-level2"} className="field font-normal" />
          </label>
        </div>
        <input type="hidden" name="coupon" value={couponState.code ?? ""} />
        <div className="rounded-3xl bg-sky/40 p-5 text-sm">
          <p className="font-semibold">Paiement simulé</p>
          <p className="text-ink/70">Le paiement en ligne (Stripe) n&apos;est pas encore branché : la commande est enregistrée comme payée.</p>
        </div>
        <p aria-live="polite" className="min-h-5 text-sm font-semibold text-red-700">{orderState.error}</p>
      </form>

      <aside className="h-fit rounded-3xl bg-white p-6 ring-1 ring-ink/5 md:sticky md:top-24 md:col-span-2">
        <h2 className="font-display text-2xl font-bold">Ta commande</h2>
        <ul className="mt-4 space-y-3">
          {lines.map(({ flavor, quantity, lineCents }) => (
            <li key={flavor.id} className="flex items-center gap-3">
              <Can {...flavor} className="h-12 shrink-0" />
              <span className="flex-1 text-sm"><span className="font-semibold">{quantity} ×</span> {flavor.name}</span>
              <span className="text-sm font-semibold tabular-nums">{euros(lineCents)}</span>
            </li>
          ))}
          {packs.map((pack) => (
            <li key={pack.id} className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky/60 font-display text-sm font-extrabold text-navy">×{pack.size}</span>
              <span className="flex-1 text-sm">
                <span className="font-semibold">{pack.quantity} × {pack.name}</span>
                <span className="block text-xs text-ink/60">{pack.contents.map((c) => `${c.count} ${c.flavor.name}`).join(", ")}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{euros(pack.lineCents)}</span>
            </li>
          ))}
        </ul>
        {issues.length > 0 && (
          <ul role="alert" className="mt-4 space-y-1 rounded-2xl bg-corail/15 p-3 text-xs font-semibold text-red-800">
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        )}

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
          <div className="flex justify-between"><dt>Sous-total</dt><dd className="tabular-nums">{euros(subtotalCents)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-electric"><dt>Réduction</dt><dd className="tabular-nums">−{euros(discount)}</dd></div>}
          <div className="flex justify-between">
            <dt>Livraison{method ? ` · ${method.name}` : ""}</dt>
            <dd className="tabular-nums">{shipping === 0 ? "Offerte" : euros(shipping)}</dd>
          </div>
          <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{euros(total)}</dd></div>
          {savings > 0 && (
            <div className="flex justify-between rounded-xl bg-sky/40 px-3 py-2 font-semibold text-navy">
              <dt>Tu économises</dt><dd className="tabular-nums">{euros(savings)}</dd>
            </div>
          )}
        </dl>
        <button form="checkout" disabled={ordering || !method || issues.length > 0} className="btn btn-primary mt-4 w-full py-4">
          {ordering ? "Validation…" : `Payer ${euros(total)}`}
        </button>
      </aside>
    </div>
  );
}
