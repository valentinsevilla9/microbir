import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { rutaInternaSegura } from "@/lib/utils";
import type { Database } from "@/types/database.types";

const RUTAS_PUBLICAS = ["/", "/login"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(
          cookiesToSet: Parameters<
            NonNullable<CookieMethodsServer["setAll"]>
          >[0],
          headers: Record<string, string>
        ) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          // Cache-Control: private, no-store… para que ningún CDN guarde
          // una respuesta con las cookies de sesión renovadas
          Object.entries(headers).forEach(([clave, valor]) => {
            response.headers.set(clave, valor);
          });
        },
      },
    }
  );

  /*
   * getClaims() valida el JWT (localmente si el proyecto usa claves
   * asimétricas) y renueva la sesión si ha caducado. Esto sólo decide
   * redirecciones: la autorización real la hacen las páginas, las server
   * actions (requireUser) y RLS.
   */
  const { data } = await supabase.auth.getClaims();
  const autenticado = Boolean(data?.claims?.sub);

  const pathname = request.nextUrl.pathname;
  const esRutaPublica = RUTAS_PUBLICAS.includes(pathname);

  if (!autenticado && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (autenticado && pathname === "/login") {
    const destino = rutaInternaSegura(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(destino, request.url));
  }

  return response;
}
