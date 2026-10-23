"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error: string | null };

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_PATTERN.test(email) || !password) return { error: "E-mail et mot de passe requis." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Identifiants incorrects." };

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
