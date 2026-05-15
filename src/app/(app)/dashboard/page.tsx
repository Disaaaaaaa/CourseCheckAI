import Link from "next/link";
import { ArrowUpRight, FileCheck2, ClipboardList, AlertTriangle, Sparkles, UploadCloud } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthenticatedTeacher } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { STATUS_LABEL, STATUS_VARIANT } from "@/lib/status";
import { TOTAL_MAX_SCORE } from "@/lib/rubric";

export default async function DashboardPage() {
  const { supabase, teacher } = await getAuthenticatedTeacher();

  const { data: submissions = [] } = await supabase
    .from("submissions")
    .select("id, student_full_name, class_name, coursework_title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [{ count: total = 0 }, { count: weekCount = 0 }, { count: failed = 0 }, { count: pending = 0 }, finalReviewsResp] = await Promise.all([
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString()),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("status", ["uploaded", "extracting", "analyzing", "ready"]),
    supabase
      .from("teacher_final_reviews")
      .select("final_total_score")
      .eq("teacher_id", teacher.id)
      .eq("is_finalized", true),
  ]);

  const finalScores =
    finalReviewsResp.data?.map((r) => Number(r.final_total_score ?? 0)) ?? [];
  const avg =
    finalScores.length > 0
      ? (finalScores.reduce((a, b) => a + b, 0) / finalScores.length).toFixed(1)
      : "—";

  const recent = submissions ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Сәлеметсіз бе, {teacher.full_name?.split(" ")[0] ?? "ұстаз"}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Курстық жұмыстарды AI көмегімен тексеріңіз, баллды өзіңіз бекітіңіз.
          </p>
        </div>
        <Button asChild>
          <Link href="/submissions/new">
            <UploadCloud className="h-4 w-4" />
            Жаңа PDF жүктеу
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<ClipboardList className="h-4 w-4 text-primary" />}
          label="Барлық тексеру"
          value={String(total ?? 0)}
          sub={`${weekCount ?? 0} осы аптада`}
        />
        <Kpi
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          label="Орташа балл"
          value={avg}
          sub={`Максимум ${TOTAL_MAX_SCORE}`}
        />
        <Kpi
          icon={<FileCheck2 className="h-4 w-4 text-primary" />}
          label="Бекітілмеген"
          value={String(pending ?? 0)}
          sub="Тексеру қажет"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          label="Қате PDF"
          value={String(failed ?? 0)}
          sub="Қайта жүктеу керек"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Соңғы жұмыстар</CardTitle>
            <CardDescription>
              Соңғы жүктелген курстық жұмыстар тізімі.
            </CardDescription>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/submissions" className="text-sm">
              Барлығы <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              Әлі бірде-бір жұмыс жүктелмеген.{" "}
              <Link
                className="font-medium text-primary hover:underline"
                href="/submissions/new"
              >
                Бірінші PDF-ті жүктеу
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/submissions/${s.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {s.coursework_title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {s.student_full_name} · {s.class_name} ·{" "}
                      {formatDate(s.created_at)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[s.status as keyof typeof STATUS_VARIANT]}>
                    {STATUS_LABEL[s.status as keyof typeof STATUS_LABEL]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            {icon}
          </span>
        </div>
        <p className="mt-3 text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
