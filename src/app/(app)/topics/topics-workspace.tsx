"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  Copy,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  Tag,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AiTopic, AiTopicResponse } from "@/lib/ai/topic-schema";

const formSchema = z.object({
  interests: z
    .string()
    .min(5, "Қызығушылықтарды толығырақ жазыңыз")
    .max(800),
  strengths: z.string().max(400).optional(),
  preferred_period: z.string().max(120).optional(),
  class_name: z.string().max(40).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TopicsWorkspace() {
  const [result, setResult] = React.useState<AiTopicResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      interests: "",
      strengths: "",
      preferred_period: "",
      class_name: "12-сынып",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/topics/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? "Сұраныс орындалмады.");
      }
      const data = (await res.json()) as AiTopicResponse;
      setResult(data);
      toast.success(`${data.topics.length} тақырып жасалды.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Қате");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="interests">
            Қызығушылықтары <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="interests"
            rows={4}
            placeholder="Мысалы: цифрлық технологиялар, стартаптар, экономика, әлеуметтік желілер, мәдени мұра, спорт, экология..."
            {...register("interests")}
          />
          {errors.interests && (
            <p className="text-xs text-destructive">
              {errors.interests.message}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="strengths">Күшті жақтары / дағдылары</Label>
            <Textarea
              id="strengths"
              rows={3}
              placeholder="Мысалы: статистикамен жұмыс істей алады, ағылшын тілін жақсы біледі..."
              {...register("strengths")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_period">Қалаған тарихи кезеңі</Label>
            <Input
              id="preferred_period"
              placeholder="Мысалы: 1991–2000 жж., қазіргі кезең..."
              {...register("preferred_period")}
            />
            <Label htmlFor="class_name" className="mt-3 block">
              Сыныбы
            </Label>
            <Input
              id="class_name"
              placeholder="12 «А»"
              {...register("class_name")}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            AI 5–6 тақырыпты әртүрлі қиындықта ұсынады. ~20–40 секунд.
          </p>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Тақырыптар ұсыну
          </Button>
        </div>
      </form>

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Оқушы портреті
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{result.student_profile_summary}</p>
              <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <strong className="text-foreground">Жалпы кеңес: </strong>
                {result.general_advice}
              </p>
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold pt-2">
            Ұсынылған тақырыптар ({result.topics.length})
          </h2>

          <div className="grid gap-4 lg:grid-cols-2">
            {result.topics.map((t, i) => (
              <TopicCard key={i} topic={t} index={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TopicCard({ topic, index }: { topic: AiTopic; index: number }) {
  const difficultyBadge =
    topic.difficulty === "basic"
      ? { label: "Базалық", variant: "success" as const }
      : topic.difficulty === "moderate"
        ? { label: "Орта", variant: "secondary" as const }
        : { label: "Жоғары", variant: "warning" as const };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            {index}. {topic.title}
          </CardTitle>
          <Badge variant={difficultyBadge.variant}>
            {difficultyBadge.label}
          </Badge>
        </div>
        <CardDescription>{topic.rationale}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm">
        <Section
          icon={<Lightbulb className="h-3.5 w-3.5" />}
          label="Өзектілік"
          text={topic.relevance_note}
        />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Зерттеу сұрақтары
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            {topic.research_questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>

        <Section
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Гипотеза"
          text={topic.hypothesis_example}
        />

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-semibold text-muted-foreground uppercase tracking-wide">
              Бағалау моделі
            </p>
            <Badge variant="outline" className="mt-1">
              {topic.evaluation_model}
            </Badge>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground uppercase tracking-wide">
              <Tag className="inline h-3 w-3" /> Кілт сөздер
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {topic.keywords.map((k, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {k}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="inline h-3 w-3" /> Ұсынылған дереккөздер
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            {topic.recommended_sources.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        {topic.potential_pitfalls.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
              <AlertTriangle className="inline h-3 w-3" /> Сақтану керек
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {topic.potential_pitfalls.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <div className="border-t p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(topic.title);
            toast.success("Тақырып көшірілді");
          }}
          className="w-full"
        >
          <Copy className="h-3.5 w-3.5" /> Тақырыпты көшіру
        </Button>
      </div>
    </Card>
  );
}

function Section({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

void Search; // reserve for future filter
