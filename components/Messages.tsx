"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type WallMessage = Pick<Tables<"wall_messages">, "id" | "created_at" | "content">;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default function Messages() {
  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("wall_messages")
      .select("id, created_at, content")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) setError("Impossible de charger les messages.");
    else {
      setMessages(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Chargement initial des messages depuis Supabase
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const { error } = await createClient().from("wall_messages").insert({ content });
    setSending(false);
    if (error) {
      setError("Le message n'a pas pu être envoyé.");
      return;
    }
    setText("");
    load();
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="grid gap-12 md:grid-cols-5">
        <div className="md:col-span-2">
          <p className="text-sm font-semibold tracking-[0.2em] text-ink/60 uppercase">Le mur des bulles</p>
          <h2 className="font-display mt-2 text-4xl font-extrabold sm:text-5xl">Laisse-nous un message.</h2>
          <p className="mt-4 text-ink/70">Ta saveur préférée, une idée de recette, un mot doux : il s&apos;affiche ici pour tout le monde.</p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
            <label htmlFor="message" className="text-sm font-semibold">
              Ton message
            </label>
            <textarea
              id="message"
              rows={3}
              maxLength={280}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="La Framboise Basilic, c'est la meilleure !"
              className="rounded-2xl border-2 border-ink/20 bg-white px-4 py-3 outline-none focus:border-ink"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink/50">{text.length}/280</span>
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="btn btn-primary px-6 py-3"
              >
                {sending ? "Envoi…" : "Publier"}
              </button>
            </div>
          </form>
        </div>

        <div className="md:col-span-3">
          {loading ? (
            <p className="text-ink/50">Chargement des messages…</p>
          ) : error ? (
            <p className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>
          ) : messages.length === 0 ? (
            <div className="grid h-full min-h-64 place-items-center rounded-3xl border-2 border-dashed border-ink/25 bg-white/60 p-10 text-center">
              <div>
                <div className="mx-auto flex w-fit items-end gap-1.5" aria-hidden>
                  <span className="h-4 w-4 rounded-full border-2 border-ink bg-sky" />
                  <span className="h-7 w-7 rounded-full border-2 border-ink bg-electric" />
                  <span className="h-5 w-5 rounded-full border-2 border-ink bg-corail" />
                </div>
                <p className="font-display mt-5 text-2xl font-bold">Le mur est encore tout calme.</p>
                <p className="mt-2 text-ink/60">Lance la première bulle : ta saveur préférée, une idée de recette…</p>
              </div>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {messages.map((m, i) => (
                <li
                  key={m.id}
                  className={`rounded-3xl rounded-bl-md border-2 border-ink p-5 shadow-[4px_4px_0_var(--color-ink)] ${["bg-white", "bg-sky", "bg-cream"][i % 3]} ${i % 2 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"}`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                  <p className="mt-3 text-xs font-medium text-ink/50">{formatDate(m.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
