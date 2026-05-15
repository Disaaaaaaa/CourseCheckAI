import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  full_name: z.string().min(2),
  school_name: z.string().optional().nullable(),
  subject: z.string().min(2),
});

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Авторизация қажет" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Қате толтыру" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("teachers")
    .update({
      full_name: parsed.data.full_name,
      school_name: parsed.data.school_name ?? null,
      subject: parsed.data.subject,
    })
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
