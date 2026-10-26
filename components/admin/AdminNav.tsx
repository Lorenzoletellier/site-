"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/produits", label: "Saveurs & stocks" },
  { href: "/admin/messages", label: "Messages" },
];

// Onglets de l'administration, posés sur le bandeau bleu : l'onglet actif est plein crème
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm font-semibold [scrollbar-width:none] sm:mx-0 sm:px-0">
      {LINKS.map(({ href, label }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2.5 whitespace-nowrap transition ${active ? "bg-cream text-navy shadow-[0_8px_20px_-10px_rgb(0_0_0/0.5)]" : "bg-cream/10 text-cream ring-1 ring-cream/15 hover:bg-cream/20"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
