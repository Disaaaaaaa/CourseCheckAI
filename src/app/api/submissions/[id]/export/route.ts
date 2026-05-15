import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
import { firstOf, formatDate } from "@/lib/utils";
import { buildLrfDocx, LRF_SECTION_PREFIX } from "@/lib/exports/lrf";
import { cleanText } from "@/lib/exports/sanitize";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";

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

export async function POST(req: Request, { params }: RouteParams) {
  try {
    return await handleExport(req, await params);
  } catch (e) {
    console.error("[export] unexpected error:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Экспорт қатесі: ${e.message}`
            : "Файл жасалмады. Қайталап көріңіз.",
      },
      { status: 500 },
    );
  }
}

async function handleExport(req: Request, { id }: { id: string }) {
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "excel").toLowerCase();
  if (type !== "excel" && type !== "lrf") {
    return NextResponse.json(
      {
        error:
          "Қолжетімді экспорт типтері: 'excel' (xlsx) немесе 'lrf' (docx).",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Авторизация қажет" }, { status: 401 });
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, full_name, school_name, subject")
    .eq("user_id", user.id)
    .single();
  if (!teacher) {
    return NextResponse.json({ error: "Профиль табылмады" }, { status: 400 });
  }

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select(
      `*,
       ai_reviews (
         id, total_ai_score, bm1_score, bm2_score, bm3_score, summary,
         teacher_annotation, student_feedback, academic_integrity_risk, raw_json,
         criterion_results (
           id, section, criterion_code, criterion_name, max_score, ai_score,
           teacher_score, level, evidence, problem, recommendation, confidence
         )
       ),
       teacher_final_reviews (
         final_total_score, final_bm1_score, final_bm2_score, final_bm3_score,
         final_comment, strengths, needs_improvement, next_revision, is_finalized
       ),
       interview_questions ( question, purpose, risk_area )
      `,
    )
    .eq("id", id)
    .single();
  if (subErr || !submission) {
    return NextResponse.json({ error: "Жұмыс табылмады" }, { status: 404 });
  }

  // Handle LRF (DOCX) export branch
  if (type === "lrf") {
    return await handleLrfExport({
      submission,
      teacher,
    });
  }

  const aiReview = firstOf<Record<string, unknown> & {
    id?: string;
    total_ai_score?: number | string;
    bm1_score?: number | string;
    bm2_score?: number | string;
    bm3_score?: number | string;
    summary?: string | null;
    teacher_annotation?: string | null;
    student_feedback?: string | null;
    academic_integrity_risk?: string;
    raw_json?: unknown;
    criterion_results?: Array<Record<string, unknown>>;
  }>(submission.ai_reviews);
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
  const interview = submission.interview_questions ?? [];
  const criteriaDb = aiReview?.criterion_results ?? [];
  const raw = (aiReview?.raw_json ?? null) as {
    criteria?: AiCriterionJson[];
    section_analysis?: SectionAnalysisJson[];
    student_feedback?: {
      strengths?: string[];
      needs_improvement?: string[];
      next_revision_steps?: string[];
    };
    teacher_annotation?: { moderation_note?: string };
    submission_summary?: {
      detected_word_count?: number;
      target_word_count_status?: string;
      structural_completeness?: string;
    };
  } | null;
  const aiCriteria = raw?.criteria ?? [];
  const sectionAnalysis = raw?.section_analysis ?? [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CourseWorkCheck";

  // ─── Sheet 1: Қорытынды ───────────────────────────────────────────────
  const summary = workbook.addWorksheet("Қорытынды");
  summary.columns = [{ width: 34 }, { width: 70 }];
  summary.addRows([
    ["Оқушы", cleanText(submission.student_full_name)],
    ["Сынып", cleanText(submission.class_name)],
    ["Тақырып", cleanText(submission.coursework_title)],
    ["PDF файл", cleanText(submission.pdf_file_name)],
    ["Жүктелген", formatDate(submission.created_at)],
    [
      "Сөз саны",
      raw?.submission_summary?.detected_word_count != null
        ? `${raw.submission_summary.detected_word_count} (${cleanText(raw.submission_summary.target_word_count_status) || "—"})`
        : "—",
    ],
    [],
    ["AI жалпы балл", `${aiReview?.total_ai_score ?? 0} / ${TOTAL_MAX_SCORE}`],
    ["AI БМ1 (Білу)", `${aiReview?.bm1_score ?? 0} / ${BM1_MAX}`],
    ["AI БМ2 (Талдау + Дәйектер)", `${aiReview?.bm2_score ?? 0} / ${BM2_MAX}`],
    ["AI БМ3 (Стиль)", `${aiReview?.bm3_score ?? 0} / ${BM3_MAX}`],
    [
      "Академиялық тәуекел",
      cleanText(aiReview?.academic_integrity_risk) || "—",
    ],
    [],
    [
      "Мұғалім жалпы балл",
      finalReview?.final_total_score != null
        ? `${finalReview.final_total_score} / ${TOTAL_MAX_SCORE}${finalReview.is_finalized ? " (бекітілді)" : ""}`
        : "—",
    ],
    [
      "Мұғалім БМ1",
      finalReview?.final_bm1_score != null
        ? `${finalReview.final_bm1_score} / ${BM1_MAX}`
        : "—",
    ],
    [
      "Мұғалім БМ2",
      finalReview?.final_bm2_score != null
        ? `${finalReview.final_bm2_score} / ${BM2_MAX}`
        : "—",
    ],
    [
      "Мұғалім БМ3",
      finalReview?.final_bm3_score != null
        ? `${finalReview.final_bm3_score} / ${BM3_MAX}`
        : "—",
    ],
    [],
    ["AI жалпы пікір", cleanText(aiReview?.summary)],
    ["Құрылым", cleanText(raw?.submission_summary?.structural_completeness)],
    [],
    ["Күшті жағы", cleanText(finalReview?.strengths)],
    ["Толықтыру қажет", cleanText(finalReview?.needs_improvement)],
    ["Келесі редакция", cleanText(finalReview?.next_revision)],
    [
      "Мұғалім аннотациясы",
      cleanText(finalReview?.final_comment ?? aiReview?.teacher_annotation),
    ],
  ]);
  summary.getColumn(1).font = { bold: true };
  summary.eachRow((row) => (row.alignment = { wrapText: true, vertical: "top" }));

  // ─── Sheet 2: Критерийлер (4 official) ────────────────────────────────
  const criteriaSheet = workbook.addWorksheet("Критерийлер");
  criteriaSheet.columns = [
    { header: "Код", key: "code", width: 22 },
    { header: "Критерий", key: "name", width: 40 },
    { header: "Макс", key: "max", width: 6 },
    { header: "AI балл", key: "ai", width: 8 },
    { header: "Мұғалім балл", key: "teacher", width: 12 },
    { header: "Деңгей жолағы", key: "band", width: 14 },
    { header: "Сенімділік", key: "conf", width: 10 },
    { header: "Деңгей сипаттамасы", key: "band_desc", width: 60 },
    { header: "Сай келу негіздемесі", key: "band_match", width: 60 },
    { header: "Күшті жағы", key: "strengths", width: 40 },
    { header: "Әлсіз тұстары", key: "weaknesses", width: 40 },
  ];
  criteriaSheet.getRow(1).font = { bold: true };

  for (const rubric of RUBRIC) {
    const ai = aiCriteria.find((c) => c.criterion_code === rubric.code);
    const db = (criteriaDb as Array<{
      criterion_code: string;
      ai_score?: number | string;
      teacher_score?: number | string | null;
      confidence?: string;
      evidence?: string | null;
      problem?: string | null;
      recommendation?: string | null;
    }>).find((c) => c.criterion_code === rubric.code);
    criteriaSheet.addRow({
      code: rubric.code,
      name: rubric.name,
      max: rubric.maxScore,
      ai: db?.ai_score ?? ai?.suggested_score ?? "",
      teacher: db?.teacher_score ?? "",
      band: cleanText(ai?.level_band),
      conf: cleanText(ai?.confidence ?? db?.confidence),
      band_desc: ai?.level_band
        ? cleanText(rubric.bandDescriptors[ai.level_band])
        : "",
      band_match: cleanText(ai?.band_match_explanation),
      strengths: cleanText(
        (ai?.strengths ?? []).map((s) => `• ${s}`).join("\n"),
      ),
      weaknesses: cleanText(
        (ai?.weaknesses ?? []).map((s) => `• ${s}`).join("\n"),
      ),
    });
  }
  criteriaSheet.eachRow(
    (row) => (row.alignment = { wrapText: true, vertical: "top" }),
  );

  // ─── Sheet 2b: Мұғалім өңдеген кері байланыс ─────────────────────────
  const teacherEditsSheet = workbook.addWorksheet("Мұғалім өңдеген мәтін");
  teacherEditsSheet.columns = [
    { header: "Критерий", key: "name", width: 30 },
    { header: "Балл (AI → мұғалім)", key: "score", width: 20 },
    { header: "Дәйексөздер / байқаулар", key: "evidence", width: 60 },
    { header: "Әлсіз тұстары", key: "problem", width: 60 },
    { header: "Ұсыныстар / түзетулер", key: "rec", width: 60 },
  ];
  teacherEditsSheet.getRow(1).font = { bold: true };
  for (const rubric of RUBRIC) {
    const db = (criteriaDb as Array<{
      criterion_code: string;
      ai_score?: number | string;
      teacher_score?: number | string | null;
      evidence?: string | null;
      problem?: string | null;
      recommendation?: string | null;
    }>).find((c) => c.criterion_code === rubric.code);
    teacherEditsSheet.addRow({
      name: cleanText(rubric.name),
      score: `${db?.ai_score ?? 0} → ${db?.teacher_score ?? "—"}`,
      evidence: cleanText(db?.evidence),
      problem: cleanText(db?.problem),
      rec: cleanText(db?.recommendation),
    });
  }
  teacherEditsSheet.eachRow(
    (row) => (row.alignment = { wrapText: true, vertical: "top" }),
  );

  // ─── Sheet 3: Толық детальді комментарийлер ───────────────────────────
  const commentsSheet = workbook.addWorksheet("Детальді комментарийлер");
  commentsSheet.columns = [
    { header: "Критерий", key: "criterion", width: 30 },
    { header: "№", key: "n", width: 4 },
    { header: "Тақырып", key: "title", width: 35 },
    { header: "Байқау", key: "obs", width: 50 },
    { header: "Мәтіннен дәйексөз", key: "evidence", width: 50 },
    { header: "Талдау", key: "analysis", width: 50 },
    { header: "Ұсыныс", key: "suggestion", width: 50 },
  ];
  commentsSheet.getRow(1).font = { bold: true };
  for (const rubric of RUBRIC) {
    const ai = aiCriteria.find((c) => c.criterion_code === rubric.code);
    ai?.detailed_comments?.forEach((c, i) => {
      commentsSheet.addRow({
        criterion: rubric.shortName,
        n: i + 1,
        title: cleanText(c.title),
        obs: cleanText(c.observation),
        evidence: cleanText(c.evidence_from_text),
        analysis: cleanText(c.analysis),
        suggestion: cleanText(c.improvement_suggestion),
      });
    });
  }
  commentsSheet.eachRow(
    (row) => (row.alignment = { wrapText: true, vertical: "top" }),
  );

  // ─── Sheet 4: Бөлімдер диагностикасы ─────────────────────────────────
  const sectionsSheet = workbook.addWorksheet("Бөлімдер диагностикасы");
  sectionsSheet.columns = [
    { header: "Бөлім", key: "section", width: 28 },
    { header: "Бар-жоғы", key: "presence", width: 12 },
    { header: "Сөз саны", key: "words", width: 10 },
    { header: "Байқаулар", key: "obs", width: 50 },
    { header: "Кемшіліктер", key: "issues", width: 40 },
    { header: "Ұсыныстар", key: "recs", width: 40 },
  ];
  sectionsSheet.getRow(1).font = { bold: true };
  for (const s of sectionAnalysis) {
    sectionsSheet.addRow({
      section: cleanText(SECTION_LABELS[s.section] ?? s.section_name),
      presence:
        s.presence === "complete"
          ? "Толық"
          : s.presence === "partial"
            ? "Жартылай"
            : "Жоқ",
      words: s.word_count_estimate,
      obs: cleanText(
        (s.key_observations ?? []).map((o) => `• ${o}`).join("\n"),
      ),
      issues: cleanText((s.issues ?? []).map((o) => `• ${o}`).join("\n")),
      recs: cleanText(
        (s.recommendations ?? []).map((o) => `• ${o}`).join("\n"),
      ),
    });
  }
  sectionsSheet.eachRow(
    (row) => (row.alignment = { wrapText: true, vertical: "top" }),
  );

  // ─── Sheet 5: Сұхбат сұрақтары ───────────────────────────────────────
  const interviewSheet = workbook.addWorksheet("Сұхбат сұрақтары");
  interviewSheet.columns = [
    { header: "№", key: "n", width: 4 },
    { header: "Сұрақ", key: "question", width: 60 },
    { header: "Мақсаты", key: "purpose", width: 30 },
    { header: "Бөлім", key: "section", width: 18 },
  ];
  interviewSheet.getRow(1).font = { bold: true };
  interview.forEach(
    (
      q: { question: string; purpose: string | null; risk_area: string | null },
      idx: number,
    ) => {
      interviewSheet.addRow({
        n: idx + 1,
        question: cleanText(q.question),
        purpose: cleanText(q.purpose),
        section: cleanText(q.risk_area),
      });
    },
  );
  interviewSheet.eachRow(
    (row) => (row.alignment = { wrapText: true, vertical: "top" }),
  );

  // ─── Sheet 6: Шикі AI JSON ───────────────────────────────────────────
  const rawSheet = workbook.addWorksheet("Шикі AI JSON");
  rawSheet.columns = [{ width: 200 }];
  rawSheet.addRow([JSON.stringify(aiReview?.raw_json ?? {}, null, 2)]);
  rawSheet.getRow(1).alignment = { wrapText: true, vertical: "top" };

  const buffer = await workbook.xlsx.writeBuffer();

  await supabase
    .from("export_logs")
    .insert({
      submission_id: submission.id,
      teacher_id: submission.teacher_id,
      export_type: "excel",
      file_path: null,
    })
    .then(
      () => undefined,
      () => undefined,
    );

  const safeTitle = submission.coursework_title
    .replace(/[^\p{L}\p{N}_\- ]+/gu, "")
    .slice(0, 50);
  const fileName = `courseworkcheck_${safeTitle || submission.id.slice(0, 8)}.xlsx`;

  void RUBRIC_BY_CODE;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}

async function handleLrfExport({
  submission,
  teacher,
}: {
  submission: {
    id: string;
    teacher_id: string;
    student_full_name: string;
    class_name: string;
    coursework_title: string;
    ai_reviews: unknown;
    teacher_final_reviews: unknown;
  } & Record<string, unknown>;
  teacher: {
    id: string;
    full_name: string | null;
    school_name: string | null;
    subject: string | null;
  };
}) {
  type AiReviewRow = {
    bm1_score: number | string;
    bm2_score: number | string;
    bm3_score: number | string;
    total_ai_score: number | string;
    raw_json: unknown;
    criterion_results?: Array<{
      criterion_code: string;
      ai_score?: number | string;
      teacher_score?: number | string | null;
      evidence?: string | null;
      problem?: string | null;
      recommendation?: string | null;
    }>;
  };
  type FinalRow = {
    final_total_score: number | string | null;
    final_bm1_score: number | string | null;
    final_bm2_score: number | string | null;
    final_bm3_score: number | string | null;
    final_comment: string | null;
    strengths: string | null;
    needs_improvement: string | null;
    next_revision: string | null;
    is_finalized: boolean;
  };
  const aiReview = firstOf<AiReviewRow>(
    submission.ai_reviews as AiReviewRow | AiReviewRow[] | null,
  );
  const finalReview = firstOf<FinalRow>(
    submission.teacher_final_reviews as FinalRow | FinalRow[] | null,
  );

  if (!finalReview?.is_finalized) {
    return NextResponse.json(
      {
        error:
          "ОЖТФ-ны жүктеу үшін алдымен «Балл бекіту» бетінде баллды БЕКІТУ керек.",
      },
      { status: 400 },
    );
  }

  const raw = (aiReview?.raw_json ?? null) as {
    criteria?: Array<{
      criterion_code: string;
      level_band?: string;
      band_match_explanation?: string;
      detailed_comments?: Array<{
        title: string;
        observation: string;
        evidence_from_text: string;
        analysis: string;
        improvement_suggestion: string;
      }>;
      strengths?: string[];
    }>;
    section_analysis?: Array<{
      section: string;
      section_name: string;
      key_observations: string[];
    }>;
  } | null;

  function buildRichCommentsForCriterion(
    code: string,
    opts: { maxDetailed?: number; appendStrengths?: number } = {},
  ): string[] {
    const c = raw?.criteria?.find((x) => x.criterion_code === code);
    if (!c) return [];
    const { maxDetailed = 3, appendStrengths = 1 } = opts;
    const comments: string[] = [];

    // 1. Band explanation — opens the BM section with positioning rationale.
    const bandExpl = cleanText(c.band_match_explanation);
    if (bandExpl) comments.push(bandExpl);

    // 2. All detailed comments — combine observation + textual evidence +
    //    analytical commentary + actionable suggestion into one rich
    //    paragraph per comment. Filter out the "no evidence found" boilerplate.
    for (const dc of c.detailed_comments?.slice(0, maxDetailed) ?? []) {
      const evidence = cleanText(dc.evidence_from_text);
      const hasRealEvidence =
        !!evidence &&
        !/нақты\s+дәлел\s+табылмады/i.test(evidence) &&
        !/мәтінде\s+дәйексөз\s+жоқ/i.test(evidence);

      const parts = [
        cleanText(dc.observation),
        hasRealEvidence ? evidence : null,
        cleanText(dc.analysis),
        cleanText(dc.improvement_suggestion),
      ].filter((s): s is string => Boolean(s && s.length > 0));

      if (parts.length === 0) continue;

      const sentence = parts.join(" ").replace(/\s+/g, " ").trim();
      if (sentence) comments.push(sentence);
    }

    // 3. Up to N standout strengths as closing positive notes.
    for (const s of (c.strengths ?? []).slice(0, appendStrengths)) {
      const t = cleanText(s);
      if (t) comments.push(t);
    }

    // Fallback if everything was empty.
    if (comments.length === 0 && c.strengths?.length) {
      const joined = cleanText(c.strengths.join(" "));
      if (joined) comments.push(joined);
    }

    return comments;
  }

  const refsSection = raw?.section_analysis?.find(
    (s) => s.section === "references",
  );
  let referencesCount: number | null = null;
  if (refsSection?.key_observations?.length) {
    for (const obs of refsSection.key_observations) {
      const match = obs.match(/\b(\d{1,3})\b/);
      if (match) {
        referencesCount = Number(match[1]);
        break;
      }
    }
  }

  const teacherFullName =
    teacher.full_name && teacher.full_name.trim() ? teacher.full_name : "—";
  const subjectComponent =
    `${teacher.subject ?? "Қазақстан тарихы"}. Курстық жұмыс`;

  const todayKz = new Intl.DateTimeFormat("kk-KZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const totalFinal = Number(finalReview.final_total_score ?? 0);
  const bm1Final = Number(
    finalReview.final_bm1_score ?? aiReview?.bm1_score ?? 0,
  );
  const bm2Final = Number(
    finalReview.final_bm2_score ?? aiReview?.bm2_score ?? 0,
  );
  const bm3Final = Number(
    finalReview.final_bm3_score ?? aiReview?.bm3_score ?? 0,
  );

  // Мұғалімнің әр критерий бойынша өңдеген мәтінін табатын хелпер.
  // Бөлек parameter — `criterion_results` кестесінен оқиды.
  const dbCriteria = (aiReview?.criterion_results ?? []) as Array<{
    criterion_code: string;
    evidence?: string | null;
    problem?: string | null;
    recommendation?: string | null;
  }>;

  function teacherEditedComments(code: string): string[] {
    const dbRow = dbCriteria.find((c) => c.criterion_code === code);
    if (!dbRow) return [];
    const out: string[] = [];
    const ev = cleanText(dbRow.evidence);
    const pr = cleanText(dbRow.problem);
    const rc = cleanText(dbRow.recommendation);
    if (ev) out.push(`Мұғалімнің мәтіннен дәйексөздері: ${ev}`);
    if (pr) out.push(`Мұғалімнің анықтаған әлсіз тұстары: ${pr}`);
    if (rc) out.push(`Мұғалімнің ұсыныстары: ${rc}`);
    return out;
  }

  // Build rich AI-driven commentary per BM. Teacher's free-form notes are
  // appended as additional bullets rather than replacing the AI analysis —
  // this keeps the LRF substantive even when the teacher only added a brief
  // closing remark.
  const bm1Comments = buildRichCommentsForCriterion("BM1_KNOWLEDGE", {
    maxDetailed: 3,
    appendStrengths: 1,
  });
  bm1Comments.push(...teacherEditedComments("BM1_KNOWLEDGE"));
  const teacherStrengths = cleanText(finalReview.strengths);
  if (teacherStrengths) {
    bm1Comments.push(teacherStrengths);
  }

  // BM2 спрэдтеледі: жинақталған 20 балл, талдау + дәйектер.
  // Әр субкритерийдің TOLЫҚ детальді талдауын қосамыз → ауқымды кері байланыс.
  const bm2AnalysisHeader = `${LRF_SECTION_PREFIX}Қолдану, талдау, бағалау, синтез (БМ2.1, 10 балл):`;
  const bm2EvidenceHeader = `${LRF_SECTION_PREFIX}Дәйектер мен зерттеу материалдарын тиімді пайдалану (БМ2.2, 10 балл):`;

  const bm2AnalysisBullets = buildRichCommentsForCriterion("BM2_ANALYSIS", {
    maxDetailed: 3,
    appendStrengths: 2,
  });
  const bm2EvidenceBullets = buildRichCommentsForCriterion("BM2_EVIDENCE", {
    maxDetailed: 3,
    appendStrengths: 2,
  });

  const bm2Comments: string[] = [];
  if (bm2AnalysisBullets.length > 0) {
    bm2Comments.push(bm2AnalysisHeader);
    bm2Comments.push(...bm2AnalysisBullets);
  }
  if (bm2EvidenceBullets.length > 0) {
    bm2Comments.push(bm2EvidenceHeader);
    bm2Comments.push(...bm2EvidenceBullets);
  }
  // Мұғалімнің критерий ішіндегі өңдеулері
  const bm2TeacherEdits = [
    ...teacherEditedComments("BM2_ANALYSIS"),
    ...teacherEditedComments("BM2_EVIDENCE"),
  ];
  if (bm2TeacherEdits.length > 0) {
    bm2Comments.push(...bm2TeacherEdits);
  }
  const teacherFinalComment = cleanText(finalReview.final_comment);
  if (teacherFinalComment) {
    bm2Comments.push(`Мұғалім қорытындысы: ${teacherFinalComment}`);
  }
  const teacherNeedsImprovement = cleanText(finalReview.needs_improvement);
  if (teacherNeedsImprovement) {
    bm2Comments.push(`Жетілдіруге қажетті тұстар: ${teacherNeedsImprovement}`);
  }

  const bm3Comments = buildRichCommentsForCriterion("BM3_COMMUNICATION", {
    maxDetailed: 3,
    appendStrengths: 1,
  });
  bm3Comments.push(...teacherEditedComments("BM3_COMMUNICATION"));
  const teacherNextRevision = cleanText(finalReview.next_revision);
  if (teacherNextRevision) {
    bm3Comments.push(`Келесі редакцияда: ${teacherNextRevision}`);
  }

  const docBuffer = await buildLrfDocx({
    student_full_name: cleanText(submission.student_full_name),
    candidate_number: "",
    school_name: cleanText(teacher.school_name),
    subject_component: cleanText(subjectComponent),
    exam_date: todayKz,
    total_score: totalFinal,
    total_max: TOTAL_MAX_SCORE,
    bm1_score: bm1Final,
    bm1_comments: bm1Comments,
    bm2_score: bm2Final,
    bm2_comments: bm2Comments,
    bm3_score: bm3Final,
    bm3_comments: bm3Comments,
    references_count: referencesCount,
    references_comment: "Тақырыпқа сай дереккөздер қолданылған.",
    teacher_full_name: cleanText(teacherFullName),
    teacher_signature_date: todayKz,
  });

  const safeStudent = submission.student_full_name
    .replace(/[^\p{L}\p{N}_\- ]+/gu, "")
    .replace(/\s+/g, "_")
    .slice(0, 50);
  const safeClass = submission.class_name
    .replace(/[^\p{L}\p{N}_\- ]+/gu, "")
    .replace(/\s+/g, "_")
    .slice(0, 10);
  const fileName = `LRF_${safeClass}_${safeStudent || submission.id.slice(0, 8)}.docx`;

  return new NextResponse(docBuffer as unknown as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
