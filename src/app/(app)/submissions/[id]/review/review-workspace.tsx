"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  BM1_MAX,
  BM2_MAX,
  BM3_MAX,
  RUBRIC_BY_CODE,
  TOTAL_MAX_SCORE,
} from "@/lib/rubric";

interface CriterionRow {
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
}

interface Props {
  submission: {
    id: string;
    student_full_name: string;
    class_name: string;
    coursework_title: string;
  };
  ai: {
    total: number;
    bm1: number;
    bm2: number;
    bm3: number;
    summary: string | null;
    teacher_annotation: string | null;
    academic_integrity_risk: string;
  };
  criteria: CriterionRow[];
  finalReview: {
    final_comment: string | null;
    strengths: string | null;
    needs_improvement: string | null;
    next_revision: string | null;
    is_finalized: boolean;
  } | null;
}

export function ReviewWorkspace({ submission, ai, criteria, finalReview }: Props) {
  const router = useRouter();

  const [rows, setRows] = React.useState<CriterionRow[]>(criteria);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [finalizing, setFinalizing] = React.useState(false);

  const [strengths, setStrengths] = React.useState(finalReview?.strengths ?? "");
  const [needsImprovement, setNeedsImprovement] = React.useState(
    finalReview?.needs_improvement ?? "",
  );
  const [nextRevision, setNextRevision] = React.useState(
    finalReview?.next_revision ?? "",
  );
  const [finalComment, setFinalComment] = React.useState(
    finalReview?.final_comment ?? ai.teacher_annotation ?? "",
  );

  React.useEffect(() => {
    fetch(`/api/submissions/${submission.id}/pdf-url`)
      .then(async (r) => {
        if (!r.ok) throw new Error("PDF қол жетімсіз");
        const data = (await r.json()) as { url: string };
        setPdfUrl(data.url);
      })
      .catch((e) => setPdfError(e instanceof Error ? e.message : "PDF қол жетімсіз"));
  }, [submission.id]);

  function effectiveScore(row: CriterionRow): number {
    return row.teacher_score ?? row.ai_score;
  }

  function sumByBmCode(matches: (code: string) => boolean) {
    return rows.reduce((acc, row) => {
      if (!matches(row.criterion_code)) return acc;
      return acc + effectiveScore(row);
    }, 0);
  }

  const liveTotal = rows.reduce((acc, r) => acc + effectiveScore(r), 0);
  const liveBm1 = sumByBmCode((c) => c === "BM1_KNOWLEDGE");
  const liveBm2 = sumByBmCode(
    (c) => c === "BM2_ANALYSIS" || c === "BM2_EVIDENCE",
  );
  const liveBm3 = sumByBmCode((c) => c === "BM3_COMMUNICATION");

  async function persistRow(
    row: CriterionRow,
    payload: {
      teacher_score?: number | null;
      evidence?: string | null;
      problem?: string | null;
      recommendation?: string | null;
    },
  ) {
    setSavingIds((s) => new Set(s).add(row.id));
    try {
      const res = await fetch(`/api/criterion-results/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Сақтау қатесі");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Желі қатесі");
    } finally {
      setSavingIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  }

  function handleScoreChange(rowId: string, raw: string) {
    setRows((current) =>
      current.map((r) => {
        if (r.id !== rowId) return r;
        if (raw === "") return { ...r, teacher_score: null };
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return r;
        const clamped = Math.max(0, Math.min(r.max_score, Math.round(parsed)));
        return { ...r, teacher_score: clamped };
      }),
    );
  }

  function handleScoreBlur(row: CriterionRow) {
    void persistRow(row, { teacher_score: row.teacher_score });
  }

  function handleTextChange(
    rowId: string,
    field: "evidence" | "problem" | "recommendation",
    value: string,
  ) {
    setRows((current) =>
      current.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    );
  }

  function handleTextBlur(
    row: CriterionRow,
    field: "evidence" | "problem" | "recommendation",
  ) {
    void persistRow(row, { [field]: row[field] ?? "" });
  }

  async function handleFinalize(commitFinal: boolean) {
    setFinalizing(true);
    try {
      const res = await fetch(
        `/api/submissions/${submission.id}/finalize`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            final_total_score: liveTotal,
            final_bm1_score: liveBm1,
            final_bm2_score: liveBm2,
            final_bm3_score: liveBm3,
            final_comment: finalComment,
            strengths,
            needs_improvement: needsImprovement,
            next_revision: nextRevision,
            is_finalized: commitFinal,
          }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Сақталмады");
      }
      toast.success(commitFinal ? "Балл бекітілді!" : "Уақытша сақталды.");
      if (commitFinal) router.push(`/submissions/${submission.id}/report`);
      else router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Сақтау қатесі");
    } finally {
      setFinalizing(false);
    }
  }

  // Sort rows in official order
  const ORDER = [
    "BM1_KNOWLEDGE",
    "BM2_ANALYSIS",
    "BM2_EVIDENCE",
    "BM3_COMMUNICATION",
  ];
  const orderedRows = [...rows].sort(
    (a, b) =>
      ORDER.indexOf(a.criterion_code) - ORDER.indexOf(b.criterion_code),
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/submissions/${submission.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Жұмыс бетіне қайту
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Балл бекіту</h1>
          <p className="text-sm text-muted-foreground">
            {submission.coursework_title} · {submission.student_full_name} ·{" "}
            {submission.class_name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleFinalize(false)}
            disabled={finalizing}
          >
            {finalizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сақтау
          </Button>
          <Button onClick={() => handleFinalize(true)} disabled={finalizing}>
            {finalizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Бекіту
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
          <Card className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">PDF алдын ала қарау</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pt-0 pb-3">
              {pdfError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {pdfError}
                </p>
              )}
              {!pdfError &&
                (pdfUrl ? (
                  <iframe
                    title="PDF"
                    src={pdfUrl}
                    className="h-full w-full rounded-md border bg-muted"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    PDF жүктелуде...
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <LiveScore label="Жалпы" value={liveTotal} max={TOTAL_MAX_SCORE} primary />
            <LiveScore label="БМ1" value={liveBm1} max={BM1_MAX} />
            <LiveScore label="БМ2" value={liveBm2} max={BM2_MAX} />
            <LiveScore label="БМ3" value={liveBm3} max={BM3_MAX} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Критерийлік балл</CardTitle>
              <CardDescription>
                Ресми NIS рубрикасы: 4 критерий × 10 балл = 40 балл. Бос
                қалдырсаңыз ЖИ ұсынған балл қолданылады. ЖИ дайындаған
                мәтіндерді (дәйексөз / әлсіз тұс / ұсыныс) өз сөзіңізбен
                өңдеп жазсаңыз болады — өзгертулер автоматты сақталады.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {orderedRows.map((row) => {
                const rubric = RUBRIC_BY_CODE[row.criterion_code];
                const saving = savingIds.has(row.id);
                return (
                  <div key={row.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {row.criterion_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rubric?.description ?? ""}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline">
                            AI: {Number(row.ai_score).toFixed(0)} /{" "}
                            {row.max_score}
                          </Badge>
                          <Badge variant="outline">
                            Сенімділік: {row.confidence}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step={1}
                          min={0}
                          max={row.max_score}
                          value={
                            row.teacher_score === null ? "" : row.teacher_score
                          }
                          onChange={(e) =>
                            handleScoreChange(row.id, e.target.value)
                          }
                          onBlur={() => handleScoreBlur(row)}
                          placeholder={String(row.ai_score)}
                          className="w-20"
                        />
                        <span className="text-xs text-muted-foreground">
                          / {row.max_score}
                        </span>
                        {saving && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="mt-3 space-y-3 text-xs">
                      <EditableAiText
                        label="Мәтіннен дәйексөздер (ЖИ ұсынысы)"
                        value={row.evidence ?? ""}
                        rows={4}
                        onChange={(v) =>
                          handleTextChange(row.id, "evidence", v)
                        }
                        onBlur={() => handleTextBlur(row, "evidence")}
                        placeholder="Жұмыс мәтінінен дәйексөз. Қажет болса өңдеңіз..."
                      />
                      <EditableAiText
                        label="Әлсіз тұстары (ЖИ ұсынысы)"
                        value={row.problem ?? ""}
                        rows={3}
                        onChange={(v) =>
                          handleTextChange(row.id, "problem", v)
                        }
                        onBlur={() => handleTextBlur(row, "problem")}
                        placeholder="Кемшіліктер тізімі..."
                      />
                      <EditableAiText
                        label="Ұсыныстар (ЖИ нұсқасы)"
                        value={row.recommendation ?? ""}
                        rows={3}
                        onChange={(v) =>
                          handleTextChange(row.id, "recommendation", v)
                        }
                        onBlur={() => handleTextBlur(row, "recommendation")}
                        placeholder="Нақты түзету қадамдары..."
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Мұғалім аннотациясы</CardTitle>
              <CardDescription>
                Бекітуден бұрын кері байланысты тексеріп, өзгертіңіз.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Күшті жағы</Label>
                <Textarea
                  rows={3}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Мысалы: тақырып өзекті ашылған, дереккөздер сенімді..."
                />
              </div>
              <div className="space-y-2">
                <Label>Толықтыру қажет тұсы</Label>
                <Textarea
                  rows={3}
                  value={needsImprovement}
                  onChange={(e) => setNeedsImprovement(e.target.value)}
                  placeholder="Мысалы: 2-зерттеу сұрағы әлсіз ашылған..."
                />
              </div>
              <div className="space-y-2">
                <Label>Келесі редакцияда не істеу керек</Label>
                <Textarea
                  rows={3}
                  value={nextRevision}
                  onChange={(e) => setNextRevision(e.target.value)}
                  placeholder="Мысалы: SWOT-ты толық құрастыр, әр дәлелден кейін талдау қос..."
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Жалпы мұғалім аннотациясы</Label>
                <Textarea
                  rows={3}
                  value={finalComment}
                  onChange={(e) => setFinalComment(e.target.value)}
                  placeholder="Модерацияға дайын қысқа қорытынды..."
                />
              </div>
            </CardContent>
          </Card>

          {finalReview?.is_finalized && (
            <p className="rounded-md bg-success/10 px-3 py-2 text-sm">
              Бұл жұмыс бекітілген. Қайта бекіту арқылы өзгертуге болады.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EditableAiText({
  label,
  value,
  rows,
  placeholder,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="text-xs leading-relaxed"
      />
    </div>
  );
}

function LiveScore({
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
  return (
    <div
      className={`rounded-md border p-3 ${primary ? "border-primary/30 bg-primary/5" : "bg-card"}`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">
        {value.toFixed(0)}{" "}
        <span className="text-sm text-muted-foreground">/ {max}</span>
      </p>
    </div>
  );
}
