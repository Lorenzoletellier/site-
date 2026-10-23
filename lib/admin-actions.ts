"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Enums } from "@/lib/supabase/database.types";

// Double sécurité : la RLS refuse déjà les écritures des non-admins, on renvoie aussi l'intrus
async function adminClient() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");
  return supabase;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function slugify(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = Number(formData.get("order_id"));
  const status = String(formData.get("status")) as Enums<"order_status">;
  if (!Number.isInteger(orderId) || !Constants.public.Enums.order_status.includes(status)) return;
  const supabase = await adminClient();
  await supabase.from("orders").update({ status }).eq("id", orderId);
  revalidatePath("/admin", "layout");
}

export async function updateStock(formData: FormData) {
  const productId = Number(formData.get("product_id"));
  const stock = Number(formData.get("stock"));
  if (!Number.isInteger(productId) || !Number.isInteger(stock) || stock < 0 || stock > 99999) return;
  const supabase = await adminClient();
  await supabase.from("products").update({ stock }).eq("id", productId);
  revalidatePath("/", "layout");
}

export async function toggleProductActive(formData: FormData) {
  const productId = Number(formData.get("product_id"));
  const isActive = formData.get("is_active") === "true";
  if (!Number.isInteger(productId)) return;
  const supabase = await adminClient();
  await supabase.from("products").update({ is_active: !isActive }).eq("id", productId);
  revalidatePath("/", "layout");
}

export async function markContactHandled(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const supabase = await adminClient();
  await supabase.from("contact_messages").update({ is_handled: true }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function toggleWallMessage(formData: FormData) {
  const id = Number(formData.get("id"));
  const hidden = formData.get("is_hidden") === "true";
  if (!Number.isInteger(id)) return;
  const supabase = await adminClient();
  await supabase.from("wall_messages").update({ is_hidden: !hidden }).eq("id", id);
  revalidatePath("/", "layout");
}

export type ProductFormState = { error: string | null; success?: string | null };

export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  const name = get("name");
  const categoryId = Number(formData.get("category_id"));
  const price = Number(get("price").replace(",", "."));
  const sugar = Number(get("sugar").replace(",", "."));
  const kcal = Number(get("kcal"));
  const stock = Number(get("stock"));
  const pattern = get("pattern") as Enums<"can_pattern">;
  const [color, accent, secondary] = [get("color"), get("accent"), get("secondary")];
  const ingredients = get("ingredients").split(",").map((i) => i.trim()).filter(Boolean).slice(0, 12);

  if (name.length < 2 || name.length > 60) return { error: "Nom entre 2 et 60 caractères." };
  if (!Number.isInteger(categoryId)) return { error: "Choisis une famille." };
  if (!Number.isFinite(price) || price <= 0 || price > 100) return { error: "Prix invalide." };
  if (!Number.isFinite(sugar) || sugar < 0 || sugar > 15) return { error: "Sucre entre 0 et 15 g / 100 ml." };
  if (!Number.isInteger(kcal) || kcal < 0 || kcal > 200) return { error: "Calories entre 0 et 200." };
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock invalide." };
  if (!Constants.public.Enums.can_pattern.includes(pattern)) return { error: "Motif invalide." };
  if (![color, accent, secondary].every((c) => HEX_COLOR.test(c))) return { error: "Couleurs invalides." };

  const supabase = await adminClient();
  const { error } = await supabase.from("products").insert({
    name, slug: slugify(name), category_id: categoryId, price_cents: Math.round(price * 100),
    sugar_g: sugar, kcal, stock, pattern, color, accent, secondary, ingredients,
    tagline: get("tagline"), description: get("description"), story: get("description"), pairing: get("pairing"),
  });
  if (error) return { error: error.code === "23505" ? "Une saveur porte déjà ce nom." : "Création impossible." };

  revalidatePath("/", "layout");
  return { error: null, success: `« ${name} » ajoutée à la gamme.` };
}
