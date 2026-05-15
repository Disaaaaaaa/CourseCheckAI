import type { SubmissionStatus } from "@/lib/supabase/types";

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  uploaded: "Жүктелді",
  extracting: "Мәтін шығарылуда",
  analyzing: "AI талдауда",
  ready: "AI дайын",
  reviewed: "Бекітілді",
  failed: "Қате",
};

export const STATUS_VARIANT: Record<
  SubmissionStatus,
  "default" | "secondary" | "success" | "destructive" | "warning" | "outline"
> = {
  uploaded: "secondary",
  extracting: "warning",
  analyzing: "warning",
  ready: "default",
  reviewed: "success",
  failed: "destructive",
};
