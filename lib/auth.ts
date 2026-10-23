import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type CurrentUser = {
  id: string;
  email: string | undefined;
  profile: Tables<"profiles"> | null;
};

// Utilisateur connecté + profil, ou null. getUser() revalide le jeton auprès de Supabase.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { id: user.id, email: user.email, profile };
}

// À appeler en haut d'une page privée
export async function requireUser(next = "/compte"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return user;
}

// À appeler dans app/admin/layout.tsx : la RLS protège les données, ceci protège les pages
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (user.profile?.role !== "admin") redirect("/");
  return user;
}
