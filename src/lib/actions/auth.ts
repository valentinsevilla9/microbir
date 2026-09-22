"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { rutaInternaSegura } from "@/lib/utils";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(
  _previousState: string | null,
  formData: FormData
): Promise<string | null> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return "Introduce un email y una contraseña válidos.";
  }

  const supabase = await createClient();

  const {
    error,
  } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return "Email o contraseña incorrectos.";
  }

  // Vuelve a la página que se pidió antes del login (?next=)
  const siguiente = formData.get("next");
  redirect(rutaInternaSegura(typeof siguiente === "string" ? siguiente : null));
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}
