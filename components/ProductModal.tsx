"use client";

import { useEffect, useState } from "react";
import Can3D from "./Can3D";
import { formatPrice, type Flavor } from "@/lib/flavors";
import { createClient } from "@/lib/supabase/client";
import { submitReview } from "@/lib/shop-actions";
import type { Tables } from "@/lib/supabase/database.types";

type Props = {
  flavor: Flavor;
  isLoggedIn: boolean;
  onClose: () => void;
  onAdd: () => void;
};

type Review = Pick<Tables<"reviews">, "id" | "rating" | "comment" | "created_at">;

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export default function ProductModal({ flavor, isLoggedIn, onClose, onAdd }: Props) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  // Fermer avec la touche Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // À l'ouverture : enregistre la consultation (KPI admin), charge les avis et le droit d'en laisser un
  useEffect(() => {
    const supabase = createClient();
    supabase.from("product_views").insert({ product_id: flavor.productId }).then(() => undefined);
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("product_id", flavor.productId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setReviews(data ?? []));
    if (isLoggedIn) {
      supabase.rpc("has_purchased", { p_product_id: flavor.productId }).then(({ data }) => setCanReview(Boolean(data)));
    }
  }, [flavor.productId, isLoggedIn]);

  const sendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submitReview(flavor.productId, rating, comment);
    setFeedback(result.error ? { text: result.error, error: true } : { text: result.success ?? "", error: false });
    if (!result.error) {
      setReviews((prev) => [{ id: Date.now(), rating, comment, created_at: new Date().toISOString() }, ...(prev ?? [])]);
      setComment("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fermer la fiche"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={flavor.name}
        className="relative grid max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-cream shadow-2xl md:grid-cols-2"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-5 z-10 text-3xl leading-none"
          aria-label="Fermer"
        >
          ×
        </button>

        <div
          className="flex items-center justify-center p-8"
          style={{ backgroundColor: `${flavor.color}33` }}
        >
          <Can3D flavor={flavor} className="h-72 w-full md:h-[30rem]" />
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">{flavor.tagline}</p>
          <h2 className="font-display mt-1 text-4xl font-extrabold">{flavor.name}</h2>
          <p className="mt-3 text-lg font-medium">{flavor.description}</p>
          <p className="mt-4 text-ink/80">{flavor.story}</p>

          <h3 className="mt-6 font-semibold">Ingrédients</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {flavor.ingredients.map((i) => (
              <li key={i} className="rounded-full bg-white px-3 py-1 text-sm">
                {i}
              </li>
            ))}
          </ul>

          <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white p-3">
              <dt className="text-xs text-ink/60">Calories</dt>
              <dd className="font-bold">{flavor.kcal} kcal</dd>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <dt className="text-xs text-ink/60">Sucre</dt>
              <dd className="font-bold">{flavor.sugar} g/100 ml</dd>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <dt className="text-xs text-ink/60">Format</dt>
              <dd className="font-bold">33 cl</dd>
            </div>
          </dl>

          <p className="mt-6 text-sm">
            <span className="font-semibold">Accord parfait : </span>
            {flavor.pairing}
          </p>

          <div className="mt-8 flex items-center justify-between gap-4">
            <span className="text-2xl font-bold">{formatPrice(flavor.price)}</span>
            <button
              onClick={onAdd}
              disabled={flavor.stock === 0}
              className="rounded-full px-6 py-3 font-semibold transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: flavor.color, color: flavor.accent }}
            >
              {flavor.stock === 0 ? "Épuisée" : "Ajouter au panier"}
            </button>
          </div>

          <section className="mt-8 border-t border-ink/10 pt-6" aria-label="Avis clients">
            <h3 className="font-display text-xl font-bold">
              Avis {flavor.reviewCount > 0 && <span className="text-ink/50">★ {flavor.avgRating}</span>}
            </h3>
            {canReview && (
              <form onSubmit={sendReview} className="mt-3 space-y-2 rounded-2xl bg-white p-4">
                <div className="flex gap-1" role="radiogroup" aria-label="Ta note">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} sur 5`}
                      onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-ink" : "text-ink/20"}`}>
                      ★
                    </button>
                  ))}
                </div>
                <label htmlFor="review-comment" className="sr-only">Ton avis</label>
                <textarea id="review-comment" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Ce que tu en as pensé" className="field text-sm" />
                <button disabled={!rating} className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-cream disabled:opacity-40">
                  Publier
                </button>
              </form>
            )}
            {feedback && <p className={`mt-2 text-sm ${feedback.error ? "text-red-700" : "text-ink/70"}`} role="status">{feedback.text}</p>}
            {reviews === null ? (
              <p className="mt-3 text-sm text-ink/50">Chargement des avis…</p>
            ) : reviews.length === 0 ? (
              <p className="mt-3 text-sm text-ink/50">
                Pas encore d&apos;avis. {canReview ? "Sois le premier !" : "Les clients qui l'ont achetée peuvent la noter."}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl bg-white p-3 text-sm">
                    <p aria-label={`${r.rating} sur 5`}>{"★".repeat(r.rating)}<span className="text-ink/20">{"★".repeat(5 - r.rating)}</span></p>
                    {r.comment && <p className="mt-1">{r.comment}</p>}
                    <p className="mt-1 text-xs text-ink/50">Achat vérifié · {formatDate(r.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
