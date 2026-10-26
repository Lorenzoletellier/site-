// Livraison : types et calcul partagés entre le serveur et le navigateur (aucun accès à la base ici)

export type ShippingMethod = {
  code: string;
  name: string;
  description: string;
  kind: "home" | "express" | "relay";
  priceCents: number;
  freeThresholdCents: number | null;
  minDays: number;
  maxDays: number;
};

// Frais d'un mode pour un panier donné (même règle que place_order en base)
export function shippingFor(method: ShippingMethod, amountCents: number) {
  return method.freeThresholdCents !== null && amountCents >= method.freeThresholdCents ? 0 : method.priceCents;
}

// Délai annoncé, ex. « 3 à 5 jours »
export const deliveryDelay = (m: ShippingMethod) => (m.minDays === m.maxDays ? `${m.minDays} jours` : `${m.minDays} à ${m.maxDays} jours`);
