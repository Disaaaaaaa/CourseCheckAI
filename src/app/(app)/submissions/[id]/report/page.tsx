import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthenticatedTeacher } from "@/lib/auth";
import { firstOf } from "@/lib/utils";
import { ReportView } from "./report-view";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
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
         final_total_score, final_bm1_score, final_bm2_score, final_bm3_score,
         final_comment, strengths, needs_improvement, next_revision, is_finalized
       ),
       interview_questions ( id, question, purpose, risk_area )
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
    student_feedback: string | null;
    academic_integrity_risk: string;
    raw_json: unknown;
    criterion_results: Array<{
      id: string;
      criterion_code: string;
      criterion_name: string;
      max_score: number;
      ai_score: number;
      teacher_score: number | null;
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
            Есеп жасау үшін AI талдау керек.
          </CardContent>
        </Card>
      </div>
    );
  }

  const finalReview = firstOf<{
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
    <ReportView
      submission={{
        id: submission.id,
        student_full_name: submission.student_full_name,
        class_name: submission.class_name,
        coursework_title: submission.coursework_title,
        pdf_file_name: submission.pdf_file_name,
        created_at: submission.created_at,
        teacher_full_name: teacher.full_name ?? teacher.email,
        school_name: teacher.school_name,
      }}
      ai={aiReview}
      criteria={aiReview.criterion_results}
      finalReview={
        finalReview
          ? {
              final_total_score:
                finalReview.final_total_score == null
                  ? null
                  : Number(finalReview.final_total_score),
              final_bm1_score:
                finalReview.final_bm1_score == null
                  ? null
                  : Number(finalReview.final_bm1_score),
              final_bm2_score:
                finalReview.final_bm2_score == null
                  ? null
                  : Number(finalReview.final_bm2_score),
              final_bm3_score:
                finalReview.final_bm3_score == null
                  ? null
                  : Number(finalReview.final_bm3_score),
              final_comment: finalReview.final_comment,
              strengths: finalReview.strengths,
              needs_improvement: finalReview.needs_improvement,
              next_revision: finalReview.next_revision,
              is_finalized: finalReview.is_finalized,
            }
          : null
      }
      interview={submission.interview_questions ?? []}
    />
  );
}
