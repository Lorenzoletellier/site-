import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/produits", label: "Saveurs & stocks" },
  { href: "/admin/messages", label: "Messages" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <>
      <div className="bg-ink text-cream">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 pt-8 pb-10 sm:px-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-cream/50 uppercase">Espace administrateur</p>
            <p className="font-display mt-2 text-4xl font-extrabold">Les coulisses de Pétille.</p>
            <p className="mt-2 text-sm text-cream/60">Connecté : {admin.profile?.full_name ?? admin.email}</p>
          </div>
          <nav aria-label="Administration" className="flex flex-wrap gap-2 text-sm font-semibold">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full bg-cream/10 px-4 py-2 transition hover:bg-electric hover:text-cream">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">{children}</div>
    </>
  );
}
