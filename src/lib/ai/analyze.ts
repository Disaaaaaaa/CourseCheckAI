import { toFile } from "openai/uploads";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/lib/env";
import { aiReviewSchema, type AiReview } from "@/lib/ai/schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { getOpenAi } from "@/lib/ai/openai";

export interface AnalyzeArgs {
  pdfBuffer: Buffer;
  pdfFileName: string;
  title: string;
  student: string;
  className: string;
}

export interface AnalyzeResult {
  review: AiReview;
  modelName: string;
  uploadedFileId: string;
}

export async function analyzeCoursework(args: AnalyzeArgs): Promise<AnalyzeResult> {
  const client = getOpenAi();
  const model = env.openAiModel();

  const uploadedFile = await client.files.create({
    file: await toFile(args.pdfBuffer, args.pdfFileName || "coursework.pdf", {
      type: "application/pdf",
    }),
    purpose: "user_data",
  });

  try {
    const response = await client.responses.parse({
      model,
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            { type: "input_file", file_id: uploadedFile.id },
            {
              type: "input_text",
              text: buildUserPrompt({
                title: args.title,
                student: args.student,
                className: args.className,
              }),
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(aiReviewSchema, "coursework_review"),
      },
    });

    if (!response.output_parsed) {
      throw new Error(
        "AI жауабы дұрыс құрылымда келмеді. Қайта талдау іске қосыңыз.",
      );
    }

    return {
      review: response.output_parsed,
      modelName: model,
      uploadedFileId: uploadedFile.id,
    };
  } finally {
    // Best effort cleanup; ignore failures.
    void client.files.delete(uploadedFile.id).catch(() => undefined);
  }
}
