"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/auth-actions";

export default function ProfileForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Prénom et nom
        <input name="full_name" defaultValue={fullName} required maxLength={100} className="field font-normal" />
      </label>
      <button disabled={pending} className="self-start rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold transition hover:bg-ink hover:text-cream disabled:opacity-50">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm">
        {state.error && <span className="text-red-700">{state.error}</span>}
        {"saved" in state && state.saved && <span className="text-ink/70">Profil mis à jour.</span>}
      </p>
    </form>
  );
}
