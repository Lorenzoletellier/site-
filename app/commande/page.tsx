import { redirect } from "next/navigation";
import type { Metadata } from "next";
import BlueHero from "@/components/BlueHero";
import CheckoutForm from "@/components/CheckoutForm";
import { requireUser } from "@/lib/auth";
import { formatPrice } from "@/lib/flavors";
import { getCart, getShippingMethods } from "@/lib/queries";

export const metadata: Metadata = { title: "Commande" };

export default async function CheckoutPage() {
  const user = await requireUser("/commande");
  const [cart, methods] = await Promise.all([getCart(user.id), getShippingMethods()]);
  if (cart.itemCount === 0) redirect("/saveurs");

  // Canettes au total (unités + contenu des packs) ; canette du bandeau : la saveur la plus présente
  const counts = new Map<string, { flavor: (typeof cart.lines)[number]["flavor"]; count: number }>();
  const addCount = (flavor: (typeof cart.lines)[number]["flavor"], count: number) =>
    counts.set(flavor.id, { flavor, count: (counts.get(flavor.id)?.count ?? 0) + count });
  cart.lines.forEach((l) => addCount(l.flavor, l.quantity));
  cart.packs.forEach((p) => p.contents.forEach((c) => addCount(c.flavor, c.count * p.quantity)));
  const cans = [...counts.values()].reduce((sum, c) => sum + c.count, 0);
  const main = [...counts.values()].sort((a, b) => b.count - a.count)[0].flavor;
  const offers = methods.map((m) => `${m.name.toLowerCase()} ${m.priceCents === 0 ? "offerte" : `à ${formatPrice(m.priceCents / 100)}`}`);

  return (
    <>
      <BlueHero eyebrow="Commande" title="Presque dans ta glacière." flavor={main} overflow={false}>
        {cans} canette{cans > 1 ? "s" : ""} dans ton panier.
        {offers.length > 0 && <> Livraison {offers.join(", ")}.</>}
      </BlueHero>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <CheckoutForm cart={cart} defaultName={user.profile?.full_name ?? ""} methods={methods} />
      </section>
    </>
  );
}
