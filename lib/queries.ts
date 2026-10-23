import { createClient } from "@/lib/supabase/server";
import { toFlavor, type Flavor } from "@/lib/flavors";

// Toutes les saveurs en vente, dans l'ordre de création (ordre de la gamme)
export async function getFlavors(): Promise<Flavor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_catalog").select("*").eq("is_active", true).order("id");
  if (error) throw new Error(`Saveurs indisponibles : ${error.message}`);
  return data.map(toFlavor);
}

export type CartLine = { flavor: Flavor; quantity: number; lineCents: number };

export async function getCart(userId: string): Promise<{ lines: CartLine[]; subtotalCents: number }> {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("cart_items").select("product_id, quantity").eq("user_id", userId).order("added_at");
  if (error) throw new Error(`Panier indisponible : ${error.message}`);
  if (items.length === 0) return { lines: [], subtotalCents: 0 };

  const { data: rows } = await supabase
    .from("product_catalog").select("*").in("id", items.map((i) => i.product_id));
  const byId = new Map((rows ?? []).map((row) => [row.id, toFlavor(row)]));

  const lines = items.flatMap((item) => {
    const flavor = byId.get(item.product_id);
    return flavor ? [{ flavor, quantity: item.quantity, lineCents: flavor.priceCents * item.quantity }] : [];
  });
  return { lines, subtotalCents: lines.reduce((sum, line) => sum + line.lineCents, 0) };
}
