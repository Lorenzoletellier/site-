"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_QUANTITY = 48;

export type FormState = { error: string | null; success?: string | null };
export type CouponState = FormState & { code?: string | null; discountCents?: number | null };
export type CartResult = { ok: boolean; needsLogin?: boolean; error?: string };

// Ajoute (delta > 0) ou retire (delta < 0) des canettes du panier en base, plafonné au stock
export async function changeCartQuantity(productId: number, delta: number): Promise<CartResult> {
  if (!Number.isInteger(productId) || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > MAX_QUANTITY) {
    return { ok: false, error: "Requête invalide." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, needsLogin: true };

  const [{ data: product }, { data: existing }] = await Promise.all([
    supabase.from("products").select("stock, name").eq("id", productId).single(),
    supabase.from("cart_items").select("quantity").eq("user_id", user.id).eq("product_id", productId).maybeSingle(),
  ]);
  if (!product) return { ok: false, error: "Saveur introuvable." };

  const wanted = (existing?.quantity ?? 0) + delta;
  if (wanted <= 0) {
    await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
  } else {
    if (wanted > product.stock) return { ok: false, error: `Plus que ${product.stock} ${product.name} en stock.` };
    const { error } = await supabase
      .from("cart_items")
      .upsert({ user_id: user.id, product_id: productId, quantity: Math.min(wanted, MAX_QUANTITY) });
    if (error) return { ok: false, error: "Panier indisponible, réessaie." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

type Quote = { discount_cents: number; coupon_code: string | null; coupon_error: string | null; stock_issue: string | null };

// Le code est vérifié par cart_quote() en base : dates, limites, minimum d'achat, produit ciblé
export async function checkCoupon(_prev: CouponState, formData: FormData): Promise<CouponState> {
  const code = String(formData.get("coupon") ?? "").trim().toUpperCase();
  if (!code) return { error: null, code: null, discountCents: null };
  if (code.length > 40) return { error: "Code promo invalide ou expiré.", code: null, discountCents: null };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cart_quote", { p_coupon_code: code });
  const quote = data as Quote | null;
  if (error || !quote) return { error: "Vérification impossible, réessaie.", code: null, discountCents: null };
  if (quote.coupon_error) return { error: quote.coupon_error, code: null, discountCents: null };
  return { error: null, success: `${quote.coupon_code} : −${(quote.discount_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`, code: quote.coupon_code, discountCents: quote.discount_cents };
}

// Vrai si le panier dépasse le stock une fois la modification faite (unités et packs confondus)
async function stockProblem(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc("cart_quote", {});
  return (data as Quote | null)?.stock_issue ?? null;
}

const MAX_PACKS = 10;

// Ajoute un pack composé ; la base vérifie la composition (trigger) puis on contrôle le stock
export async function addPackToCart(packId: number, selections: Record<string, number>): Promise<CartResult> {
  const entries = Object.entries(selections ?? {});
  if (!Number.isInteger(packId) || entries.length === 0 || entries.length > 30
    || entries.some(([id, count]) => !/^[0-9]+$/.test(id) || !Number.isInteger(count) || count <= 0 || count > 24)) {
    return { ok: false, error: "Composition du pack invalide." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, needsLogin: true };

  const { data: row, error } = await supabase
    .from("cart_packs")
    .insert({ user_id: user.id, pack_id: packId, quantity: 1, selections: Object.fromEntries(entries) })
    .select("id")
    .single();
  // Les messages de la base (composition, pack indisponible) sont lisibles tels quels
  if (error || !row) return { ok: false, error: error?.code === "P0001" ? error.message : "Ajout impossible, réessaie." };

  const problem = await stockProblem(supabase);
  if (problem) {
    await supabase.from("cart_packs").delete().eq("id", row.id);
    return { ok: false, error: `Plus assez de stock pour ${problem}.` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePackQuantity(cartPackId: number, delta: number): Promise<CartResult> {
  if (!Number.isInteger(cartPackId) || (delta !== 1 && delta !== -1)) return { ok: false, error: "Requête invalide." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, needsLogin: true };

  // La RLS limite la lecture et l'écriture aux packs du client
  const { data: row } = await supabase.from("cart_packs").select("quantity").eq("id", cartPackId).maybeSingle();
  if (!row) return { ok: false, error: "Ce pack n'est plus dans ton panier." };
  const wanted = row.quantity + delta;

  if (wanted <= 0) {
    await supabase.from("cart_packs").delete().eq("id", cartPackId);
  } else {
    if (wanted > MAX_PACKS) return { ok: false, error: `${MAX_PACKS} packs maximum par commande.` };
    const { error } = await supabase.from("cart_packs").update({ quantity: wanted }).eq("id", cartPackId);
    if (error) return { ok: false, error: error.code === "P0001" ? error.message : "Panier indisponible, réessaie." };
    const problem = await stockProblem(supabase);
    if (problem) {
      await supabase.from("cart_packs").update({ quantity: row.quantity }).eq("id", cartPackId);
      return { ok: false, error: `Plus assez de stock pour ${problem}.` };
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

const ZIP_PATTERN = /^[0-9]{5}$/;

export async function placeOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("shipping_name") ?? "").trim();
  const address = String(formData.get("shipping_address") ?? "").trim();
  const city = String(formData.get("shipping_city") ?? "").trim();
  const zip = String(formData.get("shipping_zip") ?? "").trim();
  const coupon = String(formData.get("coupon") ?? "").trim();
  const method = String(formData.get("shipping_method") ?? "").trim();
  const relayPoint = String(formData.get("relay_point_label") ?? "").trim().slice(0, 200);

  if (!method) return { error: "Choisis un mode de livraison." };
  if (!name || !address || !city) return { error: "Remplis toutes les informations de livraison." };
  if (!ZIP_PATTERN.test(zip)) return { error: "Le code postal doit contenir 5 chiffres." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/commande");

  const { data: orderId, error } = await supabase.rpc("place_order", {
    p_shipping_name: name,
    p_shipping_address: address,
    p_shipping_city: city,
    p_shipping_zip: zip,
    p_coupon_code: coupon || null,
    p_shipping_method: method,
    p_relay_point_label: relayPoint || null,
  });
  // Les erreurs métier de place_order (stock, panier vide, code promo) sont lisibles telles quelles
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(`/compte/commandes/${orderId}?confirmee=1`);
}

export async function submitReview(productId: number, rating: number, comment: string): Promise<FormState> {
  if (!Number.isInteger(productId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Choisis une note entre 1 et 5." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi pour donner ton avis." };

  const { error } = await supabase.from("reviews").upsert(
    { product_id: productId, user_id: user.id, rating, comment: comment.trim().slice(0, 500) || null },
    { onConflict: "product_id,user_id" },
  );
  if (error) return { error: "Seuls les clients ayant acheté cette saveur peuvent la noter." };

  revalidatePath("/saveurs");
  return { error: null, success: "Merci pour ton avis !" };
}
