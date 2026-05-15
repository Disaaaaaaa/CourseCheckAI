import { z } from "zod";

export const aiTopicDifficulty = z.enum(["basic", "moderate", "advanced"]);

export const aiTopicSchema = z.object({
  title: z.string().describe("Курстық жұмыс тақырыбы (Times New Roman сезімі)."),
  rationale: z
    .string()
    .describe(
      "Неге бұл тақырып оқушыға ұсынылады (қызығушылықпен байланысы) — 2–3 сөйлем.",
    ),
  difficulty: aiTopicDifficulty,
  relevance_note: z
    .string()
    .describe(
      "Тақырыптың қазіргі Қазақстан үшін өзектілігі — 1–2 сөйлем.",
    ),
  research_questions: z
    .array(z.string())
    .describe(
      "ДӘЛ 3 зерттеу сұрағы: 1-ші анықтау/сипаттау, 2-ші салыстыру, 3-ші бағалау/болжам.",
    ),
  hypothesis_example: z
    .string()
    .describe("Күтілетін нәтиже түріндегі гипотеза үлгісі — 1–2 сөйлем."),
  evaluation_model: z
    .enum(["SWOT", "PEST", "GAP", "BSC", "PESTLE", "PORTER"])
    .describe("Ұсынылатын бағалау моделі (SWOT/PEST/GAP т.б.)."),
  recommended_sources: z
    .array(z.string())
    .describe(
      "3–5 нақты ұсынылатын дереккөз санаты (мысалы 'stat.gov.kz статистика', 'eGov ресми құжаттар', 'Назарбаев университеті зерттеулері', т.б.).",
    ),
  keywords: z
    .array(z.string())
    .describe("4–6 негізгі ұғым (іздеу үшін)."),
  potential_pitfalls: z
    .array(z.string())
    .describe("2–3 ықтимал қателік немесе тәуекел (тым кең тақырып, дерек жоқтығы т.б.)."),
});

export const aiTopicResponseSchema = z.object({
  student_profile_summary: z
    .string()
    .describe(
      "Оқушының қызығушылықтарының 1–2 сөйлемдік қысқа портреті — нені іздейтіні және қандай сала мықты.",
    ),
  topics: z
    .array(aiTopicSchema)
    .min(5)
    .max(6)
    .describe("5–6 курстық жұмыс тақырыбы, әртүрлі қиындық деңгейінде."),
  general_advice: z
    .string()
    .describe(
      "Тақырып таңдау бойынша 2–3 сөйлемдік жалпы кеңес (көлемі 2500–3000 сөз, БМ1/2/3-ке сай т.б.).",
    ),
});

export type AiTopicResponse = z.infer<typeof aiTopicResponseSchema>;
export type AiTopic = z.infer<typeof aiTopicSchema>;
