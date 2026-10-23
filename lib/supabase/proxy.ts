import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

// Routes réservées aux clients connectés (redirection optimiste vers /connexion)
const PROTECTED_PREFIXES = ["/compte", "/commande", "/admin"];

// Rafraîchit le jeton Supabase à chaque requête et protège les routes privées.
// Le contrôle du rôle admin est refait côté serveur dans app/admin (requireAdmin).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Ne rien exécuter entre createServerClient et getClaims() : risque de déconnexions aléatoires
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isLoggedIn && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/connexion";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
