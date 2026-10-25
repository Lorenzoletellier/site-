"use client";

import { useActionState } from "react";
import { sendContact, subscribeNewsletter, type SiteFormState } from "@/lib/site-actions";

const initial: SiteFormState = { error: null, success: null };
const input = "rounded-2xl border-2 border-ink/20 bg-white px-4 py-3 font-normal outline-none focus:border-ink";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, initial);

  return (
    <form className="flex flex-col gap-4 md:col-span-3" action={action}>
      <h2 className="font-display text-3xl font-extrabold">Écris-nous</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Prénom
          <input name="first_name" required maxLength={60} autoComplete="given-name" className={input} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          E-mail
          <input name="email" type="email" required placeholder="ton@email.fr" autoComplete="email" className={input} />
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Sujet
        <select name="subject" className={input} defaultValue="saveur">
          <option value="saveur">Une question sur une saveur</option>
          <option value="commande">Une commande</option>
          <option value="evenement">Un événement ou une entreprise</option>
          <option value="revendeur">Devenir revendeur</option>
          <option value="autre">Autre</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Message
        <textarea name="message" required rows={6} maxLength={2000} className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={pending} className="self-start btn btn-primary px-8 py-4">
          {pending ? "Envoi…" : "Envoyer"}
        </button>
        <p aria-live="polite" className={`text-sm font-semibold ${state.error ? "text-red-700" : "text-ink/70"}`}>
          {state.error ?? state.success}
        </p>
      </div>
    </form>
  );
}

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, initial);

  return (
    <form className="mt-6 flex flex-col gap-3" action={action}>
      <label htmlFor="newsletter-email" className="sr-only">Ton e-mail</label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        placeholder="ton@email.fr"
        className="rounded-full border-2 border-cream/20 bg-transparent px-5 py-3 outline-none focus:border-sky"
      />
      <button disabled={pending} className="btn btn-corail px-6 py-3">
        {pending ? "Inscription…" : "S'inscrire"}
      </button>
      <p aria-live="polite" className={`min-h-5 text-sm ${state.error ? "text-corail" : "text-sky"}`}>
        {state.error ?? state.success}
      </p>
    </form>
  );
}
