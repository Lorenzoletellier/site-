"use server";

import { createClient } from "@/lib/supabase/server";

export type SiteFormState = { error: string | null; success?: string | null };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECTS = ["saveur", "commande", "evenement", "revendeur", "autre"] as const;

// Formulaire de contact : enregistré en base, lu dans l'espace admin
export async function sendContact(_prev: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const subject = String(formData.get("subject") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!firstName || firstName.length > 60) return { error: "Indique ton prénom." };
  if (!EMAIL_PATTERN.test(email)) return { error: "Adresse e-mail invalide." };
  if (!SUBJECTS.includes(subject as (typeof SUBJECTS)[number])) return { error: "Choisis un sujet." };
  if (!message || message.length > 2000) return { error: "Ton message doit faire entre 1 et 2000 caractères." };

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({ first_name: firstName, email, subject, message });
  if (error) return { error: "Le message n'a pas pu être envoyé, réessaie." };
  return { error: null, success: "Merci ! On te répond sous 48 heures." };
}

export async function subscribeNewsletter(_prev: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: "Adresse e-mail invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({ email });
  // 23505 = déjà inscrit : on répond pareil pour ne pas révéler qui est inscrit
  if (error && error.code !== "23505") return { error: "Inscription impossible, réessaie." };
  return { error: null, success: "C'est noté, bienvenue dans la bulle !" };
}
