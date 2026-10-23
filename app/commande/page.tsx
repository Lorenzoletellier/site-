import { redirect } from "next/navigation";
import type { Metadata } from "next";
import CheckoutForm from "@/components/CheckoutForm";
import PageHero from "@/components/PageHero";
import { requireUser } from "@/lib/auth";
import { getCart } from "@/lib/queries";

export const metadata: Metadata = { title: "Commande" };

export default async function CheckoutPage() {
  const user = await requireUser("/commande");
  const { lines, subtotalCents } = await getCart(user.id);
  if (lines.length === 0) redirect("/saveurs");

  const cans = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <>
      <PageHero eyebrow="Commande" title="Presque dans ta glacière.">
        {cans} canette{cans > 1 ? "s" : ""} dans ton panier. Livraison offerte dès 25 €.
      </PageHero>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <CheckoutForm lines={lines} subtotalCents={subtotalCents} defaultName={user.profile?.full_name ?? ""} />
      </section>
    </>
  );
}
