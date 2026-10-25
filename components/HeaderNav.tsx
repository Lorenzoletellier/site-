"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CartDrawer from "./CartDrawer";
import CartBadge from "./CartBadge";
import { signOut } from "@/lib/auth-actions";
import type { CartLine } from "@/lib/queries";

const links = [
  { href: "/saveurs", label: "Saveurs", short: "Saveurs" },
  { href: "/notre-histoire", label: "Notre histoire", short: "Histoire" },
];

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  firstName: string | null;
  lines: CartLine[];
  subtotalCents: number;
};

export default function HeaderNav({ isLoggedIn, isAdmin, firstName, lines, subtotalCents }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <>
      {/* Menu : panneau flottant sombre et flouté, bouton Contact blanc à droite */}
      <header className="fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <nav className="flex min-w-0 items-center gap-1 rounded-full bg-[#111113]/70 py-1.5 pr-1.5 pl-4 text-cream shadow-lg ring-1 ring-white/10 backdrop-blur-xl sm:pl-5">
            <Link href="/" className="font-hero mr-2 text-lg font-black tracking-tight italic sm:mr-4 sm:text-xl" aria-label="Pétille, accueil">
              PÉTILLE
            </Link>
            {links.map(({ href, label, short }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${active ? "bg-white/10 text-cream" : "font-light text-cream/70 hover:text-cream"}`}
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}

            <div className="ml-2 hidden items-center gap-1 text-sm md:flex">
              <span className="mx-1 h-4 w-px bg-white/15" aria-hidden />
              {isAdmin && (
                <Link href="/admin" className="rounded-full px-3 py-1.5 font-light text-cream/70 hover:text-cream">Admin</Link>
              )}
              {isLoggedIn ? (
                <>
                  <Link href="/compte" className={`rounded-full px-3 py-1.5 ${pathname.startsWith("/compte") ? "bg-white/10" : "font-light text-cream/70 hover:text-cream"}`}>
                    {firstName ? `Salut ${firstName}` : "Mon compte"}
                  </Link>
                  <form action={signOut}>
                    <button className="rounded-full px-3 py-1.5 font-light text-cream/50 hover:text-cream">Sortir</button>
                  </form>
                </>
              ) : (
                <Link href="/connexion" className="rounded-full px-3 py-1.5 font-light text-cream/70 hover:text-cream">Connexion</Link>
              )}
              <button
                onClick={() => setOpen(true)}
                className="ml-1 flex items-center gap-2 rounded-full bg-white/10 py-1 pr-1 pl-3 font-semibold transition hover:bg-white/20"
                aria-label={`Ouvrir le panier (${count} article${count > 1 ? "s" : ""})`}
              >
                Panier <CartBadge count={count} />
              </button>
            </div>
          </nav>

          <Link
            href="/contact"
            aria-current={pathname === "/contact" ? "page" : undefined}
            className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-lg ring-1 ring-ink/10 transition hover:scale-105"
          >
            Contact
          </Link>
        </div>
      </header>
      {/* Sur l'accueil, la scène 3D passe sous le menu ; ailleurs on réserve sa place */}
      {pathname !== "/" && <div className="h-20 sm:h-24" aria-hidden />}

      {/* Sur mobile, le panier reste un bouton flottant en bas de l'écran */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-cream shadow-lg transition hover:scale-105 md:hidden"
        aria-label={`Ouvrir le panier (${count} article${count > 1 ? "s" : ""})`}
      >
        Panier <CartBadge count={count} />
      </button>

      {open && (
        <CartDrawer lines={lines} subtotalCents={subtotalCents} isLoggedIn={isLoggedIn} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
