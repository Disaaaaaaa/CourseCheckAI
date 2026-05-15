"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBytes } from "@/lib/utils";

const MAX_BYTES = 50 * 1024 * 1024;

const formSchema = z.object({
  student_full_name: z.string().min(2, "Оқушы аты-жөні қажет"),
  class_name: z.string().min(1, "Сынып қажет"),
  coursework_title: z.string().min(3, "Тақырып қажет"),
  file: z
    .instanceof(File, { message: "PDF файл таңдаңыз" })
    .refine((f) => f.type === "application/pdf", "Тек PDF қабылданады")
    .refine((f) => f.size <= MAX_BYTES, "Файл 50 MB-тан аспауы керек")
    .refine((f) => f.size > 0, "Файл бос"),
});

type FormValues = z.infer<typeof formSchema>;

export function NewSubmissionForm() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [stage, setStage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const file = watch("file");

  async function onSubmit(values: FormValues) {
    try {
      setStage("PDF жүктеу...");
      const data = new FormData();
      data.set("student_full_name", values.student_full_name);
      data.set("class_name", values.class_name);
      data.set("coursework_title", values.coursework_title);
      data.set("file", values.file);

      const createRes = await fetch("/api/submissions", {
        method: "POST",
        body: data,
      });
      if (!createRes.ok) {
        const err = (await createRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? "Жүктеу мүмкін болмады.");
      }
      const created = (await createRes.json()) as { submission_id: string };

      setStage("AI талдау орындалуда (30–60 сек)...");
      const analyzeRes = await fetch(
        `/api/submissions/${created.submission_id}/analyze`,
        { method: "POST" },
      );
      if (!analyzeRes.ok) {
        const err = (await analyzeRes.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(err.error ?? "AI талдау уақытша орындалмады.");
        router.push(`/submissions/${created.submission_id}`);
        return;
      }

      toast.success("Талдау дайын! Балл жобасын қараңыз.");
      router.push(`/submissions/${created.submission_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Белгісіз қате.");
    } finally {
      setStage(null);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="student_full_name">Оқушының аты-жөні</Label>
          <Input
            id="student_full_name"
            placeholder="Айбек Сейітов"
            {...register("student_full_name")}
          />
          {errors.student_full_name && (
            <p className="text-xs text-destructive">
              {errors.student_full_name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="class_name">Сынып</Label>
          <Input
            id="class_name"
            placeholder="12 «А»"
            {...register("class_name")}
          />
          {errors.class_name && (
            <p className="text-xs text-destructive">{errors.class_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coursework_title">Тақырыбы</Label>
        <Input
          id="coursework_title"
          placeholder="Қазақстандағы 1986 жылғы Желтоқсан оқиғасының салдары"
          {...register("coursework_title")}
        />
        {errors.coursework_title && (
          <p className="text-xs text-destructive">
            {errors.coursework_title.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>PDF файл</Label>
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-background p-8 text-center transition-colors hover:bg-accent/30"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
          {file ? (
            <div className="text-sm">
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)} · PDF
              </p>
            </div>
          ) : (
            <div className="text-sm">
              <p className="font-medium">PDF-ті осы жерге апарыңыз</p>
              <p className="text-xs text-muted-foreground">
                немесе шертіп таңдаңыз · максимум 50 MB
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setValue("file", f, { shouldValidate: true });
            }}
          />
        </div>
        {errors.file && (
          <p className="text-xs text-destructive">
            {errors.file.message as string}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {stage ?? "PDF жүктелгеннен кейін AI бірден талдай бастайды."}
        </p>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Орындалуда..." : "Талдауды бастау"}
        </Button>
      </div>
    </form>
  );
}
