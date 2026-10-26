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
  const [{ lines, subtotalCents }, methods] = await Promise.all([getCart(user.id), getShippingMethods()]);
  if (lines.length === 0) redirect("/saveurs");

  const cans = lines.reduce((sum, line) => sum + line.quantity, 0);
  // Canette du bandeau : la saveur la plus présente dans le panier
  const main = [...lines].sort((a, b) => b.quantity - a.quantity)[0].flavor;
  const offers = methods.map((m) => `${m.name.toLowerCase()} ${m.priceCents === 0 ? "offerte" : `à ${formatPrice(m.priceCents / 100)}`}`);

  return (
    <>
      <BlueHero eyebrow="Commande" title="Presque dans ta glacière." flavor={main} overflow={false}>
        {cans} canette{cans > 1 ? "s" : ""} dans ton panier.
        {offers.length > 0 && <> Livraison {offers.join(", ")}.</>}
      </BlueHero>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <CheckoutForm lines={lines} subtotalCents={subtotalCents} defaultName={user.profile?.full_name ?? ""} methods={methods} />
      </section>
    </>
  );
}
