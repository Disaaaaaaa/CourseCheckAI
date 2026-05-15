import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TOTAL_MAX_SCORE, BM1_MAX, BM2_MAX, BM3_MAX } from "@/lib/rubric";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  final_total_score: z.number().min(0).max(TOTAL_MAX_SCORE).nullable(),
  final_bm1_score: z.number().min(0).max(BM1_MAX).nullable(),
  final_bm2_score: z.number().min(0).max(BM2_MAX).nullable(),
  final_bm3_score: z.number().min(0).max(BM3_MAX).nullable(),
  final_comment: z.string().optional().nullable(),
  strengths: z.string().optional().nullable(),
  needs_improvement: z.string().optional().nullable(),
  next_revision: z.string().optional().nullable(),
  is_finalized: z.boolean(),
});

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Авторизация қажет" }, { status: 401 });
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!teacher) {
    return NextResponse.json({ error: "Профиль табылмады" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Қате толтыру" },
      { status: 400 },
    );
  }

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("id, teacher_id")
    .eq("id", id)
    .single();
  if (subErr || !submission) {
    return NextResponse.json({ error: "Жұмыс табылмады" }, { status: 404 });
  }
  if (submission.teacher_id !== teacher.id) {
    return NextResponse.json({ error: "Тыйым салынған" }, { status: 403 });
  }

  const payload = {
    submission_id: submission.id,
    teacher_id: teacher.id,
    final_total_score: parsed.data.final_total_score,
    final_bm1_score: parsed.data.final_bm1_score,
    final_bm2_score: parsed.data.final_bm2_score,
    final_bm3_score: parsed.data.final_bm3_score,
    final_comment: parsed.data.final_comment ?? null,
    strengths: parsed.data.strengths ?? null,
    needs_improvement: parsed.data.needs_improvement ?? null,
    next_revision: parsed.data.next_revision ?? null,
    is_finalized: parsed.data.is_finalized,
  };

  const { error: upsertErr } = await supabase
    .from("teacher_final_reviews")
    .upsert(payload, { onConflict: "submission_id" });
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  if (parsed.data.is_finalized) {
    await supabase
      .from("submissions")
      .update({ status: "reviewed" })
      .eq("id", submission.id);
  }

  return NextResponse.json({ ok: true });
}
