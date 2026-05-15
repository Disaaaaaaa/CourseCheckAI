import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { analyzeCoursework } from "@/lib/ai/analyze";
import { RUBRIC, RUBRIC_BY_CODE } from "@/lib/rubric";
import type { Submission, Teacher } from "@/lib/supabase/types";

type LevelMapValue = "high" | "medium" | "low" | "missing";
function bandToLevel(band: string): LevelMapValue {
  if (band === "9-10" || band === "7-8") return "high";
  if (band === "5-6") return "medium";
  if (band === "3-4" || band === "1-2") return "low";
  return "missing";
}
function levelToText(score: number, max: number): LevelMapValue {
  if (max <= 0) return "missing";
  const ratio = score / max;
  if (ratio >= 0.7) return "high";
  if (ratio >= 0.5) return "medium";
  if (ratio > 0) return "low";
  return "missing";
}

export const runtime = "nodejs";
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
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
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!teacher) {
    return NextResponse.json(
      { error: "Мұғалім профилі табылмады" },
      { status: 400 },
    );
  }

  const { data: submission, error: submissionErr } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", (teacher as Teacher).id)
    .single<Submission>();

  if (submissionErr || !submission) {
    return NextResponse.json(
      { error: "Жұмыс табылмады" },
      { status: 404 },
    );
  }

  const admin = createSupabaseAdminClient();

  await admin
    .from("submissions")
    .update({ status: "analyzing", error_message: null })
    .eq("id", submission.id);

  const { data: download, error: downloadErr } = await admin.storage
    .from("coursework-pdfs")
    .download(submission.pdf_file_path);

  if (downloadErr || !download) {
    await admin
      .from("submissions")
      .update({
        status: "failed",
        error_message: `PDF жүктеу мүмкін болмады: ${downloadErr?.message ?? "белгісіз"}`,
      })
      .eq("id", submission.id);
    return NextResponse.json(
      { error: "PDF жүктеу мүмкін болмады" },
      { status: 500 },
    );
  }

  const pdfBuffer = Buffer.from(await download.arrayBuffer());

  let result;
  try {
    result = await analyzeCoursework({
      pdfBuffer,
      pdfFileName: submission.pdf_file_name,
      title: submission.coursework_title,
      student: submission.student_full_name,
      className: submission.class_name,
    });
  } catch (e) {
    await admin
      .from("submissions")
      .update({
        status: "failed",
        error_message:
          e instanceof Error ? e.message : "AI талдау қатесі",
      })
      .eq("id", submission.id);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "AI талдау уақытша орындалмады. Кейін қайта көріңіз.",
      },
      { status: 502 },
    );
  }

  const { review, modelName } = result;

  // Delete previous reviews to keep storage tidy
  await admin.from("ai_reviews").delete().eq("submission_id", submission.id);
  await admin
    .from("interview_questions")
    .delete()
    .eq("submission_id", submission.id);

  const totalScore =
    review.scores.bm1 +
    review.scores.bm2_analysis +
    review.scores.bm2_evidence +
    review.scores.bm3;

  const { data: aiReview, error: aiReviewErr } = await admin
    .from("ai_reviews")
    .insert({
      submission_id: submission.id,
      model_name: modelName,
      raw_json: review,
      total_ai_score: totalScore,
      bm1_score: review.scores.bm1,
      bm2_score: review.scores.bm2_analysis + review.scores.bm2_evidence,
      bm3_score: review.scores.bm3,
      summary: review.submission_summary.overall_comment,
      student_feedback: JSON.stringify(review.student_feedback),
      teacher_annotation: review.teacher_annotation.short_comment,
      academic_integrity_risk: review.academic_integrity.risk_level,
    })
    .select("id")
    .single();

  if (aiReviewErr || !aiReview) {
    await admin
      .from("submissions")
      .update({
        status: "failed",
        error_message: aiReviewErr?.message ?? "AI нәтижені сақтау қатесі",
      })
      .eq("id", submission.id);
    return NextResponse.json(
      { error: aiReviewErr?.message ?? "AI нәтижені сақтау қатесі" },
      { status: 500 },
    );
  }

  // Map AI's 4 criteria onto our official rubric.
  const aiCriterionByCode = new Map(
    review.criteria.map((c) => [c.criterion_code, c]),
  );

  const criterionRows = RUBRIC.map((rubric) => {
    const ai = aiCriterionByCode.get(
      rubric.code as
        | "BM1_KNOWLEDGE"
        | "BM2_ANALYSIS"
        | "BM2_EVIDENCE"
        | "BM3_COMMUNICATION",
    );
    const aiScore = Math.max(
      0,
      Math.min(rubric.maxScore, Number(ai?.suggested_score ?? 0)),
    );

    const evidenceJoined = ai?.detailed_comments
      ?.map((c, i) => `(${i + 1}) ${c.title}: ${c.evidence_from_text}`)
      .join("\n\n");
    const problemJoined = ai?.weaknesses?.map((w) => `• ${w}`).join("\n");
    const recommendationJoined = ai?.detailed_comments
      ?.map((c, i) => `(${i + 1}) ${c.improvement_suggestion}`)
      .join("\n");

    const level: LevelMapValue = ai?.level_band
      ? bandToLevel(ai.level_band)
      : levelToText(aiScore, rubric.maxScore);

    return {
      ai_review_id: aiReview.id,
      section: rubric.bm,
      criterion_code: rubric.code,
      criterion_name: rubric.name,
      max_score: rubric.maxScore,
      ai_score: aiScore,
      teacher_score: null,
      level,
      evidence: evidenceJoined ?? null,
      problem: problemJoined ?? null,
      recommendation: recommendationJoined ?? null,
      confidence: (ai?.confidence ?? "medium") as "low" | "medium" | "high",
    };
  });

  const { error: criterionErr } = await admin
    .from("criterion_results")
    .insert(criterionRows);
  if (criterionErr) {
    return NextResponse.json({ error: criterionErr.message }, { status: 500 });
  }

  // Section analysis is preserved in raw_json — no separate table for MVP.
  void RUBRIC_BY_CODE;

  if (review.interview_questions.length > 0) {
    await admin.from("interview_questions").insert(
      review.interview_questions.map((q) => ({
        submission_id: submission.id,
        question: q.question,
        purpose: q.purpose,
        risk_area: q.related_section,
      })),
    );
  }

  await admin
    .from("submissions")
    .update({
      status: "ready",
      word_count: review.submission_summary.detected_word_count,
      error_message: null,
    })
    .eq("id", submission.id);

  return NextResponse.json({ ok: true, ai_review_id: aiReview.id });
}
