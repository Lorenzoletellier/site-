import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lien de l'e-mail de confirmation : Supabase renvoie ici avec un code (flux PKCE)
// ou un token_hash (modèle d'e-mail personnalisé). On ouvre la session puis on redirige.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/compte";

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  if (ok) return NextResponse.redirect(new URL(next, origin));
  // Lien expiré ou ouvert dans un autre navigateur : l'e-mail est souvent confirmé quand même
  return NextResponse.redirect(new URL(`/connexion?confirmation=echec&next=${encodeURIComponent(next)}`, origin));
}
