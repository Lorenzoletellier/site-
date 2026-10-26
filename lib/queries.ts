import { createClient } from "@/lib/supabase/server";
import { isSoldOut, toFlavor, type Flavor } from "@/lib/flavors";
import type { ShippingMethod } from "@/lib/shipping";

// Toutes les saveurs en vente, dans l'ordre de création (ordre de la gamme)
export async function getFlavors(): Promise<Flavor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_catalog").select("*").eq("is_active", true).order("id");
  if (error) throw new Error(`Saveurs indisponibles : ${error.message}`);
  return data.map(toFlavor);
}

// Modes de livraison actifs, du moins cher au plus cher (prix et délais administrables en base)
export async function getShippingMethods(): Promise<ShippingMethod[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_methods")
    .select("code, name, description, kind, price_cents, extra_fee_cents, free_threshold_cents, min_days, max_days")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return data.map((m) => ({
    code: m.code,
    name: m.name,
    description: m.description,
    kind: m.kind,
    priceCents: m.price_cents + m.extra_fee_cents,
    freeThresholdCents: m.free_threshold_cents,
    minDays: m.min_days,
    maxDays: m.max_days,
  }));
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

// Ligne de panier : prix actuel, prix au moment de l'ajout (s'il a changé) et problème de stock éventuel
export type CartLine = {
  flavor: Flavor;
  quantity: number;
  lineCents: number;
  previousPriceCents: number | null;
  issue: string | null;
};

export type PackLine = {
  id: number; // ligne cart_packs
  packId: number;
  name: string;
  size: number;
  quantity: number;
  unitCents: number;
  lineCents: number;
  valueCents: number; // les mêmes canettes achetées à l'unité
  contents: { flavor: Flavor; count: number }[];
  previousPriceCents: number | null;
  issue: string | null;
};

export type Cart = {
  lines: CartLine[];
  packs: PackLine[];
  itemCount: number; // canettes à l'unité + packs
  subtotalCents: number;
  savingsCents: number; // prix barrés et remises des packs, hors code promo
};

export const EMPTY_CART: Cart = { lines: [], packs: [], itemCount: 0, subtotalCents: 0, savingsCents: 0 };

const stockIssue = (flavor: Flavor, needed: number) =>
  isSoldOut(flavor) ? `${flavor.name} est épuisée.` : flavor.stock < needed ? `Plus que ${flavor.stock} ${flavor.name} en stock.` : null;

// Panier du client : prix et stocks relus en base à chaque affichage ; le montant payé est recalculé par place_order
export async function getCart(userId: string): Promise<Cart> {
  const supabase = await createClient();
  const [{ data: items, error }, { data: packRows, error: packError }] = await Promise.all([
    supabase.from("cart_items").select("product_id, quantity, price_cents_at_add").eq("user_id", userId).order("added_at"),
    supabase
      .from("cart_packs")
      .select("id, pack_id, quantity, selections, price_cents_at_add, packs(name, size, price_cents, status)")
      .eq("user_id", userId)
      .order("added_at"),
  ]);
  if (error || packError) throw new Error(`Panier indisponible : ${(error ?? packError)!.message}`);
  if (items.length === 0 && packRows.length === 0) return EMPTY_CART;

  const selectionsOf = (value: unknown) =>
    Object.entries((value ?? {}) as Record<string, number>).map(([id, count]) => ({ id: Number(id), count: Number(count) }));
  const ids = new Set<number>(items.map((i) => i.product_id));
  packRows.forEach((row) => selectionsOf(row.selections).forEach(({ id }) => ids.add(id)));

  const { data: rows } = await supabase.from("product_catalog").select("*").in("id", [...ids]);
  const byId = new Map((rows ?? []).map((row) => [row.id, toFlavor(row)]));

  let savingsCents = 0;
  const lines: CartLine[] = items.flatMap((item) => {
    const flavor = byId.get(item.product_id);
    if (!flavor) return [];
    if (flavor.compareAtPriceCents) savingsCents += (flavor.compareAtPriceCents - flavor.priceCents) * item.quantity;
    return [{
      flavor,
      quantity: item.quantity,
      lineCents: flavor.priceCents * item.quantity,
      previousPriceCents: item.price_cents_at_add !== null && item.price_cents_at_add !== flavor.priceCents ? item.price_cents_at_add : null,
      issue: stockIssue(flavor, item.quantity),
    }];
  });

  const packs: PackLine[] = packRows.flatMap((row) => {
    if (!row.packs) return [];
    const contents = selectionsOf(row.selections).flatMap(({ id, count }) => {
      const flavor = byId.get(id);
      return flavor ? [{ flavor, count }] : [];
    });
    const valueCents = contents.reduce((sum, c) => sum + c.flavor.priceCents * c.count, 0) * row.quantity;
    const lineCents = row.packs.price_cents * row.quantity;
    savingsCents += Math.max(valueCents - lineCents, 0);
    const missing = contents.reduce((sum, c) => sum + c.count, 0) !== row.packs.size;
    return [{
      id: row.id,
      packId: row.pack_id,
      name: row.packs.name,
      size: row.packs.size,
      quantity: row.quantity,
      unitCents: row.packs.price_cents,
      lineCents,
      valueCents,
      contents,
      previousPriceCents: row.price_cents_at_add !== null && row.price_cents_at_add !== row.packs.price_cents ? row.price_cents_at_add : null,
      issue: row.packs.status !== "active" || missing
        ? "Ce pack n'est plus disponible tel quel."
        : contents.map((c) => stockIssue(c.flavor, c.count * row.quantity)).find(Boolean) ?? null,
    }];
  });

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineCents, 0) + packs.reduce((sum, p) => sum + p.lineCents, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0) + packs.reduce((sum, p) => sum + p.quantity, 0);
  return { lines, packs, itemCount, subtotalCents, savingsCents };
}

export type PackOffer = { id: number; name: string; size: number; priceCents: number };

// Packs à composer en vente, du plus petit au plus grand
export async function getPacks(): Promise<PackOffer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("packs")
    .select("id, name, size, price_cents")
    .eq("status", "active")
    .eq("is_customizable", true)
    .order("size");
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, size: p.size, priceCents: p.price_cents }));
}
