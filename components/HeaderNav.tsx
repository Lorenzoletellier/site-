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
  { href: "/contact", label: "Contact", short: "Contact" },
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
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-sun/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:gap-10 sm:px-6 md:pr-40">
          <Link href="/" className="font-display text-xl font-extrabold tracking-tight sm:text-2xl" aria-label="Pétille, accueil">
            PÉTILLE
          </Link>
          <div className="flex gap-4 text-sm font-semibold sm:gap-8">
            {links.map(({ href, label, short }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-1 transition-opacity ${active ? "opacity-100" : "opacity-70 hover:opacity-100"}`}
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                  {active && <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-ink" />}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto hidden items-center gap-4 text-sm font-semibold md:flex">
            {isAdmin && (
              <Link href="/admin" className="rounded-full bg-cream px-3 py-1.5 ring-1 ring-ink/15 hover:ring-ink">Admin</Link>
            )}
            {isLoggedIn ? (
              <>
                <Link href="/compte" className={pathname.startsWith("/compte") ? "" : "opacity-70 hover:opacity-100"}>
                  {firstName ? `Salut ${firstName}` : "Mon compte"}
                </Link>
                <form action={signOut}>
                  <button className="opacity-50 hover:opacity-100">Sortir</button>
                </form>
              </>
            ) : (
              <Link href="/connexion" className="opacity-70 hover:opacity-100">Connexion</Link>
            )}
          </div>
        </nav>
      </header>

      {/* Bouton panier flottant, comme sur le site d'origine (en haut à droite sur grand écran, en bas sur mobile) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-cream shadow-lg transition hover:scale-105 md:hidden"
        aria-label={`Ouvrir le panier (${count} article${count > 1 ? "s" : ""})`}
      >
        Panier <CartBadge count={count} />
      </button>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 right-6 z-40 hidden items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-cream shadow-lg transition hover:scale-105 md:flex"
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
