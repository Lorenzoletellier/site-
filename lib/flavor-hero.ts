import type { Flavor } from "@/lib/flavors";

// Mise en scène de chaque saveur dans le hero de l'accueil : slogan, couleurs pastel et fruits.
// Le nom, le prix et la description restent dans Supabase. Une saveur ajoutée depuis l'admin
// et absente d'ici reçoit des couleurs calculées à partir de sa couleur Supabase, sans fruits.

export type FlavorHero = {
  title?: [string, string]; // titre sur deux lignes (sinon déduit du nom)
  slogan: string;
  background: [string, string]; // dégradé pastel : bords, puis centre derrière la canette
  ink: string; // couleur foncée du titre et des textes
  button: string; // bouton et pastille du sélecteur
  juice: string; // teinte des éclaboussures
  fruits: string[]; // images public/fruits/<fruit>.png
};

const HEROES: Record<string, FlavorHero> = {
  "pasteque-hibiscus": {
    slogan: "L'été en une gorgée.",
    background: ["#fde8e6", "#f9bcc4"],
    ink: "#5a0f24",
    button: "#f6b3bd",
    juice: "#ffb3bd",
    fruits: ["watermelon-slice", "hibiscus"],
  },
  "citron-yuzu": {
    slogan: "Un zeste de soleil.",
    background: ["#fdf5d8", "#f7dc85"],
    ink: "#4a3a05",
    button: "#f6df85",
    juice: "#fff2b0",
    fruits: ["lemon", "lemon-slice", "yuzu"],
  },
  "myrtille-lavande": {
    slogan: "Une douceur de Provence.",
    background: ["#efe9fc", "#cdbdf3"],
    ink: "#2c1a5a",
    button: "#cbbcf3",
    juice: "#d6c8ff",
    fruits: ["blueberry", "lavender"],
  },
  "ananas-coco": {
    slogan: "Escapade sous les palmiers.",
    background: ["#fcf0dc", "#f4d398"],
    ink: "#4d3008",
    button: "#f3d59b",
    juice: "#fffaf0",
    fruits: ["pineapple-slice", "coconut-half"],
  },
  "framboise-basilic": {
    slogan: "Fruitée, avec une touche de jardin.",
    background: ["#fde6ec", "#f5b2c5"],
    ink: "#5c0b2c",
    button: "#f4aec2",
    juice: "#ffb8cb",
    fruits: ["raspberry", "basil"],
  },
  "peche-gingembre": {
    slogan: "Douce, avec du caractère.",
    background: ["#fdeadd", "#f9c3a3"],
    ink: "#5a2610",
    button: "#f8c3a3",
    juice: "#ffd9c2",
    fruits: ["peach", "peach-half", "ginger"],
  },
  "pomme-cannelle": {
    slogan: "Le verger en automne.",
    background: ["#eef6df", "#cfe6a6"],
    ink: "#2f3d0e",
    button: "#cfe6a8",
    juice: "#f3f8dc",
    fruits: ["apple", "apple-half", "cinnamon"],
  },
  "cola-vanille": {
    slogan: "Le classique, en plus doux.",
    background: ["#f5ebdf", "#e0c3a5"],
    ink: "#3b2112",
    button: "#e3c8ad",
    juice: "#f6e7d6",
    fruits: ["vanilla-pod", "vanilla-flower"],
  },
  "concombre-menthe": {
    slogan: "Fraîcheur absolue.",
    background: ["#e3f6ee", "#b2e5d1"],
    ink: "#0f3d31",
    button: "#b9e6d3",
    juice: "#e2f8ef",
    fruits: ["cucumber-slice", "mint"],
  },
};

// Éclaboussures communes à toutes les saveurs (public/fx/splash-<n>.png), teintées par `juice`
export const SPLASHES = ["splash-1", "splash-2", "splash-3"];

// Mélange deux couleurs hexadécimales (t = part de la seconde)
function mix(a: string, b: string, t: number) {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ca, cb] = [channels(a), channels(b)];
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

export function heroFor(flavor: Pick<Flavor, "id" | "color" | "tagline">): FlavorHero {
  const known = HEROES[flavor.id];
  if (known) return known;
  const color = /^#[0-9a-f]{6}$/i.test(flavor.color) ? flavor.color : "#ffd84d";
  return {
    slogan: flavor.tagline,
    background: [mix(color, "#ffffff", 0.92), mix(color, "#ffffff", 0.7)],
    ink: mix(color, "#000000", 0.7),
    button: mix(color, "#ffffff", 0.55),
    juice: mix(color, "#ffffff", 0.75),
    fruits: [],
  };
}

// "Citron Yuzu" -> ["Citron", "& Yuzu"]
export function heroTitle(flavor: Pick<Flavor, "id" | "name">, hero: FlavorHero): [string, string] {
  if (hero.title) return hero.title;
  const [first, ...rest] = flavor.name.split(" ");
  return rest.length ? [first, `& ${rest.join(" ")}`] : [first, ""];
}

// Saveurs mises en scène ici (elles ont aussi leur modèle public/models/petille-<slug>.glb)
export const HERO_SLUGS = Object.keys(HEROES);
