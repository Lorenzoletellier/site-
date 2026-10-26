import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import Shop from "@/components/Shop";
import { getCurrentUser } from "@/lib/auth";
import PackBuilder from "@/components/PackBuilder";
import { getCart, getFlavors, getPacks } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Nos saveurs",
  description: "Les sodas artisanaux Pétille, bio et peu sucrés, en canettes 33 cl.",
};

export default async function SaveursPage() {
  const [flavors, user, packs] = await Promise.all([getFlavors(), getCurrentUser(), getPacks()]);
  const cart = user ? await getCart(user.id) : { lines: [] };
  const quantities = Object.fromEntries(cart.lines.map((line) => [line.flavor.id, line.quantity]));

  return (
    <>
      {/* Une saveur à la fois : canette 3D, fruits et sélecteur */}
      <Hero flavors={flavors} />
      <Shop flavors={flavors} cart={quantities} isLoggedIn={Boolean(user)} />
      {packs.length > 0 && <PackBuilder packs={packs} flavors={flavors} isLoggedIn={Boolean(user)} />}
    </>
  );
}
