import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todo menos estáticos. El service worker y el manifest tienen que
     * servirse sin sesión: si se redirigen a /login la PWA no se instala.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|offline.html|icons/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
