import type { Enums, Views } from "@/lib/supabase/database.types";

// Motif imprimé sur la canette (enum can_pattern en base)
export type Pattern = Enums<"can_pattern">;

export type Family = "fraiches" | "fruitees" | "gourmandes";

export const families: { id: Family; label: string }[] = [
  { id: "fraiches", label: "Fraîches" },
  { id: "fruitees", label: "Fruitées" },
  { id: "gourmandes", label: "Gourmandes" },
];

// Saveur telle qu'utilisée par les composants (même forme que le site Pétille d'origine),
// construite à partir de la vue product_catalog
export type Flavor = {
  id: string; // slug
  productId: number;
  family: Family;
  name: string;
  tagline: string;
  description: string;
  story: string;
  ingredients: string[];
  pairing: string;
  sugar: number;
  kcal: number;
  price: number; // euros
  priceCents: number;
  stock: number;
  color: string;
  accent: string;
  secondary: string;
  pattern: Pattern;
  avgRating: number;
  reviewCount: number;
};

export function toFlavor(row: Views<"product_catalog">): Flavor {
  return {
    id: row.slug ?? "",
    productId: row.id ?? 0,
    family: (row.category_slug ?? "fruitees") as Family,
    name: row.name ?? "",
    tagline: row.tagline ?? "",
    description: row.description ?? "",
    story: row.story ?? "",
    ingredients: row.ingredients ?? [],
    pairing: row.pairing ?? "",
    sugar: Number(row.sugar_g ?? 0),
    kcal: row.kcal ?? 0,
    price: (row.price_cents ?? 0) / 100,
    priceCents: row.price_cents ?? 0,
    stock: row.stock ?? 0,
    color: row.color ?? "#ffd84d",
    accent: row.accent ?? "#1a1a1a",
    secondary: row.secondary ?? "#ffffff",
    pattern: row.pattern ?? "bubbles",
    avgRating: Number(row.avg_rating ?? 0),
    reviewCount: row.review_count ?? 0,
  };
}

export const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const FREE_SHIPPING_CENTS = 2500;
export const SHIPPING_FEE_CENTS = 490;
export const LOW_STOCK = 24;
