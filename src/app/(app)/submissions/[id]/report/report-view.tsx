"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileSignature, Printer } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BM1_MAX,
  BM2_MAX,
  BM3_MAX,
  RUBRIC,
  SECTION_LABELS,
  TOTAL_MAX_SCORE,
  type LevelBand,
  type RubricSection,
} from "@/lib/rubric";
import { formatDate } from "@/lib/utils";

interface DetailedComment {
  title: string;
  observation: string;
  evidence_from_text: string;
  analysis: string;
  improvement_suggestion: string;
}

interface AiCriterionJson {
  criterion_code: string;
  criterion_name: string;
  max_score: number;
  suggested_score: number;
  level_band: LevelBand;
  band_match_explanation: string;
  detailed_comments: DetailedComment[];
  strengths: string[];
  weaknesses: string[];
}

interface SectionAnalysisJson {
  section: RubricSection;
  section_name: string;
  presence: "complete" | "partial" | "missing";
  word_count_estimate: number;
  key_observations: string[];
  issues: string[];
  recommendations: string[];
}

interface Props {
  submission: {
    id: string;
    student_full_name: string;
    class_name: string;
    coursework_title: string;
    pdf_file_name: string;
    created_at: string;
    teacher_full_name: string;
    school_name: string | null;
  };
  ai: {
    total_ai_score: number;
    bm1_score: number;
    bm2_score: number;
    bm3_score: number;
    summary: string | null;
    teacher_annotation: string | null;
    student_feedback: string | null;
    academic_integrity_risk: string;
    raw_json: unknown;
  };
  criteria: Array<{
    id: string;
    criterion_code: string;
    criterion_name: string;
    max_score: number;
    ai_score: number;
    teacher_score: number | null;
  }>;
  finalReview: {
    final_total_score: number | null;
    final_bm1_score: number | null;
    final_bm2_score: number | null;
    final_bm3_score: number | null;
    final_comment: string | null;
    strengths: string | null;
    needs_improvement: string | null;
    next_revision: string | null;
    is_finalized: boolean;
  } | null;
  interview: Array<{
    id: string;
    question: string;
    purpose: string | null;
    risk_area: string | null;
  }>;
}

export function ReportView({
  submission,
  ai,
  criteria,
  finalReview,
  interview,
}: Props) {
  const raw = ai.raw_json as {
    submission_summary?: {
      detected_word_count?: number;
      target_word_count_status?: string;
      structural_completeness?: string;
    };
    criteria?: AiCriterionJson[];
    section_analysis?: SectionAnalysisJson[];
    student_feedback?: {
      strengths?: string[];
      needs_improvement?: string[];
      next_revision_steps?: string[];
    };
    teacher_annotation?: { moderation_note?: string };
  } | null;

  const aiCriteria = raw?.criteria ?? [];
  const sections = raw?.section_analysis ?? [];

  const [downloadingExcel, setDownloadingExcel] = React.useState(false);
  const [downloadingLrf, setDownloadingLrf] = React.useState(false);

  async function downloadFile(
    type: "excel" | "lrf",
    setLoading: (b: boolean) => void,
  ) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/submissions/${submission.id}/export?type=${type}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Файл жасалмады");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="?([^";]+)"?/i);
      const fileName = match
        ? decodeURIComponent(match[1])
        : `coursecheck_${submission.id.slice(0, 8)}.${
            type === "excel" ? "xlsx" : "docx"
          }`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Қате");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/submissions/${submission.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Жұмыс бетіне қайту
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Басып шығару (PDF)
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadFile("excel", setDownloadingExcel)}
            disabled={downloadingExcel}
          >
            <Download className="h-4 w-4" />
            {downloadingExcel ? "Дайындалуда..." : "Excel жүктеу"}
          </Button>
          <Button
            onClick={() => downloadFile("lrf", setDownloadingLrf)}
            disabled={downloadingLrf || !finalReview?.is_finalized}
            title={
              !finalReview?.is_finalized
                ? "Алдымен баллды бекіту керек"
                : undefined
            }
          >
            <FileSignature className="h-4 w-4" />
            {downloadingLrf ? "Дайындалуда..." : "ОЖТФ (Word)"}
          </Button>
        </div>
      </div>

      <article className="rounded-xl border bg-card p-8 shadow-sm print:border-0 print:shadow-none print:bg-white print:p-0">
        <header className="border-b pb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            CourseCheck AI · NIS 12-сынып · Бағалау есебі
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {submission.coursework_title}
          </h1>
          <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Оқушы:</span>{" "}
              {submission.student_full_name}
            </p>
            <p>
              <span className="font-medium text-foreground">Сынып:</span>{" "}
              {submission.class_name}
            </p>
            <p>
              <span className="font-medium text-foreground">Мұғалім:</span>{" "}
              {submission.teacher_full_name}
            </p>
            <p>
              <span className="font-medium text-foreground">Мектеп:</span>{" "}
              {submission.school_name ?? "—"}
            </p>
            <p>
              <span className="font-medium text-foreground">PDF:</span>{" "}
              {submission.pdf_file_name}
            </p>
            <p>
              <span className="font-medium text-foreground">Жүктелген:</span>{" "}
              {formatDate(submission.created_at)}
            </p>
            {raw?.submission_summary?.detected_word_count != null && (
              <p>
                <span className="font-medium text-foreground">Сөз саны:</span>{" "}
                {raw.submission_summary.detected_word_count}{" "}
                ({raw.submission_summary.target_word_count_status === "within"
                  ? "норма"
                  : raw.submission_summary.target_word_count_status === "below"
                    ? "норманнан аз"
                    : "норманнан көп"})
              </p>
            )}
          </div>
        </header>

        <section className="grid gap-3 py-6 sm:grid-cols-4">
          <ScoreCell
            label="Жалпы балл"
            ai={Number(ai.total_ai_score)}
            teacher={
              finalReview?.final_total_score != null
                ? Number(finalReview.final_total_score)
                : null
            }
            max={TOTAL_MAX_SCORE}
            primary
          />
          <ScoreCell
            label="БМ1 · Білу"
            ai={Number(ai.bm1_score)}
            teacher={
              finalReview?.final_bm1_score != null
                ? Number(finalReview.final_bm1_score)
                : null
            }
            max={BM1_MAX}
          />
          <ScoreCell
            label="БМ2 · Талдау + Дәйектер"
            ai={Number(ai.bm2_score)}
            teacher={
              finalReview?.final_bm2_score != null
                ? Number(finalReview.final_bm2_score)
                : null
            }
            max={BM2_MAX}
          />
          <ScoreCell
            label="БМ3 · Стиль"
            ai={Number(ai.bm3_score)}
            teacher={
              finalReview?.final_bm3_score != null
                ? Number(finalReview.final_bm3_score)
                : null
            }
            max={BM3_MAX}
          />
        </section>

        <section className="space-y-2 py-2">
          <Badge
            variant={
              ai.academic_integrity_risk === "high"
                ? "destructive"
                : ai.academic_integrity_risk === "medium"
                  ? "warning"
                  : "success"
            }
          >
            Академиялық тәуекел:{" "}
            {String(ai.academic_integrity_risk).toUpperCase()}
          </Badge>
          {finalReview?.is_finalized && (
            <Badge variant="success" className="ml-2">
              ✓ Бекітілді
            </Badge>
          )}
        </section>

        {ai.summary && (
          <section className="space-y-2 py-4">
            <h2 className="text-lg font-semibold">AI жалпы қорытынды</h2>
            <p className="text-sm leading-relaxed">{ai.summary}</p>
            {raw?.submission_summary?.structural_completeness && (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <strong>Құрылым: </strong>
                {raw.submission_summary.structural_completeness}
              </p>
            )}
          </section>
        )}

        {/* 4 criteria */}
        <section className="space-y-4 py-6">
          <h2 className="text-lg font-semibold">Критерийлік талдау</h2>
          {RUBRIC.map((rubric) => {
            const ai = aiCriteria.find(
              (c) => c.criterion_code === rubric.code,
            );
            const db = criteria.find(
              (c) => c.criterion_code === rubric.code,
            );
            if (!ai && !db) return null;
            const teacherScore = db?.teacher_score
              ? Number(db.teacher_score)
              : null;
            const aiScore = Number(db?.ai_score ?? ai?.suggested_score ?? 0);
            return (
              <div key={rubric.code} className="rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{rubric.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {rubric.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold">
                      {(teacherScore ?? aiScore).toFixed(0)}{" "}
                      <span className="text-sm text-muted-foreground">
                        / {rubric.maxScore}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      AI: {aiScore.toFixed(0)} · Мұғалім:{" "}
                      {teacherScore != null ? teacherScore.toFixed(0) : "—"}
                    </p>
                  </div>
                </div>
                {ai?.level_band && (
                  <div className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
                    <strong>Деңгей жолағы {ai.level_band}: </strong>
                    {rubric.bandDescriptors[ai.level_band]}
                  </div>
                )}
                {ai?.band_match_explanation && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {ai.band_match_explanation}
                  </p>
                )}

                {ai?.detailed_comments && ai.detailed_comments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Толық детальді комментарийлер
                    </p>
                    <ol className="space-y-2">
                      {ai.detailed_comments.map((c, i) => (
                        <li key={i} className="rounded-md border p-3 text-sm">
                          <p className="font-semibold">
                            {i + 1}. {c.title}
                          </p>
                          <p className="mt-1 text-xs">
                            <strong>Байқау: </strong>
                            {c.observation}
                          </p>
                          <p className="mt-1 text-xs italic">
                            <strong className="not-italic">
                              Мәтіннен дәйексөз:{" "}
                            </strong>
                            {c.evidence_from_text}
                          </p>
                          <p className="mt-1 text-xs">
                            <strong>Талдау: </strong>
                            {c.analysis}
                          </p>
                          <p className="mt-1 text-xs">
                            <strong>Ұсыныс: </strong>
                            {c.improvement_suggestion}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                  {ai?.strengths && ai.strengths.length > 0 && (
                    <div>
                      <p className="font-semibold text-success">Күшті жағы</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                        {ai.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ai?.weaknesses && ai.weaknesses.length > 0 && (
                    <div>
                      <p className="font-semibold text-destructive">
                        Әлсіз тұстары
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                        {ai.weaknesses.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Section analysis */}
        {sections.length > 0 && (
          <section className="space-y-3 py-4">
            <h2 className="text-lg font-semibold">
              Бөлімдер бойынша диагностика
            </h2>
            {sections.map((s) => (
              <div key={s.section} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {SECTION_LABELS[s.section] ?? s.section_name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ~{s.word_count_estimate} сөз ·{" "}
                    {s.presence === "complete"
                      ? "толық"
                      : s.presence === "partial"
                        ? "жартылай"
                        : "жоқ"}
                  </span>
                </div>
                {s.key_observations.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {s.key_observations.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                )}
                {s.issues.length > 0 && (
                  <div className="mt-1 text-xs">
                    <strong className="text-destructive">Кемшіліктер: </strong>
                    {s.issues.join(", ")}
                  </div>
                )}
                {s.recommendations.length > 0 && (
                  <div className="mt-1 text-xs">
                    <strong className="text-primary">Ұсыныстар: </strong>
                    {s.recommendations.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Teacher feedback */}
        <section className="grid gap-4 py-4 md:grid-cols-2">
          <FeedbackBlock
            title="Күшті жағы"
            text={finalReview?.strengths}
            fallback={raw?.student_feedback?.strengths}
          />
          <FeedbackBlock
            title="Толықтыру қажет тұсы"
            text={finalReview?.needs_improvement}
            fallback={raw?.student_feedback?.needs_improvement}
          />
          <FeedbackBlock
            title="Келесі редакцияда"
            text={finalReview?.next_revision}
            fallback={raw?.student_feedback?.next_revision_steps}
          />
          <FeedbackBlock
            title="Мұғалім аннотациясы"
            text={finalReview?.final_comment ?? ai.teacher_annotation}
            fallback={
              raw?.teacher_annotation?.moderation_note
                ? [raw.teacher_annotation.moderation_note]
                : undefined
            }
          />
        </section>

        {interview.length > 0 && (
          <section className="space-y-2 py-4">
            <h2 className="text-lg font-semibold">Сұхбат сұрақтары</h2>
            <ol className="list-decimal space-y-2 pl-6 text-sm">
              {interview.map((q) => (
                <li key={q.id}>
                  <p>{q.question}</p>
                  {q.purpose && (
                    <p className="text-xs text-muted-foreground">
                      Мақсаты: {q.purpose}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          Бұл есеп AI ұсыныстары мен мұғалімнің бекіткен баллдары негізінде
          жасалды. Ресми NIS рубрикасына (тест спецификациясы, Астана 2025) сай.
          Соңғы шешімді мұғалім қабылдайды.
        </footer>
      </article>
    </div>
  );
}

function ScoreCell({
  label,
  ai,
  teacher,
  max,
  primary,
}: {
  label: string;
  ai: number;
  teacher: number | null;
  max: number;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${primary ? "border-primary/30 bg-primary/5" : ""}`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">
        {(teacher ?? ai).toFixed(0)}{" "}
        <span className="text-sm text-muted-foreground">/ {max}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        AI: {ai.toFixed(0)} · Мұғалім:{" "}
        {teacher != null ? teacher.toFixed(0) : "—"}
      </p>
    </div>
  );
}

function FeedbackBlock({
  title,
  text,
  fallback,
}: {
  title: string;
  text?: string | null;
  fallback?: string[];
}) {
  const body =
    text && text.trim().length > 0
      ? text
      : (fallback ?? []).map((s) => `• ${s}`).join("\n");
  if (!body) return null;
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
