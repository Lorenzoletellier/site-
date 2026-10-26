import { createClient } from "@/lib/supabase/server";
import { toFlavor, type Flavor } from "@/lib/flavors";

// Toutes les saveurs en vente, dans l'ordre de création (ordre de la gamme)
export async function getFlavors(): Promise<Flavor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_catalog").select("*").eq("is_active", true).order("id");
  if (error) throw new Error(`Saveurs indisponibles : ${error.message}`);
  return data.map(toFlavor);
}

export type PublicReview = { id: number; productId: number; rating: number; comment: string; createdAt: string };

// Avis clients : seuls les acheteurs peuvent noter (RLS), la note moyenne porte sur tous les avis
export async function getReviewsSummary(): Promise<{ average: number; count: number; latest: PublicReview[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews").select("id, product_id, rating, comment, created_at").order("created_at", { ascending: false });
  if (error || !data || data.length === 0) return { average: 0, count: 0, latest: [] };
  const average = Math.round((data.reduce((sum, r) => sum + r.rating, 0) / data.length) * 10) / 10;
  const latest = data
    .filter((r) => r.comment && r.comment.trim().length > 0)
    .slice(0, 6)
    .map((r) => ({ id: r.id, productId: r.product_id, rating: r.rating, comment: r.comment!.trim(), createdAt: r.created_at }));
  return { average, count: data.length, latest };
}

export type CartLine ={ flavor: Flavor; quantity: number; lineCents: number };

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
