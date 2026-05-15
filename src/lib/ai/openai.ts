import OpenAI from "openai";
import { env } from "@/lib/env";

let cached: OpenAI | null = null;

export function getOpenAi() {
  if (cached) return cached;
  cached = new OpenAI({ apiKey: env.openAiKey() });
  return cached;
}
