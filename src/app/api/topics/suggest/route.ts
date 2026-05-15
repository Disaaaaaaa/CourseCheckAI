import { NextResponse } from "next/server";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAi } from "@/lib/ai/openai";
import { env } from "@/lib/env";
import {
  TOPIC_SYSTEM_PROMPT,
  buildTopicUserPrompt,
} from "@/lib/ai/topic-prompt";
import { aiTopicResponseSchema } from "@/lib/ai/topic-schema";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  interests: z.string().min(5, "Қызығушылықтарды толығырақ жазыңыз"),
  strengths: z.string().optional().nullable(),
  preferred_period: z.string().optional().nullable(),
  class_name: z.string().optional().nullable(),
});

export async function POST(req: Request) {
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

  const client = getOpenAi();

  try {
    const response = await client.responses.parse({
      model: env.openAiModel(),
      input: [
        { role: "system", content: TOPIC_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildTopicUserPrompt({
            interests: parsed.data.interests,
            strengths: parsed.data.strengths ?? undefined,
            preferred_period: parsed.data.preferred_period ?? undefined,
            class_name: parsed.data.class_name ?? undefined,
          }),
        },
      ],
      text: {
        format: zodTextFormat(aiTopicResponseSchema, "topic_suggestions"),
      },
    });

    if (!response.output_parsed) {
      throw new Error("AI жауабы дұрыс құрылымда келмеді.");
    }

    return NextResponse.json(response.output_parsed);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Тақырыптар жасалмады. Кейінірек қайталаңыз.",
      },
      { status: 502 },
    );
  }
}
