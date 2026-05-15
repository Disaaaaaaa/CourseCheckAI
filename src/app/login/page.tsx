import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { LoginForm } from "./login-form";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-background via-muted/30 to-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-semibold"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            CourseCheck AI
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Мұғалім кабинетіне кіру
          </h1>
          <p className="text-sm text-muted-foreground">
            12-сынып Қазақстан тарихы курстық жұмыстарын AI көмегімен тексеру.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <LoginForm next={next} />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Платформа тек мұғалімдерге арналған. Соңғы шешімді мұғалім бекітеді.
        </p>
      </div>
    </div>
  );
}
