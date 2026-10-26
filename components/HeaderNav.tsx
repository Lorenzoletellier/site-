"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CartDrawer from "./CartDrawer";
import CartBadge from "./CartBadge";
import { BagIcon, UserIcon } from "./Icons";
import { signOut } from "@/lib/auth-actions";
import type { CartLine } from "@/lib/queries";

const links = [
  { href: "/saveurs", label: "Nos saveurs" },
  { href: "/notre-histoire", label: "Notre univers" },
];

// Pages ouvertes par un bandeau bleu (BlueHero) : le menu y est transparent et crème
const BLUE_HERO_PAGES = ["/notre-histoire", "/contact", "/connexion", "/inscription", "/compte", "/commande", "/admin"];

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  firstName: string | null;
  lines: CartLine[];
  subtotalCents: number;
  shippingNote: string | null;
};

export default function HeaderNav({ isLoggedIn, isAdmin, firstName, lines, subtotalCents, shippingNote }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const home = pathname === "/";
  const overHero = home || BLUE_HERO_PAGES.some((page) => pathname === page || (page === "/admin" && pathname.startsWith("/admin/")));

  // Sur l'accueil, le menu est transparent au-dessus du hero puis prend un fond en descendant
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const solid = !overHero || scrolled;

  return (
    <>
      {/* Menu : logo à gauche, liens et panier à droite, dans la typo de la marque */}
      <header
        className={`fixed inset-x-0 top-0 z-40 font-display transition-[background-color,box-shadow,color] duration-300 ${solid ? "bg-cream/85 text-ink shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md" : "text-cream"}`}
      >
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-3 px-4 sm:h-20 sm:px-[5vw]">
          <Link href="/" className="text-[1.6rem] font-extrabold tracking-tight sm:text-[1.9rem]" aria-label="Pétille, accueil">
            Pétille
          </Link>

          <nav className="flex items-center gap-0 text-[0.9rem] font-semibold sm:gap-2 sm:text-base">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className="group relative px-2 py-2 whitespace-nowrap transition sm:px-4"
              >
                {label}
                {/* Indicateur actif : un trait court sous le lien, qui s'allonge au survol */}
                <span
                  className={`absolute inset-x-2 bottom-0.5 mx-auto h-[3px] rounded-full bg-current transition-[width,opacity] duration-300 sm:inset-x-4 ${pathname === href ? "w-5 opacity-100" : "w-0 opacity-0 group-hover:w-5 group-hover:opacity-60"}`}
                  aria-hidden
                />
              </Link>
            ))}

            {isAdmin && (
              <Link href="/admin" className="hidden px-3 py-1.5 hover:opacity-70 md:block">Admin</Link>
            )}
            {isLoggedIn && (
              <form action={signOut} className="hidden md:block">
                <button className="px-3 py-1.5 opacity-60 hover:opacity-100">Sortir</button>
              </form>
            )}
            <Link
              href={isLoggedIn ? "/compte" : "/connexion"}
              title={isLoggedIn ? (firstName ? `Salut ${firstName}` : "Mon compte") : "Connexion"}
              aria-label={isLoggedIn ? "Mon compte" : "Connexion"}
              className="ml-1 hidden h-11 w-11 place-items-center rounded-full ring-1 ring-current/30 transition hover:ring-current sm:grid"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="relative ml-1 grid h-11 w-11 place-items-center rounded-full ring-1 ring-current/30 transition hover:ring-current"
              aria-label={`Ouvrir le panier (${count} article${count > 1 ? "s" : ""})`}
            >
              <BagIcon className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5">
                  <CartBadge count={count} />
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>
      {/* Sous un bandeau bleu, le hero passe sous le menu ; ailleurs on réserve sa place */}
      {!overHero && <div className="h-16 sm:h-20" aria-hidden />}

      {open && (
        <CartDrawer lines={lines} subtotalCents={subtotalCents} isLoggedIn={isLoggedIn} shippingNote={shippingNote} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
