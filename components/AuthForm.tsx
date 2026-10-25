"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthFormState } from "@/lib/auth-actions";

const initialState: AuthFormState = { error: null };

export default function AuthForm({ mode, next }: { mode: "signin" | "signup"; next: string }) {
  const [state, formAction, pending] = useActionState(mode === "signin" ? signIn : signUp, initialState);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {isSignup && (
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Prénom et nom
          <input name="full_name" required maxLength={100} autoComplete="name" className="field font-normal" />
        </label>
      )}
      <label className="flex flex-col gap-2 text-sm font-semibold">
        E-mail
        <input name="email" type="email" required autoComplete="email" placeholder="ton@email.fr" className="field font-normal" />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Mot de passe
        <input name="password" type="password" required minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"} className="field font-normal" />
        {isSignup && <span className="text-xs font-normal text-ink/50">8 caractères minimum.</span>}
      </label>
      <p aria-live="polite" className="min-h-5 text-sm font-semibold text-red-700">{state.error}</p>
      <button disabled={pending} className="btn btn-primary px-8 py-4">
        {pending ? "Un instant…" : isSignup ? "Créer mon compte" : "Se connecter"}
      </button>
      <p className="text-sm text-ink/60">
        {isSignup ? "Déjà un compte ? " : "Pas encore de compte ? "}
        <Link href={`/${isSignup ? "connexion" : "inscription"}?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline">
          {isSignup ? "Se connecter" : "Créer un compte"}
        </Link>
      </p>
    </form>
  );
}
