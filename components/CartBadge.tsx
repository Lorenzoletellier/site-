"use client";

import { useState } from "react";

// Compteur du panier : « pop » quand le nombre augmente, pas au premier affichage
export default function CartBadge({ count }: { count: number }) {
  const [previous, setPrevious] = useState(count);
  const [popKey, setPopKey] = useState(0);

  // Ajustement d'état pendant le rendu quand la prop change (pattern React, sans effet)
  if (count !== previous) {
    if (count > previous) setPopKey(popKey + 1);
    setPrevious(count);
  }

  return (
    <span key={popKey} className={`grid h-6 min-w-6 place-items-center rounded-full bg-framboise px-1.5 font-sans text-xs font-bold text-cream ring-2 ring-cream ${popKey ? "badge-pop" : ""}`}>
      {count}
    </span>
  );
}
