import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuthenticatedTeacher } from "@/lib/auth";
import { firstOf, formatDate } from "@/lib/utils";
import { STATUS_LABEL, STATUS_VARIANT } from "@/lib/status";
import { SubmissionsFilter } from "./submissions-filter";
import { TOTAL_MAX_SCORE } from "@/lib/rubric";

interface SubmissionsPageProps {
  searchParams: Promise<{
    status?: string;
    cls?: string;
    q?: string;
  }>;
}

export default async function SubmissionsPage({
  searchParams,
}: SubmissionsPageProps) {
  const { supabase, teacher } = await getAuthenticatedTeacher();
  const { status, cls, q } = await searchParams;

  let query = supabase
    .from("submissions")
    .select(
      "id, student_full_name, class_name, coursework_title, status, created_at, ai_reviews(total_ai_score), teacher_final_reviews(final_total_score, is_finalized)",
    )
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (cls && cls !== "all") {
    query = query.eq("class_name", cls);
  }
  if (q) {
    query = query.or(
      `coursework_title.ilike.%${q}%,student_full_name.ilike.%${q}%`,
    );
  }

  const { data: submissions } = await query;
  type FinalReviewEmbed =
    | { final_total_score: number | string | null; is_finalized: boolean }
    | { final_total_score: number | string | null; is_finalized: boolean }[]
    | null;
  type SubmissionRow = {
    id: string;
    student_full_name: string;
    class_name: string;
    coursework_title: string;
    status: string;
    created_at: string;
    ai_reviews:
      | { total_ai_score: number | string }[]
      | { total_ai_score: number | string }
      | null;
    teacher_final_reviews: FinalReviewEmbed;
  };
  const list = (submissions ?? []) as unknown as SubmissionRow[];

  const { data: classRows } = await supabase
    .from("submissions")
    .select("class_name")
    .eq("teacher_id", teacher.id)
    .order("class_name");
  const classes = Array.from(
    new Set(
      ((classRows ?? []) as Array<{ class_name: string }>).map(
        (r) => r.class_name,
      ),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Тексерулер</h1>
          <p className="text-sm text-muted-foreground">
            Барлық жүктелген курстық жұмыстар тізімі.
          </p>
        </div>
        <Button asChild>
          <Link href="/submissions/new">
            <UploadCloud className="h-4 w-4" />
            Жаңа жұмыс
          </Link>
        </Button>
      </div>

      <SubmissionsFilter classes={classes} />

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="rounded-md border-0 py-16 text-center text-sm text-muted-foreground">
              Сүзгілерге сай жұмыс табылмады.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Оқушы / тақырып</TableHead>
                  <TableHead>Сынып</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>AI балл</TableHead>
                  <TableHead>Мұғалім баллы</TableHead>
                  <TableHead>Жүктелген</TableHead>
                  <TableHead className="text-right">Әрекет</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => {
                  const aiRow = firstOf<{ total_ai_score: number | string }>(
                    s.ai_reviews,
                  );
                  const aiScore = aiRow ? Number(aiRow.total_ai_score) : null;
                  const finalReview = firstOf<{
                    final_total_score: number | string | null;
                    is_finalized: boolean;
                  }>(s.teacher_final_reviews);
                  const teacherScore = finalReview?.final_total_score
                    ? Number(finalReview.final_total_score)
                    : null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link
                          href={`/submissions/${s.id}`}
                          className="block max-w-[20rem] truncate font-medium hover:underline"
                        >
                          {s.coursework_title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {s.student_full_name}
                        </p>
                      </TableCell>
                      <TableCell>{s.class_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            STATUS_VARIANT[s.status as keyof typeof STATUS_VARIANT]
                          }
                        >
                          {STATUS_LABEL[s.status as keyof typeof STATUS_LABEL]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {aiScore !== null
                          ? `${aiScore.toFixed(1)} / ${TOTAL_MAX_SCORE}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {teacherScore !== null ? (
                          <span className="font-medium">
                            {teacherScore.toFixed(1)} / {TOTAL_MAX_SCORE}
                            {finalReview?.is_finalized && (
                              <span className="ml-1 text-xs text-success">
                                ✓
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(s.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/submissions/${s.id}`}>Ашу</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
