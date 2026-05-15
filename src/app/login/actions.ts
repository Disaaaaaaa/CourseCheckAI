"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** FormData өрісі null/File болса бос жолға айналдырамыз — Zod string күтеді. */
function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

const loginSchema = z.object({
  email: z.string().email("Email қате форматта"),
  password: z.string().min(6, "Кемінде 6 таңба"),
  next: z.string().optional(),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Аты-жөні қажет"),
});

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: str(formData, "email"),
    password: str(formData, "password"),
    next: str(formData, "next") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Қате толтыру" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Email немесе құпиясөз дұрыс емес." };
  }

  redirect(
    parsed.data.next && parsed.data.next.startsWith("/")
      ? parsed.data.next
      : "/dashboard",
  );
}

export async function signupAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = signupSchema.safeParse({
    email: str(formData, "email"),
    password: str(formData, "password"),
    fullName: str(formData, "fullName"),
    next: str(formData, "next") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Қате толтыру" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });
  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled in Supabase, user is logged in immediately.
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
