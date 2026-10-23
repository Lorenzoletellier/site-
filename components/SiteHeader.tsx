import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/queries";
import HeaderNav from "./HeaderNav";

// Charge la session et le panier côté serveur, puis délègue l'affichage au composant client
export default async function SiteHeader() {
  const user = await getCurrentUser();
  const cart = user ? await getCart(user.id) : { lines: [], subtotalCents: 0 };

  return (
    <HeaderNav
      isLoggedIn={Boolean(user)}
      isAdmin={user?.profile?.role === "admin"}
      firstName={user?.profile?.full_name?.split(" ")[0] ?? null}
      lines={cart.lines}
      subtotalCents={cart.subtotalCents}
    />
  );
}
