"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// notice : message de succès sans redirection (inscription en attente de confirmation)
export type AuthFormState = { error: string | null; notice?: string | null };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// N'accepte que des redirections internes (évite les open redirects)
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/compte";
}

// Utilisable avec useActionState(signUp, { error: null })
export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName || fullName.length > 100) return { error: "Indique ton nom (100 caractères max)." };
  if (!EMAIL_PATTERN.test(email)) return { error: "Adresse e-mail invalide." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` };
  }

  // Le lien de confirmation revient sur ce domaine (local ou Vercel), puis vers la page demandée
  const next = safeNext(formData.get("next"));
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const emailRedirectTo = host ? `${protocol}://${host}/auth/confirm?next=${encodeURIComponent(next)}` : undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "Un compte existe déjà avec cet e-mail : connecte-toi." };
    if (error.code === "weak_password") return { error: "Mot de passe trop faible, choisis-en un plus long." };
    if (error.code === "over_email_send_rate_limit") return { error: "Trop d'e-mails envoyés, réessaie dans quelques minutes." };
    return { error: "Inscription impossible pour le moment, réessaie." };
  }

  // Confirmation d'e-mail activée dans Supabase : pas encore de session, l'utilisateur doit cliquer le lien
  if (!data.session) {
    return { error: null, notice: `Compte créé ! Clique sur le lien envoyé à ${email} pour l'activer, puis connecte-toi.` };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_PATTERN.test(email) || !password) return { error: "E-mail et mot de passe requis." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Ton e-mail n'est pas encore confirmé : clique sur le lien reçu à l'inscription (pense aux spams)." };
    }
    return { error: "E-mail ou mot de passe incorrect." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function updateProfile(_prev: AuthFormState, formData: FormData): Promise<AuthFormState & { saved?: boolean }> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName || fullName.length > 100) return { error: "Nom requis (100 caractères max)." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/compte");

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) return { error: "Mise à jour impossible, réessaie." };

  revalidatePath("/compte");
  return { error: null, saved: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
