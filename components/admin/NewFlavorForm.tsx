"use client";

import { useActionState, useState } from "react";
import Can from "@/components/Can";
import { createProduct, type ProductFormState } from "@/lib/admin-actions";
import { Constants } from "@/lib/supabase/database.types";
import type { Pattern } from "@/lib/flavors";

const initialState: ProductFormState = { error: null, success: null };
const label = "flex flex-col gap-2 text-sm font-semibold";

export default function NewFlavorForm({ categories }: { categories: { id: number; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const [name, setName] = useState("Nouvelle saveur");
  const [color, setColor] = useState("#ffd84d");
  const [accent, setAccent] = useState("#1a1a1a");
  const [secondary, setSecondary] = useState("#ffffff");
  const [pattern, setPattern] = useState<Pattern>("bubbles");

  return (
    <form action={formAction} className="grid gap-8 rounded-3xl bg-white p-6 ring-1 ring-ink/5 md:grid-cols-[14rem_1fr]">
      {/* Aperçu en direct : la canette est dessinée à partir des couleurs et du motif saisis */}
      <div className="flex flex-col items-center justify-center rounded-3xl p-6" style={{ backgroundColor: `${color}33` }}>
        <Can name={name || "Aperçu"} color={color} accent={accent} secondary={secondary} pattern={pattern} className="float h-56 drop-shadow-2xl" />
        <p className="mt-3 text-xs text-ink/60">Aperçu en direct</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>
          Nom
          <input name="name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="field font-normal" />
        </label>
        <label className={label}>
          Famille
          <select name="category_id" className="field font-normal">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className={label}>
          Accroche
          <input name="tagline" maxLength={60} placeholder="Frais & piquant" className="field font-normal" />
        </label>
        <label className={label}>
          Prix (€)
          <input name="price" required inputMode="decimal" placeholder="2,80" className="field font-normal" />
        </label>
        <label className={label}>
          Stock (canettes)
          <input name="stock" type="number" min={0} defaultValue={48} className="field font-normal" />
        </label>
        <label className={label}>
          Sucre (g / 100 ml)
          <input name="sugar" required inputMode="decimal" placeholder="4" className="field font-normal" />
        </label>
        <label className={label}>
          Calories (kcal / 100 ml)
          <input name="kcal" type="number" required min={0} max={200} placeholder="18" className="field font-normal" />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Description
          <textarea name="description" rows={2} className="field font-normal" />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Ingrédients (séparés par des virgules)
          <input name="ingredients" placeholder="Eau gazéifiée, Jus de citron 8 %, Sucre de canne bio" className="field font-normal" />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Accord parfait
          <input name="pairing" placeholder="Parfait avec…" className="field font-normal" />
        </label>
        <fieldset className="flex flex-wrap items-end gap-4 sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">Habillage de la canette</legend>
          {[
            ["color", "Couleur", color, setColor],
            ["accent", "Texte", accent, setAccent],
            ["secondary", "Motif", secondary, setSecondary],
          ].map(([field, text, value, setter]) => (
            <label key={field as string} className="flex flex-col gap-1 text-xs font-semibold">
              {text as string}
              <input type="color" name={field as string} value={value as string}
                onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="h-10 w-16 cursor-pointer rounded-xl border border-ink/20" />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Motif
            <select name="pattern" value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)} className="rounded-xl border border-ink/20 bg-white px-3 py-2.5">
              {Constants.public.Enums.can_pattern.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </fieldset>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <button disabled={pending} className="rounded-full bg-ink px-7 py-3 font-semibold text-cream transition hover:scale-105 disabled:opacity-50">
            {pending ? "Création…" : "Ajouter à la gamme"}
          </button>
          <p aria-live="polite" className={`text-sm font-semibold ${state.error ? "text-red-700" : "text-ink/70"}`}>
            {state.error ?? state.success}
          </p>
        </div>
      </div>
    </form>
  );
}
