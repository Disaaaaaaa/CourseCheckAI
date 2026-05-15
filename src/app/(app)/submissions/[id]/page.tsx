import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  FileText,
  Lightbulb,
  PencilLine,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getAuthenticatedTeacher } from "@/lib/auth";
import {
  BM1_MAX,
  BM2_MAX,
  BM3_MAX,
  RUBRIC,
  RUBRIC_BY_CODE,
  SECTION_LABELS,
  TOTAL_MAX_SCORE,
  type LevelBand,
  type RubricSection,
} from "@/lib/rubric";
import { STATUS_LABEL, STATUS_VARIANT } from "@/lib/status";
import { firstOf, formatDate } from "@/lib/utils";
import { RetryAnalyzeButton } from "./retry-analyze";

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

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
  confidence: "low" | "medium" | "high";
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

interface RawJson {
  submission_summary?: {
    detected_word_count?: number;
    target_word_count_status?: "below" | "within" | "above";
    detected_sections?: string[];
    missing_sections?: string[];
    structural_completeness?: string;
    overall_comment?: string;
  };
  scores?: {
    bm1?: number;
    bm2_analysis?: number;
    bm2_evidence?: number;
    bm3?: number;
    total?: number;
  };
  criteria?: AiCriterionJson[];
  section_analysis?: SectionAnalysisJson[];
  academic_integrity?: {
    risk_level?: "low" | "medium" | "high";
    risk_reasons?: string[];
    teacher_actions?: string[];
  };
  student_feedback?: {
    strengths?: string[];
    needs_improvement?: string[];
    next_revision_steps?: string[];
  };
  teacher_annotation?: {
    short_comment?: string;
    moderation_note?: string;
  };
}

export default async function SubmissionDetailPage({ params }: DetailPageProps) {
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
       teacher_final_reviews ( final_total_score, is_finalized ),
       interview_questions ( id, question, purpose, risk_area )
      `,
    )
    .eq("id", id)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!submission) {
    return (
      <div className="space-y-4">
        <Link
          href="/submissions"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Тексерулерге қайту
        </Link>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Жұмыс табылмады.
          </CardContent>
        </Card>
      </div>
    );
  }

  type CriterionDbRow = {
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
  };
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
    criterion_results: CriterionDbRow[];
  }>(submission.ai_reviews);
  const criteriaDb = aiReview?.criterion_results ?? [];
  const finalReview = firstOf<{
    final_total_score: number | string | null;
    is_finalized: boolean;
  }>(submission.teacher_final_reviews);
  const interview = submission.interview_questions ?? [];
  const raw = (aiReview?.raw_json ?? null) as RawJson | null;
  const aiCriteria = raw?.criteria ?? [];
  const sectionAnalysis = raw?.section_analysis ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/submissions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Тексерулерге қайту
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Badge
            variant={STATUS_VARIANT[submission.status as keyof typeof STATUS_VARIANT]}
            className="mb-2"
          >
            {STATUS_LABEL[submission.status as keyof typeof STATUS_LABEL]}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            {submission.coursework_title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {submission.student_full_name} · {submission.class_name} · Жүктелген:{" "}
            {formatDate(submission.created_at)}
            {raw?.submission_summary?.detected_word_count != null && (
              <>
                {" "}
                · {raw.submission_summary.detected_word_count} сөз{" "}
                <WordCountBadge
                  status={raw.submission_summary.target_word_count_status}
                />
              </>
            )}
          </p>
          {submission.error_message && (
            <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submission.error_message}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <RetryAnalyzeButton submissionId={submission.id} />
          <Button asChild variant="outline">
            <Link href={`/submissions/${submission.id}/report`}>
              <FileText className="h-4 w-4" /> Есеп
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/submissions/${submission.id}/review`}>
              <PencilLine className="h-4 w-4" /> Балл бекіту
            </Link>
          </Button>
        </div>
      </div>

      {aiReview ? (
        <>
          {/* Score cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCard
              label="Жалпы AI"
              value={Number(aiReview.total_ai_score)}
              max={TOTAL_MAX_SCORE}
              primary
            />
            <ScoreCard
              label="БМ1 · Білу"
              value={Number(aiReview.bm1_score)}
              max={BM1_MAX}
            />
            <ScoreCard
              label="БМ2 · Талдау + Дәйектер"
              value={Number(aiReview.bm2_score)}
              max={BM2_MAX}
            />
            <ScoreCard
              label="БМ3 · Стиль"
              value={Number(aiReview.bm3_score)}
              max={BM3_MAX}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI жалпы қорытынды
                  </CardTitle>
                  <CardDescription>
                    Мұғалімге арналған модерациялық пікір.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-relaxed">
                  <p>{aiReview.summary}</p>
                  {raw?.submission_summary?.structural_completeness && (
                    <p className="rounded-md bg-muted/60 px-3 py-2 text-muted-foreground">
                      <strong className="text-foreground">Құрылым: </strong>
                      {raw.submission_summary.structural_completeness}
                    </p>
                  )}
                  {raw?.teacher_annotation?.moderation_note && (
                    <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground">
                      <strong className="text-foreground">
                        Модерациялық ескертпе:{" "}
                      </strong>
                      {raw.teacher_annotation.moderation_note}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 4 criteria with detailed comments */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Критерийлік талдау</h2>
                  <p className="text-sm text-muted-foreground">
                    Ресми NIS рубрикасы: 4 критерий × 10 балл = 40 балл. Әр
                    критерийде 3 толық детальді комментарий.
                  </p>
                </div>

                {RUBRIC.map((rubric) => {
                  const ai = aiCriteria.find(
                    (c) => c.criterion_code === rubric.code,
                  );
                  const db = criteriaDb.find(
                    (c) => c.criterion_code === rubric.code,
                  );
                  if (!ai && !db) return null;
                  const teacherScore = db?.teacher_score
                    ? Number(db.teacher_score)
                    : null;
                  const aiScore = Number(db?.ai_score ?? ai?.suggested_score ?? 0);
                  return (
                    <CriterionBlock
                      key={rubric.code}
                      title={rubric.name}
                      description={rubric.description}
                      maxScore={rubric.maxScore}
                      aiScore={aiScore}
                      teacherScore={teacherScore}
                      levelBand={ai?.level_band}
                      bandMatchExplanation={ai?.band_match_explanation}
                      bandDescriptor={
                        ai?.level_band
                          ? rubric.bandDescriptors[ai.level_band]
                          : undefined
                      }
                      detailedComments={ai?.detailed_comments ?? []}
                      strengths={ai?.strengths ?? []}
                      weaknesses={ai?.weaknesses ?? []}
                      confidence={ai?.confidence}
                    />
                  );
                })}
              </div>

              {/* Section-by-section analysis */}
              {sectionAnalysis.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpenCheck className="h-4 w-4 text-primary" />
                      Бөлімдер бойынша диагностика
                    </CardTitle>
                    <CardDescription>
                      Курстық жұмыстың әр құрылымдық бөлігінің сапасы.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sectionAnalysis.map((section) => (
                      <div
                        key={section.section}
                        className="rounded-md border p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold">
                              {SECTION_LABELS[section.section] ??
                                section.section_name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              ~{section.word_count_estimate} сөз
                            </p>
                          </div>
                          <Badge variant={presenceVariant(section.presence)}>
                            {presenceLabel(section.presence)}
                          </Badge>
                        </div>
                        {section.key_observations.length > 0 && (
                          <BulletList
                            label="Байқаулар"
                            items={section.key_observations}
                          />
                        )}
                        {section.issues.length > 0 && (
                          <BulletList
                            label="Кемшіліктер"
                            items={section.issues}
                            tone="destructive"
                          />
                        )}
                        {section.recommendations.length > 0 && (
                          <BulletList
                            label="Ұсыныстар"
                            items={section.recommendations}
                            tone="primary"
                          />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    Академиялық адалдық
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Badge
                    variant={
                      aiReview.academic_integrity_risk === "high"
                        ? "destructive"
                        : aiReview.academic_integrity_risk === "medium"
                          ? "warning"
                          : "success"
                    }
                  >
                    Тәуекел: {String(aiReview.academic_integrity_risk).toUpperCase()}
                  </Badge>
                  {raw?.academic_integrity?.risk_reasons &&
                    raw.academic_integrity.risk_reasons.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                        {raw.academic_integrity.risk_reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                  {raw?.academic_integrity?.teacher_actions &&
                    raw.academic_integrity.teacher_actions.length > 0 && (
                      <>
                        <Separator />
                        <p className="text-xs font-medium text-foreground">
                          Мұғалімге әрекет:
                        </p>
                        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                          {raw.academic_integrity.teacher_actions.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </>
                    )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Оқушыға кері байланыс
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <FeedbackList
                    label="Күшті жағы"
                    items={raw?.student_feedback?.strengths ?? []}
                  />
                  <FeedbackList
                    label="Толықтыру қажет"
                    items={raw?.student_feedback?.needs_improvement ?? []}
                  />
                  <FeedbackList
                    label="Келесі редакция"
                    items={raw?.student_feedback?.next_revision_steps ?? []}
                  />
                </CardContent>
              </Card>

              {interview.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Сұхбат сұрақтары
                    </CardTitle>
                    <CardDescription>
                      Оқушының түсінігі мен авторлықты тексеру.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2 text-sm">
                      {interview.map(
                        (
                          q: {
                            id: string;
                            question: string;
                            purpose: string | null;
                          },
                          i: number,
                        ) => (
                          <li key={q.id} className="rounded-md border p-3">
                            <p className="font-medium">
                              {i + 1}. {q.question}
                            </p>
                            {q.purpose && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Мақсаты: {q.purpose}
                              </p>
                            )}
                          </li>
                        ),
                      )}
                    </ol>
                  </CardContent>
                </Card>
              )}

              {raw?.submission_summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Құрылым</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p>
                      <span className="font-medium">Табылған бөлімдер: </span>
                      {(raw.submission_summary.detected_sections ?? []).join(
                        ", ",
                      ) || "—"}
                    </p>
                    <p>
                      <span className="font-medium">Жоқ бөлімдер: </span>
                      {(raw.submission_summary.missing_sections ?? []).join(
                        ", ",
                      ) || "—"}
                    </p>
                    {finalReview?.is_finalized && (
                      <Badge variant="success" className="mt-2">
                        Балл бекітілді: {finalReview.final_total_score} /{" "}
                        {TOTAL_MAX_SCORE}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {submission.status === "failed"
              ? "Талдау қатемен аяқталды. Жоғарыдағы «Қайта талдау» түймесін басыңыз."
              : "AI талдау әлі дайын емес. «Қайта талдау» түймесімен қайта іске қосыңыз."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CriterionBlock({
  title,
  description,
  maxScore,
  aiScore,
  teacherScore,
  levelBand,
  bandMatchExplanation,
  bandDescriptor,
  detailedComments,
  strengths,
  weaknesses,
  confidence,
}: {
  title: string;
  description: string;
  maxScore: number;
  aiScore: number;
  teacherScore: number | null;
  levelBand?: LevelBand;
  bandMatchExplanation?: string;
  bandDescriptor?: string;
  detailedComments: DetailedComment[];
  strengths: string[];
  weaknesses: string[];
  confidence?: "low" | "medium" | "high";
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">
              {aiScore.toFixed(0)}{" "}
              <span className="text-base text-muted-foreground">
                / {maxScore}
              </span>
            </div>
            {teacherScore !== null && (
              <p className="text-xs text-primary">
                Мұғалім: {teacherScore.toFixed(0)}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {levelBand && (
            <Badge variant={bandVariant(levelBand)}>
              Деңгей жолағы: {levelBand}
            </Badge>
          )}
          {confidence && (
            <Badge variant={confidenceVariant(confidence)}>
              Сенімділік: {confidence}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {bandDescriptor && (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Ресми сипаттама ({levelBand}): </strong>
            {bandDescriptor}
          </div>
        )}
        {bandMatchExplanation && (
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Жұмыс қалай сай келеді: </strong>
            {bandMatchExplanation}
          </p>
        )}

        {detailedComments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Толық детальді комментарийлер
            </h4>
            <ol className="space-y-3">
              {detailedComments.map((c, i) => (
                <li
                  key={i}
                  className="rounded-md border bg-card p-3 text-sm"
                >
                  <p className="font-semibold">
                    {i + 1}. {c.title}
                  </p>
                  <dl className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
                    <DefRow label="Байқау" value={c.observation} />
                    <DefRow
                      label="Мәтіннен дәйексөз"
                      value={c.evidence_from_text}
                      italic
                    />
                    <DefRow label="Талдау" value={c.analysis} />
                    <DefRow
                      label="Ұсыныс"
                      value={c.improvement_suggestion}
                      tone="primary"
                    />
                  </dl>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-success">Күшті жағы</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-destructive">
                Әлсіз тұстары
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DefRow({
  label,
  value,
  italic,
  tone,
}: {
  label: string;
  value: string;
  italic?: boolean;
  tone?: "primary";
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="font-medium text-foreground">{label}:</dt>
      <dd
        className={`${italic ? "italic" : ""} ${tone === "primary" ? "text-primary" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function BulletList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone?: "destructive" | "primary";
}) {
  if (!items.length) return null;
  const color =
    tone === "destructive"
      ? "text-destructive"
      : tone === "primary"
        ? "text-primary"
        : "text-foreground";
  return (
    <div className="mt-3">
      <p className={`text-xs font-semibold ${color}`}>{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  max,
  primary,
}: {
  label: string;
  value: number;
  max: number;
  primary?: boolean;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <Card className={primary ? "border-primary/30" : undefined}>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold">
          {value.toFixed(0)}{" "}
          <span className="text-base text-muted-foreground">/ {max}</span>
        </p>
        <Progress value={pct} className="mt-3" />
      </CardContent>
    </Card>
  );
}

function FeedbackList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function WordCountBadge({
  status,
}: {
  status?: "below" | "within" | "above";
}) {
  if (!status) return null;
  const label =
    status === "below"
      ? "(аз)"
      : status === "above"
        ? "(көп)"
        : "(2500–3000 ✓)";
  return <span className="text-xs">{label}</span>;
}

function bandVariant(
  band: LevelBand,
): "default" | "secondary" | "outline" | "destructive" | "success" | "warning" {
  switch (band) {
    case "9-10":
    case "7-8":
      return "success";
    case "5-6":
      return "secondary";
    case "3-4":
      return "warning";
    case "1-2":
    case "0":
      return "destructive";
  }
}

function confidenceVariant(
  c: string,
): "default" | "secondary" | "outline" | "destructive" | "success" | "warning" {
  return c === "high" ? "success" : c === "medium" ? "secondary" : "warning";
}

function presenceVariant(
  p: "complete" | "partial" | "missing",
): "default" | "success" | "warning" | "destructive" {
  return p === "complete" ? "success" : p === "partial" ? "warning" : "destructive";
}

function presenceLabel(p: "complete" | "partial" | "missing") {
  return p === "complete" ? "Толық" : p === "partial" ? "Жартылай" : "Жоқ";
}

void RUBRIC_BY_CODE;
