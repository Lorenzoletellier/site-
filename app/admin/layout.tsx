import AdminNav from "@/components/admin/AdminNav";
import BlueHero from "@/components/BlueHero";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <>
      <BlueHero eyebrow="Espace administrateur" title="Les coulisses de Pétille." overflow={false}>
        <p className="text-base text-cream/80">Connecté : {admin.profile?.full_name ?? admin.email}</p>
        <div className="mt-6">
          <AdminNav />
        </div>
      </BlueHero>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">{children}</div>
    </>
  );
}
