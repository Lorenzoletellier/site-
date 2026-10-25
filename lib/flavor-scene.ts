import type { Flavor } from "@/lib/flavors";

// Mise en scène de chaque saveur sur la page d'accueil : la couleur de la lumière (halo, socle,
// reflets, barre de progression) et les fruits qui flottent derrière la canette.
// Une saveur ajoutée depuis l'admin et absente d'ici reprend sa couleur Supabase, sans fruits.

export type FruitKind =
  | "watermelon"
  | "hibiscus"
  | "lemon-slice"
  | "lemon"
  | "yuzu"
  | "blueberry"
  | "lavender"
  | "pineapple"
  | "coconut"
  | "raspberry"
  | "basil"
  | "peach"
  | "ginger"
  | "apple"
  | "cinnamon"
  | "vanilla-pod"
  | "vanilla-flower"
  | "cucumber-slice"
  | "mint";

export type FlavorScene = {
  light: string; // couleur principale de la lumière
  glow: string; // seconde teinte, pour la lueur du bas
  fruits: FruitKind[];
};

const SCENES: Record<string, FlavorScene> = {
  "pasteque-hibiscus": { light: "#ff4d6d", glow: "#ff8fa3", fruits: ["watermelon", "hibiscus"] },
  "citron-yuzu": { light: "#ffd23f", glow: "#fff1a8", fruits: ["lemon-slice", "lemon", "yuzu"] },
  "myrtille-lavande": { light: "#8b6cff", glow: "#c3b5ff", fruits: ["blueberry", "lavender"] },
  "ananas-coco": { light: "#ffd166", glow: "#fff3d6", fruits: ["pineapple", "coconut"] },
  "framboise-basilic": { light: "#ff3e7f", glow: "#6fd67a", fruits: ["raspberry", "basil"] },
  "peche-gingembre": { light: "#ff9f6b", glow: "#ffd0b0", fruits: ["peach", "ginger"] },
  "pomme-cannelle": { light: "#8ee35a", glow: "#d9a066", fruits: ["apple", "cinnamon"] },
  "cola-vanille": { light: "#c8834f", glow: "#f3dfc1", fruits: ["vanilla-pod", "vanilla-flower"] },
  "concombre-menthe": { light: "#6fe3c1", glow: "#c9fff0", fruits: ["cucumber-slice", "mint"] },
};

export function sceneFor(flavor: Pick<Flavor, "id" | "color">): FlavorScene {
  return SCENES[flavor.id] ?? { light: flavor.color, glow: flavor.color, fruits: [] };
}

// Fruits pour lesquels une image détourée existe dans public/fruits/<fruit>.png.
// Ajoute le nom du fruit ici après avoir déposé son image : elle remplace alors la forme 3D.
export const FRUIT_IMAGES: FruitKind[] = [];
