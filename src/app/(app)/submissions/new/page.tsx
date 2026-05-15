import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewSubmissionForm } from "./new-submission-form";

export default function NewSubmissionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/submissions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Тексерулерге қайту
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Жаңа курстық жұмыс</CardTitle>
          <CardDescription>
            Оқушы мәліметін енгізіп, PDF-ті жүктеңіз. Талдау автоматты түрде
            басталады. Соңғы баллды кейін өзіңіз бекітесіз.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewSubmissionForm />
        </CardContent>
      </Card>
    </div>
  );
}
