import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileSignature,
  Lightbulb,
  PencilLine,
  Sparkles,
  Upload,
  UploadCloud,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

      {/* ─── Толық нұсқаулық: 2 жұмыс ағыны ─── */}
      <Card>
        <CardHeader>
          <CardTitle>Жұмыс істеу нұсқаулығы</CardTitle>
          <CardDescription>
            Платформамен жұмыс істеудің 2 негізгі сценарийі: оқушыға тақырып
            таңдауға көмектесу және дайын курстық жұмысты тексеру.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="check" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="check">
                Дайын жұмысты тексеру
              </TabsTrigger>
              <TabsTrigger value="topic">
                Тақырып таңдауға көмек
              </TabsTrigger>
            </TabsList>

            {/* ─── СЦЕНАРИЙ 1: Дайын курстық жұмысты тексеру ─── */}
            <TabsContent value="check" className="space-y-6 pt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StepCard
                  step={1}
                  icon={<Upload className="h-4 w-4" />}
                  title="PDF жүктеу"
                  description="«Жаңа тексеру» бетіне барып, оқушы аты-жөнін, сыныбын, тақырыпты енгізіп, PDF файлды (макс 50 MB) жүктеңіз."
                  action={{ label: "Жаңа тексеру ашу", href: "/submissions/new" }}
                />
                <StepCard
                  step={2}
                  icon={<Sparkles className="h-4 w-4" />}
                  title="ЖИ талдауы"
                  description="«Талдауды бастау» түймесінен кейін жүйе ~10–60 секундта PDF-ті оқып, 4 критерий бойынша балл жобасын, дәйексөздерді, әлсіз тұстарды және ұсыныстарды дайындайды."
                />
                <StepCard
                  step={3}
                  icon={<ClipboardList className="h-4 w-4" />}
                  title="Нәтижені қарап шығу"
                  description="Жұмыс бетінде АИ ұсынған 40 балл, 4 БМ бойынша баллдар, әр критерийде 3 толық пікір, академиялық тәуекел және оқушыға арналған кері байланыс шығады."
                />
                <StepCard
                  step={4}
                  icon={<PencilLine className="h-4 w-4" />}
                  title="Балл бекіту бетінде өңдеу"
                  description="Әр критерийдің мұғалім баллын енгізіңіз (бос қалса АИ балл қолданылады). АИ дайындаған «дәйексөздер / әлсіз тұстар / ұсыныстар» мәтіндерін өз сөзіңізбен өңдеуге болады — автоматты сақталады."
                />
                <StepCard
                  step={5}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="«Бекіту» басу"
                  description="Жалпы балл, БМ балдары, күшті жақтары, толықтыру қажет тұстары, келесі редакция қадамдары мен мұғалім аннотациясын толтырып, көк «Бекіту» түймесін басыңыз."
                />
                <StepCard
                  step={6}
                  icon={<FileSignature className="h-4 w-4" />}
                  title="Есеп пен ОЖТФ жүктеу"
                  description="Есеп бетінде browser арқылы PDF басып шығаруға, Excel (6 парақ) және «ОЖТФ (Word)» — модерацияға дайын ресми құжатты жүктеуге болады."
                />
              </div>
              <Tip>
                ⚠️ <strong>«Бекіту» басылмай тұрып</strong> — статус «AI дайын»
                болады, ал «ОЖТФ (Word)» түймесі әлі жабық. Тек балл бекітілгеннен
                кейін ресми құжат жасалады.
              </Tip>
            </TabsContent>

            {/* ─── СЦЕНАРИЙ 2: Тақырып таңдауға көмектесу ─── */}
            <TabsContent value="topic" className="space-y-6 pt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StepCard
                  step={1}
                  icon={<Lightbulb className="h-4 w-4" />}
                  title="Оқушымен сұхбат"
                  description="Оқушыдан қандай сала қызықтыратынын сұраңыз: экономика, мәдениет, саясат, технологиялар, спорт, өңірлік тарих және т.б. Күшті жақтарын білу маңызды."
                />
                <StepCard
                  step={2}
                  icon={<Sparkles className="h-4 w-4" />}
                  title="«Тақырып таңдау» бетіне ену"
                  description="Sidebar-дан «Тақырып таңдау» бөлімін ашыңыз. Оқушының қызығушылықтары, күшті жақтары, қалаған тарихи кезеңі мен сыныбын енгізіңіз."
                  action={{ label: "Тақырып таңдау бетіне өту", href: "/topics" }}
                />
                <StepCard
                  step={3}
                  icon={<ClipboardList className="h-4 w-4" />}
                  title="5–6 ұсыныс алу"
                  description="«Тақырыптар ұсыну» түймесін басыңыз. AI ~20–40 секундта 3 қиындық деңгейіндегі тақырыптарды зерттеу сұрақтарымен, бағалау моделімен (SWOT/PEST/GAP) және дереккөздермен ұсынады."
                />
                <StepCard
                  step={4}
                  icon={<PencilLine className="h-4 w-4" />}
                  title="Тақырыпты таңдау"
                  description="Әр карточкадан зерттеу сұрақтарын, гипотезаны, кілт сөздерді, дереккөздерді көріңіз. Ықтимал капкандарды ескеріп, оқушымен бірге ыңғайлысын таңдаңыз."
                />
                <StepCard
                  step={5}
                  icon={<Upload className="h-4 w-4" />}
                  title="Тақырыпты оқушыға тапсыру"
                  description="«Тақырыпты көшіру» батырмасымен атауды clipboard-қа сақтаңыз. Оқушыға ұсыныс берсе, 2500–3500 сөзлік курстық жұмысын жазуын күтіңіз."
                />
                <StepCard
                  step={6}
                  icon={<FileCheck2 className="h-4 w-4" />}
                  title="Дайын жұмысты тексеру"
                  description="Оқушы курстықты тапсырғанда — «Дайын жұмысты тексеру» табындағы 6 қадамды орындаңыз."
                />
              </div>
              <Tip>
                💡 <strong>Кеңес:</strong> AI тарихи кезеңі қазіргі (1991+) болғанын
                жөн көреді. Оқушыға статистикасы бар, нақты дереккөздері бар, БМ2-ге
                талдау орын беретін тақырыптарды бағыттаңыз.
              </Tip>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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

function StepCard({
  step,
  icon,
  title,
  description,
  action,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {step}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-tight">{title}</h3>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && (
        <div className="mt-3">
          <Link
            href={action.href}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {action.label} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
      {children}
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
