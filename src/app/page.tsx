import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileSignature,
  GraduationCap,
  PencilLine,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Аутентификацияланған мұғалімдер — бірден кабинетке
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-background via-muted/30 to-background">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            CourseWorkCheck
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Кіру</Link>
            </Button>
            <Button asChild>
              <Link href="/login">
                Тіркелу <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 md:px-8 md:py-16">
        {/* ─── Hero ─── */}
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              NIS 12-сынып · Қазақстан тарихы
            </span>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Курстық жұмыстарды AI көмегімен{" "}
              <span className="text-primary">10 секундта</span> тексеру
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              <strong className="text-foreground">CourseWorkCheck</strong> —
              12-сынып оқушыларының «Қазақстан тарихы» пәні бойынша жазатын
              курстық жұмыстарын тиімді, жылдам және сапалы тексеруге арналған
              цифрлық платформа. Курстық жұмыс — сыртқы жиынтық бағалаудың
              маңызды компоненті, жалпы бағалаудың{" "}
              <strong className="text-foreground">40%-ын</strong> құрайды.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Бастау <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#features">Мүмкіндіктерін көру</Link>
              </Button>
            </div>
            <p className="text-base font-bold text-red-600">
              Соңғы шешімді мұғалім бекітеді.
            </p>
          </div>

          {/* Highlight card */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Бағалау шкаласы
            </p>
            <p className="mt-2 text-3xl font-bold">40 балл</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Курстық жұмыс көлемі — 2500–3500 сөз
            </p>

            <div className="mt-6 space-y-4">
              <BmRow
                label="БМ1 — Білу және түсіну"
                score={10}
                color="bg-blue-500"
                widthPct={25}
              />
              <BmRow
                label="БМ2 — Талдау және бағалау"
                score={20}
                color="bg-violet-500"
                widthPct={50}
              />
              <BmRow
                label="БМ3 — Коммуникация"
                score={10}
                color="bg-emerald-500"
                widthPct={25}
              />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center text-xs">
              <div>
                <p className="font-semibold text-foreground">~10 сек</p>
                <p className="text-muted-foreground">AI талдау</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">40 балл</p>
                <p className="text-muted-foreground">Холистік рубрика</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">ОЖТФ</p>
                <p className="text-muted-foreground">Авто-құжат</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── About ─── */}
        <section className="mt-20 rounded-2xl border bg-card p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Не үшін керек?
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Курстық жұмыс — оқушының зерттеу дағдысын тексеретін негізгі құрал
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Курстық жұмыс — 2500–3500 сөзге дейінгі, оқушының өздігінен жүргізген
            зерттеуіне негізделген жазба жұмысы. Бұл арқылы оқушының тек білім
            деңгейі ғана емес, сонымен бірге{" "}
            <strong className="text-foreground">талдау</strong>,{" "}
            <strong className="text-foreground">бағалау</strong>,{" "}
            <strong className="text-foreground">синтез</strong> және ғылыми
            зерттеу дағдылары бағаланады. CourseWorkCheck мұғалімнің тексеру
            уақытын қысқартып, әр оқушыға дәлелді кері байланыс беруге көмектеседі.
          </p>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="mt-20 space-y-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Платформаның функционалдық мүмкіндіктері
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              6 негізгі құрал — бір экранда
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<BookOpen className="h-5 w-5" />}
              title="1. Тақырыптар базасы"
              text="Қазақстан тарихы пәнінің оқу бағдарламасы бойынша 7 бөлімге жүйеленген тақырыптар: Мемлекеттану · Саясат · Экономика · Қоғамды зерделеу · Мәдени өрлеу · Геосаяси әлеует · Жаһандану. Оқушыға дұрыс зерттеу бағытын таңдауға көмектеседі."
            />
            <Feature
              icon={<Users className="h-5 w-5" />}
              title="2. Сынып басқару"
              text="Мұғалім өзінің сыныптарын (12 А, 12 В…) тіркейді, әр сыныптағы оқушылар тізімін қалыптастырады. Бұл LRF және IMMS құжаттарын автоматты толтыруға мүмкіндік береді."
            />
            <Feature
              icon={<Upload className="h-5 w-5" />}
              title="3. PDF жүктеу + AI талдау"
              text="Курстық жұмысты PDF форматында жүктейсіз — жүйе ~10 секундта талдап, әр бөлім бойынша кері байланыс, күшті/әлсіз тұстар, түзету ұсыныстары мен 40 балдық шкала бойынша балл жобасын ұсынады."
            />
            <Feature
              icon={<PencilLine className="h-5 w-5" />}
              title="4. Кері байланысты редакциялау"
              text="AI ұсынған мәтінді мұғалім өзі редакциялай алады: кәсіби пікірін қосады, бағалауды нақтылайды, оқушыға жеке бағытталған ұсыныс жазады. Барлық өзгеріс автоматты сақталады."
            />
            <Feature
              icon={<FileSignature className="h-5 w-5" />}
              title="5. ОЖТФ автоматты генерациялау"
              text="Әр оқушы үшін «Оқушылардың оқу жетістігін тіркейтін форма» (LRF) автоматты толтырылады: балл, мұғалімнің түсіндірмесі, критерийге сай жазба. Курстық жұмысты бағалаудың міндетті ресми құжаты."
            />
            <Feature
              icon={<BarChart3 className="h-5 w-5" />}
              title="6. Аналитикалық есеп"
              text="Сынып деңгейінде орташа балл, бағалау динамикасы, жиі кездесетін қателер, дағдылар деңгейі (БМ1/БМ2/БМ3) бойынша есеп. Оқу процесін тиімді жоспарлауға көмектеседі."
            />
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section className="mt-20 rounded-2xl border bg-card p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Қалай жұмыс істейді?
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            4 қарапайым қадам
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            <Step n={1} title="PDF жүктеу" text="Оқушы аты + сынып + тақырып + PDF файлы" />
            <Step n={2} title="AI талдау" text="~10 секундта 40 балдық рубрика бойынша" />
            <Step n={3} title="Балл бекіту" text="Мұғалім баллды нақтылап, бекітеді" />
            <Step n={4} title="ОЖТФ жүктеу" text="Word формасы автоматты толтырылған" />
          </ol>
        </section>

        {/* ─── CTA ─── */}
        <section className="mt-20 rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-10 md:py-16">
          <h2 className="text-3xl font-bold">Бастауға дайынсыз ба?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base opacity-90">
            Тіркеліңіз де, бірінші курстық жұмысты бүгін AI көмегімен тексеріп
            көріңіз. Тек мұғалімдерге арналған.
          </p>
          <div className="mt-6">
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">
                Кабинетке кіру <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-12 border-t bg-background/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:px-8">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span>© {new Date().getFullYear()} CourseWorkCheck</span>
          </div>
          <p className="text-base font-bold text-red-600">
            Соңғы шешімді мұғалім бекітеді.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="rounded-lg border bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">Қадам {n}</p>
      <p className="mt-1 font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </li>
  );
}

function BmRow({
  label,
  score,
  color,
  widthPct,
}: {
  label: string;
  score: number;
  color: string;
  widthPct: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{score} балл</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${color}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

// Re-export to make sure unused-warnings don't trip — CheckCircle2 is reserved
// for future "trust badge" rows.
void CheckCircle2;
