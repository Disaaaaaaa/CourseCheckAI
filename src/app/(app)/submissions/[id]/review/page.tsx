import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthenticatedTeacher } from "@/lib/auth";
import { firstOf } from "@/lib/utils";
import { ReviewWorkspace } from "./review-workspace";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const { supabase, teacher } = await getAuthenticatedTeacher();

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      `*,
       ai_reviews (
         id, total_ai_score, bm1_score, bm2_score, bm3_score, summary,
         teacher_annotation, student_feedback, academic_integrity_risk, raw_json,
         criterion_results (
           id, section, criterion_code, criterion_name, max_score,
           ai_score, teacher_score, level, evidence, problem, recommendation, confidence
         )
       ),
       teacher_final_reviews (
         id, final_total_score, final_bm1_score, final_bm2_score, final_bm3_score,
         final_comment, strengths, needs_improvement, next_revision, is_finalized
       )
      `,
    )
    .eq("id", id)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!submission) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Жұмыс табылмады.
        </CardContent>
      </Card>
    );
  }

  const aiReview = firstOf<{
    id: string;
    total_ai_score: number;
    bm1_score: number;
    bm2_score: number;
    bm3_score: number;
    summary: string | null;
    teacher_annotation: string | null;
    academic_integrity_risk: string;
    criterion_results: Array<{
      id: string;
      section: string;
      criterion_code: string;
      criterion_name: string;
      max_score: number;
      ai_score: number;
      teacher_score: number | null;
      level: string;
      evidence: string | null;
      problem: string | null;
      recommendation: string | null;
      confidence: string;
    }>;
  }>(submission.ai_reviews);
  if (!aiReview) {
    return (
      <div className="space-y-4">
        <Link
          href={`/submissions/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Артқа
        </Link>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            AI талдау әлі дайын емес. Алдымен талдауды іске қосыңыз.
          </CardContent>
        </Card>
      </div>
    );
  }

  const finalReview = firstOf<{
    id: string;
    final_total_score: number | string | null;
    final_bm1_score: number | string | null;
    final_bm2_score: number | string | null;
    final_bm3_score: number | string | null;
    final_comment: string | null;
    strengths: string | null;
    needs_improvement: string | null;
    next_revision: string | null;
    is_finalized: boolean;
  }>(submission.teacher_final_reviews);

  return (
    <ReviewWorkspace
      submission={{
        id: submission.id,
        student_full_name: submission.student_full_name,
        class_name: submission.class_name,
        coursework_title: submission.coursework_title,
      }}
      ai={{
        total: Number(aiReview.total_ai_score),
        bm1: Number(aiReview.bm1_score),
        bm2: Number(aiReview.bm2_score),
        bm3: Number(aiReview.bm3_score),
        summary: aiReview.summary,
        teacher_annotation: aiReview.teacher_annotation,
        academic_integrity_risk: aiReview.academic_integrity_risk,
      }}
      criteria={aiReview.criterion_results.map(
        (c: {
          id: string;
          section: string;
          criterion_code: string;
          criterion_name: string;
          max_score: number;
          ai_score: number;
          teacher_score: number | null;
          level: string;
          evidence: string | null;
          problem: string | null;
          recommendation: string | null;
          confidence: string;
        }) => ({
          id: c.id,
          section: c.section,
          criterion_code: c.criterion_code,
          criterion_name: c.criterion_name,
          max_score: Number(c.max_score),
          ai_score: Number(c.ai_score),
          teacher_score:
            c.teacher_score == null ? null : Number(c.teacher_score),
          level: c.level,
          evidence: c.evidence,
          problem: c.problem,
          recommendation: c.recommendation,
          confidence: c.confidence,
        }),
      )}
      finalReview={
        finalReview
          ? {
              final_comment: finalReview.final_comment,
              strengths: finalReview.strengths,
              needs_improvement: finalReview.needs_improvement,
              next_revision: finalReview.next_revision,
              is_finalized: finalReview.is_finalized,
            }
          : null
      }
    />
  );
}
