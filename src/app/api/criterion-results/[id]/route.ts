import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const bodySchema = z
  .object({
    teacher_score: z.number().min(0).max(40).nullable().optional(),
    evidence: z.string().max(20000).nullable().optional(),
    problem: z.string().max(20000).nullable().optional(),
    recommendation: z.string().max(20000).nullable().optional(),
  })
  .refine(
    (v) =>
      v.teacher_score !== undefined ||
      v.evidence !== undefined ||
      v.problem !== undefined ||
      v.recommendation !== undefined,
    {
      message: "Кемінде бір өрісті жіберіңіз",
    },
  );

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
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

  const { data: existing, error: fetchErr } = await supabase
    .from("criterion_results")
    .select("id, max_score")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Жазба табылмады" }, { status: 404 });
  }

  if (
    parsed.data.teacher_score != null &&
    parsed.data.teacher_score > Number(existing.max_score)
  ) {
    return NextResponse.json(
      { error: `Максимум ${existing.max_score} балл` },
      { status: 400 },
    );
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.teacher_score !== undefined) {
    updatePayload.teacher_score = parsed.data.teacher_score;
  }
  if (parsed.data.evidence !== undefined) {
    updatePayload.evidence = parsed.data.evidence;
  }
  if (parsed.data.problem !== undefined) {
    updatePayload.problem = parsed.data.problem;
  }
  if (parsed.data.recommendation !== undefined) {
    updatePayload.recommendation = parsed.data.recommendation;
  }

  const { error: updateErr } = await supabase
    .from("criterion_results")
    .update(updatePayload)
    .eq("id", id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
