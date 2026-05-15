import { z } from "zod";

export const aiConfidence = z.enum(["low", "medium", "high"]);
export const aiRiskLevel = z.enum(["low", "medium", "high"]);
export const aiLevelBand = z.enum(["9-10", "7-8", "5-6", "3-4", "1-2", "0"]);
export const aiSectionTag = z.enum([
  "intro",
  "main",
  "method",
  "evaluation",
  "conclusion",
  "references",
]);
export const aiPresence = z.enum(["complete", "partial", "missing"]);

/**
 * Әр критерийдің ішіндегі ОҚШАУ детальді комментарий —
 * мұғалім үшін бір "тоқтап оқитын" блок.
 */
export const aiDetailedCommentSchema = z.object({
  title: z
    .string()
    .describe("8 сөзге дейінгі қысқа тақырып, мысалы 'Кіріспедегі шолу әлсіз'"),
  observation: z
    .string()
    .describe(
      "Жұмыста не байқалғаны (2–4 сөйлем). Кең контекст, қайдан көрінгені.",
    ),
  evidence_from_text: z
    .string()
    .describe(
      "Жұмыс мәтінінен тікелей дәйексөз немесе нақты сілтеме (бет/абзац). 1–3 сөйлем.",
    ),
  analysis: z
    .string()
    .describe(
      "Бұл байқау критерий деңгейіне қалай әсер ететіні (2–4 сөйлем).",
    ),
  improvement_suggestion: z
    .string()
    .describe(
      "Оқушы келесі редакцияда нақты не істеуі керек (1–2 сөйлем, әрекет етістігімен).",
    ),
});

export const aiCriterionSchema = z.object({
  criterion_code: z.enum([
    "BM1_KNOWLEDGE",
    "BM2_ANALYSIS",
    "BM2_EVIDENCE",
    "BM3_COMMUNICATION",
  ]),
  criterion_name: z.string(),
  max_score: z.literal(10),
  suggested_score: z
    .number()
    .min(0)
    .max(10)
    .describe("0–10. Жарты балл қойылмайды, тек бүтін сан."),
  level_band: aiLevelBand,
  band_match_explanation: z
    .string()
    .describe(
      "Бұл деңгей жолағының (мысалы 5-6) ресми сипаттамасына жұмыс қалай сәйкес келетіні (2–3 сөйлем).",
    ),
  detailed_comments: z
    .array(aiDetailedCommentSchema)
    .describe(
      "Дәл 3 толық детальді комментарий. Әрқайсысы — title + observation + evidence + analysis + improvement.",
    ),
  strengths: z
    .array(z.string())
    .describe("3–5 күшті жақты атау, әрқайсысы 1 сөйлем."),
  weaknesses: z
    .array(z.string())
    .describe("3–5 әлсіз жақты атау, әрқайсысы 1 сөйлем."),
  confidence: aiConfidence,
});

/** Жұмыстың структуралық бөлімдері бойынша диагностика. */
export const aiSectionAnalysisSchema = z.object({
  section: aiSectionTag,
  section_name: z.string(),
  presence: aiPresence,
  word_count_estimate: z.number(),
  key_observations: z
    .array(z.string())
    .describe("2–4 негізгі байқау, әрқайсысы 1 сөйлем."),
  issues: z.array(z.string()).describe("0–4 нақты кемшілік."),
  recommendations: z
    .array(z.string())
    .describe("2–3 нақты жетілдіру ұсынысы."),
});

export const aiInterviewQuestionSchema = z.object({
  question: z.string(),
  purpose: z
    .string()
    .describe(
      "Бұл сұрақ нені тексереді (түсіну, авторлық, әдіс, дереккөз шынайылығы т.б.).",
    ),
  related_section: z.string(),
});

export const aiReviewSchema = z.object({
  submission_summary: z.object({
    title: z.string(),
    detected_word_count: z.number(),
    target_word_count_status: z
      .enum(["below", "within", "above"])
      .describe("Ресми талап: 2500–3000 сөз."),
    detected_sections: z.array(z.string()),
    missing_sections: z.array(z.string()),
    structural_completeness: z
      .string()
      .describe(
        "Жұмыс құрылымы (кіріспе/негізгі/қорытынды/сілтемелер) толық па (2–3 сөйлем).",
      ),
    overall_comment: z
      .string()
      .describe("Жалпы алғашқы әсер (3–5 сөйлем)."),
  }),
  scores: z.object({
    bm1: z.number().min(0).max(10),
    bm2_analysis: z.number().min(0).max(10),
    bm2_evidence: z.number().min(0).max(10),
    bm3: z.number().min(0).max(10),
    total: z.number().min(0).max(40),
  }),
  criteria: z
    .array(aiCriterionSchema)
    .describe(
      "Дәл 4 элемент: BM1_KNOWLEDGE, BM2_ANALYSIS, BM2_EVIDENCE, BM3_COMMUNICATION (осы ретпен).",
    ),
  section_analysis: z
    .array(aiSectionAnalysisSchema)
    .describe(
      "6 бөлім: intro, main, method, evaluation, conclusion, references. Әр бөлімде анықтамасы.",
    ),
  academic_integrity: z.object({
    risk_level: aiRiskLevel,
    risk_reasons: z
      .array(z.string())
      .describe(
        "Стиль ауысуы, дереккөзсіз тұжырымдар, тым кең фразалар, AI-стиль белгілері т.б.",
      ),
    teacher_actions: z
      .array(z.string())
      .describe("Мұғалімге не істеу керектігі жайлы 2–4 нақты ұсыныс."),
  }),
  student_feedback: z.object({
    strengths: z.array(z.string()).describe("4–6 қысқа жетістік."),
    needs_improvement: z.array(z.string()).describe("4–6 толықтыру қажет тұс."),
    next_revision_steps: z
      .array(z.string())
      .describe("4–6 нақты әрекет (етістікпен)."),
  }),
  teacher_annotation: z.object({
    short_comment: z
      .string()
      .describe("Модерацияға дайын 2–3 сөйлемдік аннотация."),
    moderation_note: z
      .string()
      .describe(
        "Топ модерациясына қажет ескертпе: AI неге осындай балл ұсынғаны (3–4 сөйлем).",
      ),
  }),
  interview_questions: z
    .array(aiInterviewQuestionSchema)
    .describe("Дәл 5 сұрақ — оқушының түсінігі мен авторлығын тексеру үшін."),
});

export type AiReview = z.infer<typeof aiReviewSchema>;
export type AiCriterion = z.infer<typeof aiCriterionSchema>;
export type AiDetailedComment = z.infer<typeof aiDetailedCommentSchema>;
export type AiSectionAnalysis = z.infer<typeof aiSectionAnalysisSchema>;
export type AiInterviewQuestion = z.infer<typeof aiInterviewQuestionSchema>;
