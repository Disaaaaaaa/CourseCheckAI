import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  FileSignature,
  GraduationCap,
  PencilLine,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { LoginForm } from "./login-form";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-5">
        {/* ─── Сол жақ — Платформа ақпараты ─── */}
        <aside className="hidden flex-col justify-between gap-8 border-r bg-card/40 p-10 lg:col-span-3 lg:flex">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Басты бетке
            </Link>

            <div className="mt-8 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xl font-semibold">CourseWorkCheck</p>
                <p className="text-xs text-muted-foreground">
                  NIS 12-сынып · Қазақстан тарихы
                </p>
              </div>
            </div>

            <h2 className="mt-8 text-3xl font-bold tracking-tight">
              Курстық жұмысты <span className="text-primary">10 секундта</span>
              <br />
              AI көмегімен тексеру
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              «Қазақстан тарихы» пәні бойынша 12-сынып курстық жұмыстарын
              автоматтандырылған тексеру және 40 балдық рубрика бойынша
              бағалау жүйесі. Курстық жұмыс жалпы бағалаудың 40%-ын құрайды.
            </p>

            <div className="mt-8 grid gap-3">
              <Feature
                icon={<BookOpen className="h-4 w-4" />}
                title="Тақырыптар базасы"
                text="7 бөлім бойынша оқу бағдарламасына сай ұсыныстар"
              />
              <Feature
                icon={<Users className="h-4 w-4" />}
                title="Сынып және оқушыларды басқару"
                text="LRF/IMMS құжаттарын автоматты толтыру"
              />
              <Feature
                icon={<Upload className="h-4 w-4" />}
                title="PDF талдау"
                text="~10 секундта 40 балдық рубрика бойынша балл + кері байланыс"
              />
              <Feature
                icon={<PencilLine className="h-4 w-4" />}
                title="Кері байланысты редакциялау"
                text="AI ұсынған мәтінді мұғалім өзгерте алады"
              />
              <Feature
                icon={<FileSignature className="h-4 w-4" />}
                title="ОЖТФ автоматты толтыру"
                text="Word форматындағы ресми құжат"
              />
              <Feature
                icon={<BarChart3 className="h-4 w-4" />}
                title="Сынып аналитикасы"
                text="Орташа балл, динамика, БМ1/БМ2/БМ3 деңгейі"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-background/60 p-4">
            <p className="text-base font-bold text-red-600">
              Соңғы шешімді мұғалім бекітеді.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              AI тек балл жобасын ұсынады, түпкі бағалауды тек мұғалім
              бекітеді.
            </p>
          </div>
        </aside>

        {/* ─── Оң жақ — Кіру формасы ─── */}
        <div className="flex items-center justify-center p-6 md:p-10 lg:col-span-2">
          <div className="w-full max-w-md space-y-6">
            {/* Mobile-only header */}
            <div className="space-y-2 text-center lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-lg font-semibold"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GraduationCap className="h-5 w-5" />
                </span>
                CourseWorkCheck
              </Link>
              <p className="text-sm text-muted-foreground">
                12-сынып Қазақстан тарихы курстық жұмыстарын AI көмегімен
                тексеру.
              </p>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium">
                <Sparkles className="h-3 w-3 text-primary" />
                Тек мұғалімдерге
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Мұғалім кабинетіне кіру
              </h1>
              <p className="text-sm text-muted-foreground">
                Жаңа аккаунт болса{" "}
                <strong className="text-foreground">«Тіркелу»</strong> түймесін
                басыңыз. Парольді ұмытсаңыз — мектеп әкімшісіне жазыңыз.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <LoginForm next={next} />
            </div>

            <p className="text-base font-bold text-red-600 lg:hidden">
              Соңғы шешімді мұғалім бекітеді.
            </p>

            <p className="text-center text-xs text-muted-foreground">
              Кіру арқылы сіз{" "}
              <Link href="/" className="underline hover:text-foreground">
                платформаны пайдалану ережелерімен
              </Link>{" "}
              келісесіз.
            </p>
          </div>
        </div>
      </div>
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
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
