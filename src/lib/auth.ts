import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Teacher } from "@/lib/supabase/types";

export async function getAuthenticatedTeacher() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teacher, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Teacher profile error: ${error.message}`);
  }

  if (!teacher) {
    // Should be created by trigger; if missing, create now.
    const { data: created, error: insertError } = await supabase
      .from("teachers")
      .insert({
        user_id: user.id,
        email: user.email ?? "",
        full_name: (user.user_metadata?.full_name as string) ?? user.email,
      })
      .select()
      .single();
    if (insertError || !created) {
      throw new Error(insertError?.message ?? "Could not provision teacher");
    }
    return { user, teacher: created as Teacher, supabase };
  }

  return { user, teacher: teacher as Teacher, supabase };
}
