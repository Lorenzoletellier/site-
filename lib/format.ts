// Les prix sont stockés en centimes (entiers) en base : on formate à l'affichage
const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatPrice(cents: number): string {
  return euro.format(cents / 100);
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export const ORDER_STATUS_LABELS = {
  pending: "En attente",
  paid: "Payée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
} as const;
