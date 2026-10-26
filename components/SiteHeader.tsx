import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/flavors";
import { EMPTY_CART, getCart, getShippingMethods } from "@/lib/queries";
import HeaderNav from "./HeaderNav";

// Charge la session et le panier côté serveur, puis délègue l'affichage au composant client
export default async function SiteHeader() {
  const user = await getCurrentUser();
  const [cart, methods] = await Promise.all([
    user ? getCart(user.id) : Promise.resolve(EMPTY_CART),
    getShippingMethods(),
  ]);
  // Ex. « Livraison offerte en point relais · à domicile 2,00 € »
  const shippingNote = methods.length
    ? `Livraison ${methods.map((m) => (m.priceCents === 0 ? `offerte en ${m.name.toLowerCase()}` : `${m.name.toLowerCase()} ${formatPrice(m.priceCents / 100)}`)).join(" · ")}`
    : null;

  return (
    <HeaderNav
      isLoggedIn={Boolean(user)}
      isAdmin={user?.profile?.role === "admin"}
      firstName={user?.profile?.full_name?.split(" ")[0] ?? null}
      cart={cart}
      shippingNote={shippingNote}
    />
  );
}
