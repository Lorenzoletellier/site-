import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import Shop from "@/components/Shop";
import { getCurrentUser } from "@/lib/auth";
import { getCart, getFlavors } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Nos saveurs",
  description: "Les sodas artisanaux Pétille, bio et peu sucrés, en canettes 33 cl.",
};

export default async function SaveursPage() {
  const [flavors, user] = await Promise.all([getFlavors(), getCurrentUser()]);
  const cart = user ? await getCart(user.id) : { lines: [] };
  const quantities = Object.fromEntries(cart.lines.map((line) => [line.flavor.id, line.quantity]));

  return (
    <>
      {/* Une saveur à la fois : canette 3D, fruits et sélecteur */}
      <Hero flavors={flavors} />
      <Shop flavors={flavors} cart={quantities} isLoggedIn={Boolean(user)} />
    </>
  );
}
