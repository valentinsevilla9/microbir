import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Cliente de Supabase y usuario de la petición actual.
 *
 * `cache` hace que layout, página y acciones de una misma petición
 * compartan una única llamada a `getUser()` (que va a la red).
 */
const getSesion = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/**
 * Exige sesión. Si no la hay redirige al login.
 * Úsalo en páginas y server actions: las server actions son endpoints
 * públicos y el proxy NO es suficiente como control de acceso.
 */
export async function requireUser() {
  const { supabase, user } = await getSesion();
  if (!user) redirect("/login");
  return { supabase, user };
}
