// Outils de couleur : les couleurs des saveurs (habillage des canettes, en base) sont
// adoucies dans l'interface pour rester proches de la palette bleue de Pétille.

const CREAM = "#fff4e3";
const NAVY = "#0b1450";

const isHex = (hex: string) => /^#[0-9a-f]{6}$/i.test(hex);

// Mélange deux couleurs hexadécimales (t = part de la seconde)
export function mix(a: string, b: string, t: number) {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ca, cb] = [channels(a), channels(b)];
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

// soft : fond de carte très pâle ; muted : touche de couleur (barres, pastilles, chiffres), tirée vers le bleu nuit
export function flavorTone(color: string) {
  const base = isHex(color) ? color : "#1c2fe8";
  return { soft: mix(base, CREAM, 0.88), muted: mix(base, NAVY, 0.32) };
}
